// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { JudgeService } from '../JudgeService';
import { EventEmitter } from 'events';

// Mock child_process partially
vi.mock('child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('child_process')>();
  return {
    ...original,
    spawn: vi.fn(),
  };
});

// Mock fs/promises partially
vi.mock('fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs/promises')>();
  return {
    ...original,
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
  };
});

interface MockSpawnProcess extends EventEmitter {
  stderr: EventEmitter;
  kill: ReturnType<typeof vi.fn>;
}

describe('JudgeService compilation isolation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('proves compilation hangs are aborted via SIGKILL and temporary workspaces are cleaned up (Test A)', async () => {
    const mockSpawn = spawn as unknown as ReturnType<typeof vi.fn>;
    const mockRm = fs.rm as unknown as ReturnType<typeof vi.fn>;

    const gppMock = new EventEmitter() as unknown as MockSpawnProcess;
    gppMock.stderr = new EventEmitter();
    gppMock.kill = vi.fn();

    mockSpawn.mockReturnValue(gppMock);

    const judgeService = new JudgeService();

    const testCases = [
      { id: 1, input: '1\n', expected: '2\n' },
      { id: 2, input: '2\n', expected: '4\n' }
    ];

    const runPromise = judgeService.run('C:/user/project/solution.cpp', testCases, 2000, 256);

    // Advance timers past the 15,000ms compilation timeout limit
    await vi.advanceTimersByTimeAsync(16000);

    const results = await runPromise;

    // Verify compilation process was aggressively killed
    expect(gppMock.kill).toHaveBeenCalledWith('SIGKILL');

    // Verify all testcases return RE
    expect(results.length).toBe(2);
    expect(results[0].verdict).toBe('RE');
    expect(results[0].diff).toContain('Compilation timed out');
    expect(results[1].verdict).toBe('RE');

    // Verify the temporary workspace folder was deleted to prevent disk leaks
    expect(mockRm).toHaveBeenCalledWith(
      expect.stringContaining('run_'),
      expect.objectContaining({ recursive: true, force: true })
    );
  });
});
