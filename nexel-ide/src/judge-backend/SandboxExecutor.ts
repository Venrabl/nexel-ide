/**
 * Configuration for the sandboxed execution of a single test case.
 */
export interface SandboxConfig {
  /** The absolute path of the executable or script to run */
  executablePath: string;
  /** File extension (e.g. '.cpp', '.py', '.java') to determine runtime loader */
  extension: string;
  /** Java public class name if executing a Java class folder */
  javaClassName?: string;
  /** Standard input data for the test case */
  input: string;
  /** Maximum execution time allowed in milliseconds */
  timeLimitMs: number;
  /** Maximum memory limit allowed in Megabytes */
  memoryLimitMb: number;
}

/**
 * Result details returned by the sandbox execution.
 */
export interface SandboxResult {
  /** The standard output stream captured from the process */
  stdout: string;
  /** The standard error stream captured from the process */
  stderr: string;
  /** Process exit status code or null if terminated by sandbox signal/timeout */
  exitCode: number | null;
  /** Actual execution time in milliseconds */
  timeMs: number;
  /** Peak memory usage captured in Megabytes */
  memoryMb: number;
  /** Execution verdict classification */
  verdict: 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE';
}

/**
 * JSDoc:
 * Sandbox execution interface.
 * 
 * To migrate to Docker/WebAssembly, create a new class implementing ISandboxExecutor
 * and inject/swap it in JudgeService.ts. No other changes required.
 */
export interface ISandboxExecutor {
  execute(config: SandboxConfig): Promise<SandboxResult>;
}
