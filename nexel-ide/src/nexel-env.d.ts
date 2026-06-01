export interface IFileNode {
  name: string;       // e.g., "main.cpp"
  path: string;       // e.g., "C:/contests/main.cpp"
  type: 'file' | 'folder';
  children?: IFileNode[]; // Recursive: folders can have more files/folders inside
}

export interface INexelAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openWorkspaceDir: () => Promise<string | null>;
  readWorkspaceFiles: (dirPath: string) => Promise<IFileNode[]>;
  createFile: (parentPath: string, fileName: string) => Promise<string>;
  createFolder: (parentPath: string, folderName: string) => Promise<string>;
  renameNode: (oldPath: string, newPath: string) => Promise<string>;
  deleteNode: (targetPath: string) => Promise<boolean>;
  readFileContent: (filePath: string) => Promise<string>;
  writeFileContent: (filePath: string, content: string) => Promise<boolean>;
  createTerminal: () => Promise<boolean>;
  writeTerminal: (data: string) => void;
  resizeTerminal: (cols: number, rows: number) => void;
  onTerminalData: (callback: (data: string) => void) => void;
}

declare global {
  interface Window {
    nexelAPI: INexelAPI;
  }
}