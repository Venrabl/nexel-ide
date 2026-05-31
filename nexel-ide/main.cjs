const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
let mainWindow;

function createWindow() {
  // Create the browser window configuration
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#16171d', // Matches your premium dark theme background
    webPreferences: {
      // Points to a preload script to securely bridge React and Electron
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
// Handle window frame controls from our custom title bar
ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return;
  if (action === 'minimize') win.minimize();
  if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  if (action === 'close') win.close();
});

// Handle the Native Folder Picker Dialog
ipcMain.handle('fs:open-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0]; // Returns the exact absolute path chosen by the user
});
  // During development, read the local Vite server URL.
  // If we build the app for production, it can fall back to the compiled static index.html.
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';
  mainWindow.loadURL(startUrl);

  // Open the DevTools automatically during development so you can debug console errors easily
  if (process.env.ELECTRON_START_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Electron when the operating system layer is ready
app.whenReady().then(createWindow);

// Quit the application completely when all desktop windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});