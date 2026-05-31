export interface IFileNode {
  name: string;       // e.g., "main.cpp"
  path: string;       // e.g., "C:/contests/main.cpp"
  isDirectory: boolean;
  children?: IFileNode[]; // Recursive: folders can have more files/folders inside
}

export interface INexelAPI {
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openWorkspaceDir: () => Promise<string | null>;
  readWorkspaceFiles: (dirPath: string) => Promise<IFileNode[]>; // <-- Fixes the lint error cleanly!
}

declare global {
  interface Window {
    nexelAPI: INexelAPI;
  }
}