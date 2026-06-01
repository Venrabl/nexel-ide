import React, { useState, useEffect, useRef } from 'react';
import './Explorer.css';
import type { IFileNode } from '../nexel-env';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  isOpen?: boolean;
  children?: FileNode[];
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: FileNode | null;
}

interface InlineInputState {
  visible: boolean;
  nodePath: string; // The parent folder path or the target node path to rename
  mode: 'new-file' | 'new-folder' | 'rename';
  defaultValue: string;
}

interface ExplorerProps {
  onFileSelect?: (filePath: string, isDoubleClicked?: boolean) => void;
  activeFilePath?: string | null;
}

export const Explorer: React.FC<ExplorerProps> = ({ onFileSelect, activeFilePath }) => {
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [rootName, setRootName] = useState<string>('NO WORKSPACE');
  const [tree, setTree] = useState<FileNode[]>([]);
  const [pinnedPaths, setPinnedPaths] = useState<string[]>([]);
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [isMatchCase, setIsMatchCase] = useState(false);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    node: null
  });

  // Inline Input State for File/Folder creation or renaming
  const [inlineInput, setInlineInput] = useState<InlineInputState>({
    visible: false,
    nodePath: '',
    mode: 'new-file',
    defaultValue: ''
  });

  const [lastSelectedNode, setLastSelectedNode] = useState<FileNode | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Load initial workspace if saved or prompt
  const handleOpenFolder = async () => {
    try {
      const selectedDir = await window.nexelAPI.openWorkspaceDir();
      if (!selectedDir) return;
      setRootPath(selectedDir);
      const parsedName = selectedDir.split(/[\\/]/).pop() || selectedDir;
      setRootName(parsedName.toUpperCase());
      await refreshTree(selectedDir);
    } catch (error) {
      console.error("Workspace mount failure:", error);
    }
  };

  const getOpenFolderPaths = (nodes: FileNode[]): Set<string> => {
    const paths = new Set<string>();
    const traverse = (nodeList: FileNode[]) => {
      for (const node of nodeList) {
        if (node.type === 'folder' && node.isOpen) {
          paths.add(node.path);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return paths;
  };

  const refreshTree = async (pathTarget: string, forceOpenPaths?: Set<string>) => {
    try {
      const data = await window.nexelAPI.readWorkspaceFiles(pathTarget);
      if (!data) return;
      
      let nodesArray: IFileNode[] = [];
      if (Array.isArray(data)) {
        nodesArray = data;
      } else if (data && typeof data === 'object') {
        const d = data as any;
        if (d.children && Array.isArray(d.children)) {
          nodesArray = d.children;
        } else {
          nodesArray = [data as IFileNode];
        }
      }
      
      const openPaths = getOpenFolderPaths(tree);
      if (forceOpenPaths) {
        forceOpenPaths.forEach(p => openPaths.add(p));
      }
      
      setTree(transformNodes(nodesArray, openPaths));
    } catch (e) {
      console.error("Workspace tree hydration failure:", e);
    }
  };

  const transformNodes = (nodes: IFileNode[], openPaths: Set<string> = new Set()): FileNode[] => {
    return nodes.map((node) => ({
      name: node.name,
      path: node.path,
      type: node.type,
      isOpen: node.type === 'folder' && openPaths.has(node.path),
      children: node.children ? transformNodes(node.children, openPaths) : [],
    }));
  };

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', clickHandler);
    return () => window.removeEventListener('click', clickHandler);
  }, []);

  // Titlebar Menu Custom Event bindings
  useEffect(() => {
    const onOpen = () => handleOpenFolder();
    const onNewFile = () => handleHeaderNewFile();
    const onNewFolder = () => handleHeaderNewFolder();

    window.addEventListener('nx-open-folder', onOpen);
    window.addEventListener('nx-new-file', onNewFile);
    window.addEventListener('nx-new-folder', onNewFolder);

    return () => {
      window.removeEventListener('nx-open-folder', onOpen);
      window.removeEventListener('nx-new-file', onNewFile);
      window.removeEventListener('nx-new-folder', onNewFolder);
    };
  }, [rootPath, lastSelectedNode, rootName]);

  // Autofocus inline input and select text
  useEffect(() => {
    if (inlineInput.visible && inputRef.current) {
      inputRef.current.focus();
      if (inlineInput.mode === 'rename') {
        const dotIndex = inlineInput.defaultValue.lastIndexOf('.');
        if (dotIndex > 0 && inlineInput.mode === 'rename') {
          inputRef.current.setSelectionRange(0, dotIndex);
        } else {
          inputRef.current.select();
        }
      } else {
        inputRef.current.select();
      }
    }
  }, [inlineInput.visible]);

  // Recursively toggles folder open state
  const toggleFolder = (nodePath: string) => {
    const deepToggle = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.path === nodePath && node.type === 'folder') {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: deepToggle(node.children) };
        }
        return node;
      });
    };
    setTree(deepToggle(tree));
  };

  const collapseAllFolders = () => {
    const deepCollapse = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.type === 'folder') {
          return { ...node, isOpen: false, children: node.children ? deepCollapse(node.children) : [] };
        }
        return node;
      });
    };
    setTree(deepCollapse(tree));
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData('text/plain', node.path);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    if (node.type === 'folder') {
      e.preventDefault(); // Allows drop
      e.currentTarget.classList.add('nx-drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('nx-drag-over');
  };

  const handleDrop = async (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    e.currentTarget.classList.remove('nx-drag-over');
    
    const sourcePath = e.dataTransfer.getData('text/plain');
    if (!sourcePath || sourcePath === targetNode.path) return;

    const sourceName = sourcePath.split('/').pop() || '';
    const newPath = `${targetNode.path}/${sourceName}`;

    try {
      await window.nexelAPI.renameNode(sourcePath, newPath);
      if (rootPath) refreshTree(rootPath);
    } catch (err) {
      console.error("Drop relocate operation failed:", err);
    }
  };

  // Context Menu Actions
  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Estimate menu height based on node type
    const menuHeight = node.type === 'folder' ? 220 : 180;
    const adjustedY = e.clientY + menuHeight > window.innerHeight 
      ? Math.max(10, e.clientY - menuHeight) 
      : e.clientY;

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: adjustedY,
      node
    });
  };

  const handleEmptyAreaContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!rootPath) return;

    const menuHeight = 220;
    const adjustedY = e.clientY + menuHeight > window.innerHeight 
      ? Math.max(10, e.clientY - menuHeight) 
      : e.clientY;

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: adjustedY,
      node: { name: rootName, path: rootPath, type: 'folder' } // Root folder context
    });
  };

  const triggerNewFile = (parentFolder: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineInput({
      visible: true,
      nodePath: parentFolder.path,
      mode: 'new-file',
      defaultValue: 'untitled.txt'
    });
  };

  const triggerNewFolder = (parentFolder: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineInput({
      visible: true,
      nodePath: parentFolder.path,
      mode: 'new-folder',
      defaultValue: 'NewFolder'
    });
  };

  const handleHeaderNewFile = () => {
    if (!rootPath) return;
    let parentNode: FileNode = { name: rootName, path: rootPath, type: 'folder' };
    if (lastSelectedNode) {
      if (lastSelectedNode.type === 'folder') {
        parentNode = lastSelectedNode;
      } else {
        const lastSlash = lastSelectedNode.path.lastIndexOf('/');
        const parentPath = lastSlash !== -1 ? lastSelectedNode.path.substring(0, lastSlash) : rootPath;
        parentNode = { name: '', path: parentPath, type: 'folder' };
      }
    }
    triggerNewFile(parentNode);
  };

  const handleHeaderNewFolder = () => {
    if (!rootPath) return;
    let parentNode: FileNode = { name: rootName, path: rootPath, type: 'folder' };
    if (lastSelectedNode) {
      if (lastSelectedNode.type === 'folder') {
        parentNode = lastSelectedNode;
      } else {
        const lastSlash = lastSelectedNode.path.lastIndexOf('/');
        const parentPath = lastSlash !== -1 ? lastSelectedNode.path.substring(0, lastSlash) : rootPath;
        parentNode = { name: '', path: parentPath, type: 'folder' };
      }
    }
    triggerNewFolder(parentNode);
  };

  const triggerRename = (node: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setInlineInput({
      visible: true,
      nodePath: node.path,
      mode: 'rename',
      defaultValue: node.name
    });
  };

  const handleDelete = async (node: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    const isFolder = node.type === 'folder';
    const confirmMessage = isFolder 
      ? `Are you absolutely sure you want to permanently delete the folder "${node.name}" and all of its contents?`
      : `Are you absolutely sure you want to permanently delete the file "${node.name}"?`;
      
    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;

    try {
      await window.nexelAPI.deleteNode(node.path);
      // Unpin if pinned
      setPinnedPaths(prev => prev.filter(p => p !== node.path));
      if (rootPath) refreshTree(rootPath);
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  const handleTogglePin = (node: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setPinnedPaths(prev => 
      prev.includes(node.path) ? prev.filter(p => p !== node.path) : [...prev, node.path]
    );
  };

  const handleCopyPath = (node: FileNode) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    navigator.clipboard.writeText(node.path);
  };

  // Submit Inline Input (Create / Rename)
  const handleInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = inputRef.current?.value.trim();
    if (!value) {
      setInlineInput(prev => ({ ...prev, visible: false }));
      return;
    }

    try {
      let createdPath = '';
      const forceOpenPaths = new Set<string>();

      if (inlineInput.mode === 'new-file') {
        createdPath = await window.nexelAPI.createFile(inlineInput.nodePath, value);
        if (inlineInput.nodePath) {
          forceOpenPaths.add(inlineInput.nodePath.replace(/\\/g, '/'));
        }
      } else if (inlineInput.mode === 'new-folder') {
        createdPath = await window.nexelAPI.createFolder(inlineInput.nodePath, value);
        if (inlineInput.nodePath) {
          forceOpenPaths.add(inlineInput.nodePath.replace(/\\/g, '/'));
        }
      } else if (inlineInput.mode === 'rename') {
        const pathSegments = inlineInput.nodePath.split('/');
        pathSegments.pop();
        const parentPath = pathSegments.join('/');
        const targetNewPath = `${parentPath}/${value}`;
        await window.nexelAPI.renameNode(inlineInput.nodePath, targetNewPath);
        
        // Update pinning reference if renamed
        setPinnedPaths(prev => prev.map(p => p === inlineInput.nodePath ? targetNewPath : p));
      }

      if (rootPath) {
        await refreshTree(rootPath, forceOpenPaths);
      }

      if (inlineInput.mode === 'new-file' && createdPath && onFileSelect) {
        const formattedPath = createdPath.replace(/\\/g, '/');
        onFileSelect(formattedPath, true);
      }
    } catch (err) {
      console.error("Inline fs write execution failed:", err);
      alert(`Operation failed. Ensure a valid name is provided.`);
    } finally {
      setInlineInput(prev => ({ ...prev, visible: false }));
    }
  };

  // Get Custom Premium Vector Icons based on Extension - Minimal Monochrome
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'html':
      case 'css':
      case 'json':
      case 'md':
      case 'cpp':
      case 'c':
      case 'h':
      case 'py':
      default:
        return (
          <svg className="nx-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
        );
    }
  };

  // Renders the muted/accented extension beautifully
  const renderLabelWithHighlights = (name: string, isSelected: boolean) => {
    // Implement Search Match Highlights
    if (searchQuery) {
      let isMatch = false;
      let q = searchQuery;
      if (!isMatchCase) q = q.toLowerCase();

      let target = name;
      if (!isMatchCase) target = target.toLowerCase();

      if (isRegex) {
        try {
          const reg = new RegExp(searchQuery, isMatchCase ? '' : 'i');
          isMatch = reg.test(name);
        } catch(e) {}
      } else {
        isMatch = target.includes(q);
      }

      if (isMatch) {
        return <span className="nx-node-text nx-search-match">{name}</span>;
      }
    }

    const dotIndex = name.lastIndexOf('.');
    if (dotIndex === -1 || name.startsWith('.')) {
      return <span className="nx-node-text">{name}</span>;
    }
    const baseName = name.substring(0, dotIndex);
    const extension = name.substring(dotIndex);
    return (
      <span className="nx-node-text">
        {baseName}
        <span className={`nx-file-ext ${isSelected ? 'active' : ''}`}>{extension}</span>
      </span>
    );
  };

  // Tree recursive rendering
  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node, index) => {
      const isSelected = activeFilePath === node.path;
      const isFolder = node.type === 'folder';

      // Inline editing element placement
      const isInlineEditingThisNode = inlineInput.visible && inlineInput.nodePath === node.path && inlineInput.mode === 'rename';
      const showInlineCreationHere = inlineInput.visible && inlineInput.nodePath === node.path && (inlineInput.mode === 'new-file' || inlineInput.mode === 'new-folder');

      return (
        <div key={`${node.path}-${index}`} className="nx-node-block">
          {isInlineEditingThisNode ? (
            <form onSubmit={handleInlineSubmit} className="nx-inline-input-form" style={{ paddingLeft: `${depth * 14 + 18}px` }}>
              <div className="nx-inline-input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  defaultValue={inlineInput.defaultValue}
                  onBlur={() => setInlineInput(prev => ({ ...prev, visible: false }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setInlineInput(prev => ({ ...prev, visible: false }));
                  }}
                  className="nx-inline-textbox"
                />
              </div>
            </form>
          ) : (
            <div 
              className={`nx-node-row ${isSelected ? 'nx-row-selected' : ''}`}
              style={{ paddingLeft: `${depth * 14 + 18}px` }}
              draggable
              onDragStart={(e) => handleDragStart(e, node)}
              onDragOver={(e) => handleDragOver(e, node)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, node)}
              onContextMenu={(e) => handleContextMenu(e, node)}
              onClick={() => {
                setLastSelectedNode(node);
                if (isFolder) {
                  toggleFolder(node.path);
                } else {
                  if (onFileSelect) onFileSelect(node.path, false);
                }
              }}
              onDoubleClick={() => {
                setLastSelectedNode(node);
                if (!isFolder && onFileSelect) {
                  onFileSelect(node.path, true);
                }
              }}
            >
              {isFolder ? (
                <span className={`nx-chevron ${node.isOpen ? 'open' : ''}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg>
                </span>
              ) : (
                <span className="nx-chevron-spacer" />
              )}

              <span className="nx-icon-frame">
                {isFolder ? (
                  <svg className={`nx-svg-icon folder ${node.isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                ) : (
                  getFileIcon(node.name)
                )}
              </span>

              {renderLabelWithHighlights(node.name, isSelected)}

              {/* Hover quick shortcut overlay */}
              <div className="nx-row-actions">
                {isFolder && (
                  <button className="nx-row-act-btn" title="New File" onClick={(e) => { e.stopPropagation(); triggerNewFile(node); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  </button>
                )}
                <button className="nx-row-act-btn delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(node); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          )}

          {/* Inline creation field inside matching folder tree */}
          {showInlineCreationHere && (
            <div style={{ paddingLeft: `${(depth + 1) * 14 + 18}px` }}>
              <form onSubmit={handleInlineSubmit} className="nx-inline-input-form">
                <div className="nx-inline-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    defaultValue={inlineInput.defaultValue}
                    onBlur={() => setInlineInput(prev => ({ ...prev, visible: false }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setInlineInput(prev => ({ ...prev, visible: false }));
                    }}
                    className="nx-inline-textbox"
                  />
                </div>
              </form>
            </div>
          )}

          {isFolder && node.isOpen && node.children && (
            <div className="nx-nested-children">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="nx-explorer-wrapper">
      <div className="nx-explorer-header">
        <span className="nx-explorer-title" onClick={handleOpenFolder} title="Click to Switch Working Directories">
          {rootName}
        </span>
        
        <div className="nx-action-bar">
          <button 
            className="nx-action-btn" 
            title="New File" 
            onClick={handleHeaderNewFile}
            disabled={!rootPath}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
          </button>
          <button 
            className="nx-action-btn" 
            title="New Folder" 
            onClick={handleHeaderNewFolder}
            disabled={!rootPath}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
          </button>
          <button className="nx-action-btn" title="Refresh Tree" onClick={() => rootPath && refreshTree(rootPath)} disabled={!rootPath}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </button>
          <button className="nx-action-btn" title="Collapse All Folders" onClick={collapseAllFolders} disabled={tree.length === 0}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.5"></rect><line x1="7" y1="12" x2="17" y2="12"></line></svg>
          </button>
        </div>
      </div>

      {/* Real-time Workspace Search/Filter belt */}
      {rootPath && (
        <div className="nx-search-belt">
          <div className="nx-search-input-frame">
            <input 
              type="text" 
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nx-search-textbox"
            />
            <div className="nx-search-toggles">
              <button 
                className={`nx-search-tog-btn ${isMatchCase ? 'active' : ''}`}
                title="Match Case"
                onClick={() => setIsMatchCase(!isMatchCase)}
              >
                Aa
              </button>
              <button 
                className={`nx-search-tog-btn ${isRegex ? 'active' : ''}`}
                title="Use Regular Expression"
                onClick={() => setIsRegex(!isRegex)}
              >
                .*
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Bookmarks/Pinned shelf */}
      {pinnedPaths.length > 0 && (
        <div className="nx-pinned-shelf">
          <div className="nx-shelf-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            PINNED WORKSPACE FILES
          </div>
          <div className="nx-shelf-items">
            {pinnedPaths.map((pathStr) => {
              const nameStr = pathStr.split('/').pop() || '';
              return (
                <div 
                  key={pathStr} 
                  className={`nx-shelf-item ${activeFilePath === pathStr ? 'active' : ''}`}
                  onClick={() => onFileSelect && onFileSelect(pathStr, false)}
                >
                  <span className="nx-shelf-icon-frame">{getFileIcon(nameStr)}</span>
                  <span className="nx-shelf-text">{nameStr}</span>
                  <button 
                    className="nx-shelf-unpin-btn" 
                    title="Unpin File"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinnedPaths(prev => prev.filter(p => p !== pathStr));
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main tree list scroll panel */}
      <div 
        className="nx-tree-scroll"
        onContextMenu={handleEmptyAreaContextMenu}
      >
        {tree.length === 0 ? (
          <div className="nx-empty-state">
            <button className="nx-open-prompt-btn" onClick={handleOpenFolder}>Open Folder</button>
          </div>
        ) : (
          <>
            {/* Render root level inline creation form */}
            {inlineInput.visible && inlineInput.nodePath === rootPath && (inlineInput.mode === 'new-file' || inlineInput.mode === 'new-folder') && (
              <div style={{ paddingLeft: '18px', margin: '2px 8px' }}>
                <form onSubmit={handleInlineSubmit} className="nx-inline-input-form">
                  <div className="nx-inline-input-wrapper">
                    <input
                      ref={inputRef}
                      type="text"
                      defaultValue={inlineInput.defaultValue}
                      onBlur={() => setInlineInput(prev => ({ ...prev, visible: false }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setInlineInput(prev => ({ ...prev, visible: false }));
                      }}
                      className="nx-inline-textbox"
                      style={{ width: '95%' }}
                    />
                  </div>
                </form>
              </div>
            )}
            {renderTree(tree)}
          </>
        )}
      </div>

      {/* Floating Custom Glassmorphism Context Menu */}
      {contextMenu.visible && contextMenu.node && (
        <div 
          ref={contextMenuRef}
          className="nx-custom-context-menu" 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          {contextMenu.node.type === 'folder' && (
            <>
              <div className="nx-menu-item" onClick={() => triggerNewFile(contextMenu.node!)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                New File
              </div>
              <div className="nx-menu-item" onClick={() => triggerNewFolder(contextMenu.node!)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                New Folder
              </div>
              <hr className="nx-menu-divider" />
            </>
          )}

          {contextMenu.node.path !== rootPath && (
            <div className="nx-menu-item" onClick={() => triggerRename(contextMenu.node!)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Rename
            </div>
          )}

          {contextMenu.node.type === 'file' && (
            <div className="nx-menu-item" onClick={() => handleTogglePin(contextMenu.node!)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              {pinnedPaths.includes(contextMenu.node.path) ? 'Unpin File' : 'Pin File'}
            </div>
          )}

          <div className="nx-menu-item" onClick={() => handleCopyPath(contextMenu.node!)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy Full Path
          </div>

          {contextMenu.node.path !== rootPath && (
            <>
              <hr className="nx-menu-divider" />
              <div className="nx-menu-item delete" onClick={() => handleDelete(contextMenu.node!)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {contextMenu.node.type === 'folder' ? 'Delete Folder' : 'Delete File'}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Explorer;