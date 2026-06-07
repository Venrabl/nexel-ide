import { parentPort, workerData, isMainThread } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs/promises';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  isOpen?: boolean;
  children?: FileNode[];
}

export async function buildFileTree(targetPath: string): Promise<FileNode> {
  const name = path.basename(targetPath);
  const stats = await fs.stat(targetPath);
  
  if (stats.isDirectory()) {
    if (name === 'node_modules' || name === '.git' || name === '.vite') {
      return { name, path: targetPath.replace(/\\/g, '/'), type: 'folder', isOpen: false, children: [] };
    }

    const rawFiles = await fs.readdir(targetPath);
    const childrenPromises = rawFiles.map(file => buildFileTree(path.join(targetPath, file)));
    const children = await Promise.all(childrenPromises);
    
    children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });

    return { name, path: targetPath.replace(/\\/g, '/'), type: 'folder', isOpen: false, children };
  } else {
    return { name, path: targetPath.replace(/\\/g, '/'), type: 'file' };
  }
}

export async function run() {
  try {
    const { dirPath } = workerData;
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      parentPort?.postMessage({ children: [] });
      return;
    }
    const rawFiles = await fs.readdir(dirPath);
    const childrenPromises = rawFiles.map(file => buildFileTree(path.join(dirPath, file)));
    const children = await Promise.all(childrenPromises);
    
    children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    
    parentPort?.postMessage({ children });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    parentPort?.postMessage({ error: message });
  }
}

if (!isMainThread && !process.env.VITEST) {
  run();
}
