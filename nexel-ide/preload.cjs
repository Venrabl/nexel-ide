const { contextBridge, ipcRenderer } = require('electron');

// Expose safe system APIs to the React frontend
contextBridge.exposeInMainWorld('nexelAPI', {
  // Window controls for a custom title bar
  minimizeWindow: () => ipcRenderer.send('window-control', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('window-control', 'maximize'),
  closeWindow: () => ipcRenderer.send('window-control', 'close'),

  // Workspace File System triggers
  openWorkspaceDir: () => ipcRenderer.invoke('fs:open-dir'),
  readWorkspaceFiles: (dirPath) => ipcRenderer.invoke('fs:read-files', dirPath),
});