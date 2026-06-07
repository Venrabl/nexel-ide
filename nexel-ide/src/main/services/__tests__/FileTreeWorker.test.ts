// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';

// Mock fs/promises partially
vi.mock('fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('fs/promises')>();
  return {
    ...original,
    stat: vi.fn(),
    readdir: vi.fn(),
  };
});

import { buildFileTree } from '../FileTreeWorker';

describe('FileTreeWorker logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly builds a tree, excluding .git, node_modules, and .vite', async () => {
    const mockStat = fs.stat as any;
    const mockReaddir = fs.readdir as any;

    mockStat.mockImplementation(async (targetPath: string) => {
      const basename = targetPath.split(/[\\/]/).pop();
      if (basename === 'my-project' || basename === 'src' || basename === '.git' || basename === 'node_modules') {
        return { isDirectory: () => true };
      }
      return { isDirectory: () => false };
    });

    mockReaddir.mockImplementation(async (targetPath: string) => {
      const basename = targetPath.split(/[\\/]/).pop();
      if (basename === 'my-project') {
        return ['src', '.git', 'node_modules', 'file.txt'];
      }
      if (basename === 'src') {
        return ['main.cpp'];
      }
      return [];
    });

    const result = await buildFileTree('C:/my-project');

    expect(result.name).toBe('my-project');
    expect(result.type).toBe('folder');
    expect(result.children?.length).toBe(4);

    const gitNode = result.children?.find(c => c.name === '.git');
    expect(gitNode?.children?.length).toBe(0);

    const nodeModulesNode = result.children?.find(c => c.name === 'node_modules');
    expect(nodeModulesNode?.children?.length).toBe(0);

    const srcNode = result.children?.find(c => c.name === 'src');
    expect(srcNode?.children?.length).toBe(1);
    expect(srcNode?.children?.[0].name).toBe('main.cpp');
  });

  it('sorts folders before files, and alphabetically within the same type', async () => {
    const mockStat = fs.stat as any;
    const mockReaddir = fs.readdir as any;

    mockStat.mockImplementation(async (targetPath: string) => {
      const basename = targetPath.split(/[\\/]/).pop();
      if (basename === 'root' || basename === 'beta-folder' || basename === 'alpha-folder') {
        return { isDirectory: () => true };
      }
      return { isDirectory: () => false };
    });

    mockReaddir.mockImplementation(async (targetPath: string) => {
      const basename = targetPath.split(/[\\/]/).pop();
      if (basename === 'root') {
        return ['zeta-file.txt', 'beta-folder', 'alpha-file.txt', 'alpha-folder'];
      }
      return [];
    });

    const result = await buildFileTree('C:/root');
    const childNames = result.children?.map(c => c.name);

    expect(childNames).toEqual([
      'alpha-folder',
      'beta-folder',
      'alpha-file.txt',
      'zeta-file.txt'
    ]);
  });
});
