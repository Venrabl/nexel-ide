const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Add full async fs capabilities
const { spawn } = require('child_process');

let pty;
try {
  pty = require('node-pty');
} catch (e) {
  console.warn("node-pty load failure, falling back to standard spawn:", e);
}

let mainWindow;
let ptyProcess = null;
let isNativePty = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0B0B0D',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenu(null);

  // Window frame control receivers
  ipcMain.on('window-control', (event, action) => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    if (action === 'minimize') win.minimize();
    if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
    if (action === 'close') win.close();
  });

  // Terminal PTY process IPC receivers
  ipcMain.handle('terminal:create', async (event) => {
    if (ptyProcess) {
      try {
        if (isNativePty) ptyProcess.kill();
        else ptyProcess.kill();
      } catch (err) {}
      ptyProcess = null;
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    if (pty) {
      try {
        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-color',
          cols: 80,
          rows: 10,
          cwd: process.env.HOME || process.env.USERPROFILE,
          env: process.env
        });
        isNativePty = true;

        ptyProcess.onData((data) => {
          if (mainWindow) mainWindow.webContents.send('terminal:data', data);
        });

        ptyProcess.onExit(() => {
          ptyProcess = null;
        });
        return isNativePty;
      } catch (e) {
        console.warn("PTY native spawn crash, falling back to process spawn:", e);
      }
    }

    // Process shell fallback
    try {
      const args = shell === 'powershell.exe' ? ['-NoLogo', '-Interactive'] : [];
      ptyProcess = spawn(shell, args, {
        cwd: process.env.HOME || process.env.USERPROFILE,
        env: process.env
      });
      isNativePty = false;

      ptyProcess.stdout.on('data', (data) => {
        if (mainWindow) mainWindow.webContents.send('terminal:data', data.toString());
      });
      ptyProcess.stderr.on('data', (data) => {
        if (mainWindow) mainWindow.webContents.send('terminal:data', data.toString());
      });

      ptyProcess.on('close', () => {
        ptyProcess = null;
      });
    } catch (err) {
      console.error("Shell process spawn failure:", err);
    }

    return isNativePty;
  });

  ipcMain.on('terminal:write', (event, data) => {
    if (!ptyProcess) return;
    if (isNativePty) {
      ptyProcess.write(data);
    } else {
      ptyProcess.stdin.write(data);
    }
  });

  ipcMain.on('terminal:resize', (event, cols, rows) => {
    if (ptyProcess && isNativePty) {
      try {
        ptyProcess.resize(cols, rows);
      } catch (err) {
        console.error("PTY resize failed:", err);
      }
    }
  });

  // 1. Handle Native Folder Picker Dialog Channel
  ipcMain.handle('fs:open-dir', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Nexel IDE Workspace Folder'
      });
      if (result.canceled) return null;
      return result.filePaths[0]; 
    } catch (err) {
      console.error("Native showOpenDialog call failed:", err);
      throw err;
    }
  });

  // 2. Handle Recursive Directory Scanning Content Compilation
  ipcMain.handle('fs:read-files', async (event, dirPath) => {
    try {
      // We read the children of the directory itself so the tree lists contents, not the root node itself
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) return [];
      const rawFiles = await fs.readdir(dirPath);
      const childrenPromises = rawFiles.map(file => buildFileTree(path.join(dirPath, file)));
      const children = await Promise.all(childrenPromises);
      
      children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
      return children;
    } catch (err) {
      console.error("Failed parsing directory branch trees:", err);
      throw err;
    }
  });

  // 3. Create File
  ipcMain.handle('fs:create-file', async (event, parentPath, fileName) => {
    const filePath = path.join(parentPath, fileName);
    await fs.writeFile(filePath, '', 'utf8');
    return filePath;
  });

  // 4. Create Folder
  ipcMain.handle('fs:create-folder', async (event, parentPath, folderName) => {
    const folderPath = path.join(parentPath, folderName);
    await fs.mkdir(folderPath, { recursive: true });
    return folderPath;
  });

  // 5. Rename Node
  ipcMain.handle('fs:rename', async (event, oldPath, newPath) => {
    await fs.rename(oldPath, newPath);
    return newPath;
  });

  // 6. Delete Node
  ipcMain.handle('fs:delete', async (event, targetPath) => {
    await fs.rm(targetPath, { recursive: true, force: true });
    return true;
  });

  // 7. Read File Content
  ipcMain.handle('fs:read-file-content', async (event, filePath) => {
    return await fs.readFile(filePath, 'utf8');
  });

  // 8. Write File Content
  ipcMain.handle('fs:write-file-content', async (event, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf8');
    return true;
  });

  // Competitive Programming Judge IPC Pipeline
  ipcMain.handle('judge:run', async (event, filePath, testCases, timeLimit, memoryLimit) => {
    try {
      const judgeRunner = require('./src/judge-backend/judge-runner.cjs');
      const results = await judgeRunner.runSuite(filePath, testCases, timeLimit, memoryLimit);
      return results;
    } catch (err) {
      console.error("Judge execution error:", err);
      return testCases.map(tc => ({
        id: tc.id,
        verdict: 'RE',
        metrics: { time: 0, memory: 0, exitCode: 1 },
        actual: err.message,
        diff: err.message
      }));
    }
  });

  ipcMain.handle('judge:fetch-contests', async (event, workspaceDir) => {
    try {
      const response = await fetch('https://codeforces.com/api/contest.list?gym=false');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== 'OK') {
        throw new Error(`API error: ${data.comment || 'Unknown error'}`);
      }
      const contests = data.result;
      const active = contests.filter(c => c.phase === 'CODING');
      const passed = contests
        .filter(c => c.phase === 'FINISHED')
        .sort((a, b) => b.startTimeSeconds - a.startTimeSeconds)
        .slice(0, 2);
      const upcomingCount = active.length > 0 ? 2 : 3;
      const upcoming = contests
        .filter(c => c.phase === 'BEFORE')
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .slice(0, upcomingCount);

      const categorized = { active, upcoming, passed };

      return categorized;
    } catch (err) {
      console.error("Failed to fetch contests in main process:", err);
      throw err;
    }
  });

  ipcMain.handle('judge:fetch-problems', async (event, contestId) => {
    try {
      const nexelJudgeDir = path.join(__dirname, '..', 'nexel-judge');
      const outFile = path.join(nexelJudgeDir, `questions_${contestId}.json`);

      // Run cf_problems.js via node child_process
      return new Promise((resolve, reject) => {
        const scriptPath = path.join(nexelJudgeDir, 'cf_problems.js');
        const child = spawn('node', [scriptPath, contestId.toString()], {
          cwd: nexelJudgeDir,
          env: {
            ...process.env,
            NON_INTERACTIVE: 'true'
          }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', data => { stdout += data.toString(); });
        child.stderr.on('data', data => { stderr += data.toString(); });

        child.on('close', async (code) => {
          if (code === 0) {
            try {
              const fileContent = await fs.readFile(outFile, 'utf8');
              resolve(JSON.parse(fileContent));
              // Clean up temporary scraped file from disk to save storage
              fs.unlink(outFile).catch(err => console.error("Failed to delete temp problems file:", err));
            } catch (err) {
              reject(new Error(`Failed to read output file: ${err.message}`));
            }
          } else {
            reject(new Error(stderr || stdout || `Scraper exited with code ${code}`));
          }
        });

        child.on('error', err => {
          reject(new Error(`Failed to start scraper process: ${err.message}`));
        });
      });

    } catch (err) {
      console.error("Failed to fetch contest problems:", err);
      throw err;
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Recursive helper algorithm matching the internal monochrome state specs
async function buildFileTree(targetPath) {
  const name = path.basename(targetPath);
  const stats = await fs.stat(targetPath);
  
  if (stats.isDirectory()) {
    // Ignore heavy build system environments automatically for speed stability
    if (name === 'node_modules' || name === '.git' || name === '.vite') {
      return { name, path: targetPath.replace(/\\/g, '/'), type: 'folder', isOpen: false, children: [] };
    }

    const rawFiles = await fs.readdir(targetPath);
    const childrenPromises = rawFiles.map(file => buildFileTree(path.join(targetPath, file)));
    const children = await Promise.all(childrenPromises);
    
    // Sort directories above standalone assets cleanly
    children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });

    return { name, path: targetPath.replace(/\\/g, '/'), type: 'folder', isOpen: false, children };
  } else {
    return { name, path: targetPath.replace(/\\/g, '/'), type: 'file' };
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});