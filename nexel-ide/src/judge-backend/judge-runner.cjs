const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Competitive Programming Local Judge Runner
 */
class JudgeRunner {
  constructor() {
    this.baseTempDir = path.join(os.tmpdir(), 'nexel-judge');
  }

  async createIsolatedWorkspace() {
    // Unique workspace directory for concurrency isolation
    const workspaceId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const workspaceDir = path.join(this.baseTempDir, workspaceId);
    await fs.mkdir(workspaceDir, { recursive: true });
    return workspaceDir;
  }

  /**
   * Run a CP test suite
   * @param {string} filePath File to execute
   * @param {Array} testCases Array of test cases { id, input, expected }
   * @param {number} timeLimit Time limit in ms
   * @param {number} memoryLimit Memory limit in MB
   */
  async runSuite(filePath, testCases, timeLimit = 2000, memoryLimit = 256) {
    const isWin = process.platform === 'win32';
    const workspaceDir = await this.createIsolatedWorkspace();
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    let executablePath = filePath;
    let runClassName = baseName;
    let isCompiled = false;
    let compileError = null;

    // Step 1: Compilation Phase with 5s timeouts
    try {
      if (ext === '.cpp' || ext === '.cc') {
        const outBinName = isWin ? `${baseName}.exe` : baseName;
        const outExe = path.join(workspaceDir, outBinName);
        await this.compileCpp(filePath, outExe, 5000);
        executablePath = outExe;
        isCompiled = true;
      } else if (ext === '.java') {
        // Extract public class name from java file to avoid namespace mismatch errors
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const classMatch = content.match(/public\s+class\s+(\w+)/);
          if (classMatch) {
            runClassName = classMatch[1];
          }
        } catch (e) {}

        // Copy .java file into the isolated workspace directory to compile cleanly
        const copiedJavaFile = path.join(workspaceDir, `${runClassName}.java`);
        await fs.copyFile(filePath, copiedJavaFile);

        await this.compileJava(copiedJavaFile, workspaceDir, 5000);
        executablePath = workspaceDir; // Class folder
        isCompiled = true;
      }
    } catch (err) {
      compileError = err.message;
    }

    if (compileError) {
      // Cleanup workspace before returning compile error
      await this.cleanupWorkspace(workspaceDir);
      return testCases.map(tc => ({
        id: tc.id,
        verdict: 'RE',
        metrics: { time: 0, memory: 0.1, exitCode: 1 },
        actual: compileError,
        diff: `Compilation Error:\n${compileError}`
      }));
    }

    // Step 2: Test Suite Execution Pipeline
    const results = [];
    for (const tc of testCases) {
      const result = await this.executeTestCase(executablePath, ext, runClassName, tc, timeLimit, memoryLimit);
      results.push(result);
    }

    // Step 3: Safe per-run cleanup verification
    await this.cleanupWorkspace(workspaceDir);

    return results;
  }

  async cleanupWorkspace(dir) {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Warning: failed to clean up judge workspace at ${dir}:`, e);
    }
  }

  compileCpp(src, dest, compileTimeout) {
    return new Promise((resolve, reject) => {
      const gpp = spawn('g++', ['-O3', '-std=c++17', src, '-o', dest]);
      let errData = '';
      
      const timer = setTimeout(() => {
        gpp.kill('SIGKILL');
        reject(new Error(`Compilation timed out after ${compileTimeout}ms`));
      }, compileTimeout);

      gpp.stderr.on('data', data => { errData += data.toString(); });
      gpp.on('close', code => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(errData || `Compilation failed with exit code ${code}`));
      });
    });
  }

  compileJava(src, destDir, compileTimeout) {
    return new Promise((resolve, reject) => {
      const javac = spawn('javac', ['-d', destDir, src]);
      let errData = '';

      const timer = setTimeout(() => {
        javac.kill('SIGKILL');
        reject(new Error(`Java compilation timed out after ${compileTimeout}ms`));
      }, compileTimeout);

      javac.stderr.on('data', data => { errData += data.toString(); });
      javac.on('close', code => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(errData || `Java compilation failed with exit code ${code}`));
      });
    });
  }

  executeTestCase(execPath, ext, className, tc, timeLimit, memoryLimit) {
    return new Promise((resolve) => {
      let child;
      const startTime = process.hrtime();
      const isWin = process.platform === 'win32';
      
      const timeLimitSec = Math.ceil(timeLimit / 1000);
      const memoryLimitKb = memoryLimit * 1024;
      const maxOutputBytes = 5 * 1024 * 1024; // 5MB buffer size limit to prevent memory/disk bloating

      // Select execution environment and spawn in a detached process group to prevent zombie leaks
      const spawnOpts = {
        detached: !isWin,
        stdio: ['pipe', 'pipe', 'pipe']
      };

      if (isWin) {
        if (ext === '.py') {
          child = spawn('python', [execPath], spawnOpts);
        } else if (ext === '.java') {
          child = spawn('java', ['-cp', execPath, className], spawnOpts);
        } else {
          child = spawn(execPath, [], spawnOpts);
        }
      } else {
        let runCmd = '';
        if (ext === '.py') {
          runCmd = `ulimit -v ${memoryLimitKb} -t ${timeLimitSec} && exec python3 "${execPath}"`;
        } else if (ext === '.java') {
          runCmd = `ulimit -v ${memoryLimitKb} -t ${timeLimitSec} && exec java -cp "${execPath}" "${className}"`;
        } else {
          runCmd = `ulimit -v ${memoryLimitKb} -t ${timeLimitSec} && exec "${execPath}"`;
        }
        child = spawn('sh', ['-c', runCmd], spawnOpts);
      }

      let stdout = '';
      let stderr = '';
      let isFinished = false;
      let peakMemory = 0.5; // Default minimum baseline in MB
      let totalOutputSize = 0;

      // Pipe testcase inputs
      child.stdin.write(tc.input || '');
      child.stdin.end();

      const handleOutputLimit = (dataSize) => {
        totalOutputSize += dataSize;
        if (totalOutputSize > maxOutputBytes && !isFinished) {
          isFinished = true;
          clearTimeout(timeoutTimer);
          if (memoryTimer) clearInterval(memoryTimer);
          killProcessTree();
          
          const [sec, nsec] = process.hrtime(startTime);
          const elapsedMs = Math.round(sec * 1000 + nsec / 1000000);

          resolve({
            id: tc.id,
            verdict: 'RE',
            metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: null },
            actual: stdout.substring(0, 1000) + '\n... [TRUNCATED - EXCEEDED 5MB LIMIT] ...',
            diff: `Output Limit Exceeded (Exceeded ${maxOutputBytes / (1024 * 1024)}MB stream limit)`
          });
          return true;
        }
        return false;
      };

      child.stdout.on('data', data => { 
        if (handleOutputLimit(data.length)) return;
        stdout += data.toString(); 
      });

      child.stderr.on('data', data => { 
        if (handleOutputLimit(data.length)) return;
        stderr += data.toString(); 
      });

      // Cleanly kill the entire process tree/group to prevent fork-bomb or detached zombie leaks
      const killProcessTree = () => {
        if (!child.pid) return;
        try {
          if (isWin) {
            spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
          } else {
            process.kill(-child.pid, 'SIGKILL');
          }
        } catch (e) {
          try { child.kill('SIGKILL'); } catch (err) {}
        }
      };

      // 1. High-Efficiency time limit enforcement using a single setTimeout (0% event-loop pollution)
      const timeoutTimer = setTimeout(() => {
        if (isFinished) return;
        isFinished = true;
        
        killProcessTree();
        
        const [sec, nsec] = process.hrtime(startTime);
        const elapsedMs = Math.round(sec * 1000 + nsec / 1000000);

        resolve({
          id: tc.id,
          verdict: 'TLE',
          metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: null },
          actual: '',
          diff: `Time Limit Exceeded (> ${timeLimit}ms)`
        });
      }, timeLimit);

      // 2. High-Efficiency relaxed interval polling for memory monitoring ONLY on Unix
      const memoryTimer = !isWin ? setInterval(() => {
        if (isFinished || !child.pid) {
          clearInterval(memoryTimer);
          return;
        }

        queryProcessMemoryOnce(child.pid).then(currentMemory => {
          if (isFinished) return;
          if (currentMemory > peakMemory) {
            peakMemory = currentMemory;
          }

          // Strict Memory Limit Exceeded check
          if (peakMemory > memoryLimit) {
            isFinished = true;
            clearTimeout(timeoutTimer);
            clearInterval(memoryTimer);
            killProcessTree();

            const [sec, nsec] = process.hrtime(startTime);
            const elapsedMs = Math.round(sec * 1000 + nsec / 1000000);

            resolve({
              id: tc.id,
              verdict: 'MLE',
              metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: null },
              actual: '',
              diff: `Memory Limit Exceeded (> ${memoryLimit}MB)`
            });
          }
        });
      }, 500) : null;

      // Helper to query memory exactly once to avoid performance degradation
      const queryProcessMemoryOnce = (pid) => {
        return new Promise((res) => {
          if (!pid) return res(0.5);
          const cmd = isWin
            ? `tasklist /FI "PID eq ${pid}" /NH`
            : `ps -p ${pid} -o rss=`;

          const { exec } = require('child_process');
          exec(cmd, (err, stdoutStr) => {
            if (err || !stdoutStr) return res(0.5);
            if (isWin) {
              const match = stdoutStr.match(/([\d,]+)\s*K/i);
              if (match) {
                return res(parseInt(match[1].replace(/,/g, ''), 10) / 1024);
              }
            } else {
              const kb = parseInt(stdoutStr.trim(), 10);
              if (!isNaN(kb)) return res(kb / 1024);
            }
            res(0.5);
          });
        });
      };

      child.on('close', async (code, signal) => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timeoutTimer);
        if (memoryTimer) clearInterval(memoryTimer);

        const [sec, nsec] = process.hrtime(startTime);
        const elapsedMs = Math.round(sec * 1000 + nsec / 1000000);

        // One-time resource snapshot queries on exit (0% execution-time lag!)
        if (child.pid) {
          const finalMemory = await queryProcessMemoryOnce(child.pid);
          if (finalMemory > peakMemory) {
            peakMemory = finalMemory;
          }
        }

        // Map SIGXCPU/OOM signal on Unix to appropriate verdict
        if (signal === 'SIGXCPU') {
          resolve({
            id: tc.id,
            verdict: 'TLE',
            metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: null },
            actual: '',
            diff: `Time Limit Exceeded (> ${timeLimit}ms)`
          });
          return;
        }

        if (code !== 0 || signal) {
          const isOom = (code === 137 || signal === 'SIGKILL' || stderr.toLowerCase().includes('out of memory'));
          resolve({
            id: tc.id,
            verdict: isOom ? 'MLE' : 'RE',
            metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: code || 1 },
            actual: stderr || stdout,
            diff: stderr || `Process terminated with code ${code} and signal ${signal}`
          });
          return;
        }

        const cleanLines = (str) => 
          (str || '').trim().split(/\r?\n/).map(line => line.trimEnd()).join('\n');

        const normalizedActual = cleanLines(stdout);
        const normalizedExpected = cleanLines(tc.expected);
        
        const passed = normalizedActual === normalizedExpected;

        resolve({
          id: tc.id,
          verdict: passed ? 'AC' : 'WA',
          metrics: { time: elapsedMs, memory: Math.round(peakMemory * 10) / 10, exitCode: 0 },
          actual: stdout,
          expected: tc.expected,
          passed
        });
      });

      child.on('error', err => {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(timeoutTimer);
        if (memoryTimer) clearInterval(memoryTimer);
        resolve({
          id: tc.id,
          verdict: 'RE',
          metrics: { time: 0, memory: 0, exitCode: 1 },
          actual: err.message,
          diff: `Failed to execute: ${err.message}`
        });
      });
    });
  }
}

module.exports = new JudgeRunner();
