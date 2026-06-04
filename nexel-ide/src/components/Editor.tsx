import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import './Editor.css';
import logoImg from '../assets/logo.png';
import dataset from '../../dataset.json';

interface EditorTab {
  filePath: string;
  name: string;
  content: string;
  originalContent: string; // Used to track dirty status
  isDirty: boolean;
}

interface EditorProps {
  activeFilePath: string | null;
  onFileSelect: (filePath: string) => void;
  onCloseFile?: (filePath: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ activeFilePath, onFileSelect, onCloseFile }) => {
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);
  const completionProviderRef = useRef<any>(null);

  // Clean up completion provider on unmount
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  const closeAllTabs = () => {
    setShowMenu(false);
    const hasDirty = tabs.some(t => t.isDirty);
    if (hasDirty) {
      const confirmClose = window.confirm("Some tabs have unsaved changes. Close all anyway?");
      if (!confirmClose) return;
    }
    setTabs([]);
    setActiveTabPath(null);
    if (onCloseFile) onCloseFile("");
  };

  const closeSavedTabs = () => {
    setShowMenu(false);
    const remaining = tabs.filter(t => t.isDirty);
    setTabs(remaining);
    if (remaining.length > 0) {
      if (!remaining.some(t => t.filePath === activeTabPath)) {
        const nextActive = remaining[remaining.length - 1].filePath;
        setActiveTabPath(nextActive);
        onFileSelect(nextActive);
      }
    } else {
      setActiveTabPath(null);
      if (onCloseFile) onCloseFile("");
    }
  };

  // Sync with activeFilePath from props
  useEffect(() => {
    if (!activeFilePath) return;

    const loadFile = async () => {
      // Check if already open
      const existingTab = tabs.find(t => t.filePath === activeFilePath);
      if (existingTab) {
        setActiveTabPath(activeFilePath);
        return;
      }

      // Load new file content physically
      try {
        const content = await window.nexelAPI.readFileContent(activeFilePath);
        const name = activeFilePath.split('/').pop() || activeFilePath;
        const newTab: EditorTab = {
          filePath: activeFilePath,
          name,
          content,
          originalContent: content,
          isDirty: false
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabPath(activeFilePath);
      } catch (err) {
        console.error("Failed to read selected file:", err);
      }
    };

    loadFile();
  }, [activeFilePath]);

  // Handle Ctrl+S and keybinds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveActiveTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabPath) closeTab(activeTabPath);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabPath]);

  // Handle Auto-Save loop
  useEffect(() => {
    if (autoSave) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveAllDirtyTabs();
      }, 5000); // Check and save every 5 seconds
    } else {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    }

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [autoSave, tabs]);

  // Auto-scroll active tab into view when selected
  useEffect(() => {
    if (!activeTabPath) return;
    const timer = setTimeout(() => {
      const activeTabEl = document.querySelector('.nx-editor-tab.active');
      if (activeTabEl) {
        activeTabEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [activeTabPath]);

  const saveActiveTab = async () => {
    const activeTab = tabs.find(t => t.filePath === activeTabPath);
    if (!activeTab || !activeTab.isDirty) return;

    try {
      await window.nexelAPI.writeFileContent(activeTab.filePath, activeTab.content);
      setTabs(prev => prev.map(t => 
        t.filePath === activeTabPath 
          ? { ...t, originalContent: t.content, isDirty: false }
          : t
      ));
    } catch (err) {
      console.error("Failed to save active file:", err);
    }
  };

  const saveAllDirtyTabs = async () => {
    const dirtyTabs = tabs.filter(t => t.isDirty);
    for (const tab of dirtyTabs) {
      try {
        await window.nexelAPI.writeFileContent(tab.filePath, tab.content);
        setTabs(prev => prev.map(t => 
          t.filePath === tab.filePath 
            ? { ...t, originalContent: t.content, isDirty: false }
            : t
        ));
      } catch (err) {
        console.error("Auto-save write operation failed:", err);
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    const updatedValue = value || '';
    setTabs(prev => prev.map(t => 
      t.filePath === activeTabPath 
        ? { ...t, content: updatedValue, isDirty: updatedValue !== t.originalContent }
        : t
    ));
  };

  const closeTab = (path: string) => {
    const tabToClose = tabs.find(t => t.filePath === path);
    if (tabToClose?.isDirty) {
      const confirmClose = window.confirm(`File "${tabToClose.name}" has unsaved changes. Close anyway?`);
      if (!confirmClose) return;
    }

    const remainingTabs = tabs.filter(t => t.filePath !== path);
    setTabs(remainingTabs);

    if (onCloseFile) onCloseFile(path);

    if (activeTabPath === path) {
      if (remainingTabs.length > 0) {
        const nextActive = remainingTabs[remainingTabs.length - 1].filePath;
        setActiveTabPath(nextActive);
        onFileSelect(nextActive);
      } else {
        setActiveTabPath(null);
      }
    }
  };

  const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'cpp':
      case 'c':
      case 'h':
        return 'cpp';
      case 'py':
        return 'python';
      default:
        return 'plaintext';
    }
  };

  // Define Custom Premium Monaco Theme
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('nexel-minimal-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6D727C', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C5A3A3', fontStyle: 'bold' }, // Muted grayish red/pink
        { token: 'string', foreground: 'B0C4DE' }, // Muted grayish blue
        { token: 'number', foreground: 'D3C1A5' }, // Muted grayish gold
        { token: 'regexp', foreground: 'C5B0C5' }, // Muted grayish purple
        { token: 'type', foreground: 'A3C5B5', fontStyle: 'bold' }, // Muted grayish teal/green
        { token: 'class', foreground: 'D5D6D8', fontStyle: 'bold' }, // Muted off-white
        { token: 'function', foreground: 'D4C2AD' }, // Muted grayish peach/orange
        { token: 'variable', foreground: 'E2E3E5' },
        { token: 'identifier', foreground: 'E2E3E5' },
      ],
      colors: {
        'editor.background': '#050507',
        'editor.foreground': '#E2E3E5',
        'editorCursor.foreground': '#FFFFFF',
        'editor.lineHighlightBackground': '#0F0F12',
        'editorLineNumber.foreground': '#303035',
        'editorLineNumber.activeForeground': '#FFFFFF',
        'editor.selectionBackground': '#252528',
        'editorWidget.background': '#0D0D10',
        'editorWidget.border': '#202025',
      }
    });

    monaco.editor.setTheme('nexel-minimal-dark');

    // Register C++ autocomplete provider based on dataset.json
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }
    completionProviderRef.current = monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model: any, position: any) => {
        const text = model.getValue();
        const hasUsingStd = /\busing\s+namespace\s+std\s*;/.test(text);

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: any[] = [];
        const categories = ['keywords', 'containers', 'algorithms', 'math', 'io', 'cp'];

        categories.forEach(category => {
          const items = (dataset as any)[category] || [];
          items.forEach((item: any) => {
            let label = item.label;
            let insertText = item.insertText || item.label;

            // Strip std:: if using namespace std
            if (hasUsingStd) {
              if (label.startsWith('std::')) {
                label = label.substring(5);
              }
              if (insertText.startsWith('std::')) {
                insertText = insertText.substring(5);
              }
            }

            let kind = monaco.languages.CompletionItemKind.Keyword;
            if (category === 'containers') {
              kind = monaco.languages.CompletionItemKind.Class;
            } else if (category === 'algorithms' || category === 'math') {
              kind = monaco.languages.CompletionItemKind.Function;
            } else if (category === 'io') {
              kind = monaco.languages.CompletionItemKind.Interface;
            } else if (category === 'cp') {
              kind = monaco.languages.CompletionItemKind.Snippet;
            }

            // Order by score: 1000 - score ensures higher scores appear first
            const score = item.score !== undefined ? item.score : 50;
            const sortText = String(1000 - score).padStart(4, '0');

            suggestions.push({
              label: label,
              kind: kind,
              detail: item.detail || `${category} (Nexel Autocomplete)`,
              documentation: {
                value: item.documentation || '',
              },
              insertText: insertText,
              range: range,
              sortText: sortText,
            });
          });
        });

        return { suggestions };
      }
    });
  };

  const activeTab = tabs.find(t => t.filePath === activeTabPath);

  const getStats = () => {
    if (!activeTab) return { lines: 0, chars: 0 };
    return {
      lines: activeTab.content.split('\n').length,
      chars: activeTab.content.length
    };
  };

  return (
    <div className="nx-editor-canvas">
      {/* Floating Premium aesthetic minimal active tabs bar */}
      {tabs.length > 0 && (
        <div className="nx-floating-tabbar-container">
          <div className="nx-floating-tabbar">
            <div className="nx-tabs-scroll-stack">
              {tabs.map((tab) => (
                <div 
                  key={tab.filePath} 
                  className={`nx-editor-tab ${activeTabPath === tab.filePath ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTabPath(tab.filePath);
                    onFileSelect(tab.filePath);
                  }}
                >
                  <span className="nx-tab-title">{tab.name}</span>
                  {tab.isDirty && <div className="nx-dirty-indicator-glow" />}
                  <button 
                    className="nx-tab-close-btn" 
                    title="Close Tab"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.filePath);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Minimalist Tab Actions Menu Dropdown */}
            <div className="nx-tab-menu-container">
              <button 
                className="nx-tab-menu-btn" 
                title="Tab Actions"
                onClick={() => setShowMenu(!showMenu)}
              >
                •••
              </button>
              {showMenu && (
                <div className="nx-tab-dropdown-menu">
                  <div className="nx-dropdown-item" onClick={saveAllDirtyTabs}>
                    Save All Tabs
                  </div>
                  <div className="nx-dropdown-item" onClick={closeAllTabs}>
                    Close All Tabs
                  </div>
                  <div className="nx-dropdown-item warning" onClick={closeSavedTabs}>
                    Close Saved Tabs
                  </div>
                </div>
              )}
            </div>

            {/* Global Toolbar actions inside floating bar */}
            {activeTabPath && (
              <div className="nx-editor-toolbar-actions">
                <button 
                  className={`nx-toolbar-btn auto-save ${autoSave ? 'active' : ''}`}
                  onClick={() => setAutoSave(!autoSave)}
                  title={autoSave ? "Disable Auto-Save" : "Enable Auto-Save"}
                >
                  <div className="nx-auto-save-led" />
                  Auto-Save
                </button>
                
                <button 
                  className="nx-toolbar-btn save" 
                  onClick={saveActiveTab}
                  disabled={!activeTab?.isDirty}
                  title="Save changes (Ctrl+S)"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monaco Code Editor Area */}
      {activeTab ? (
        <div className="nx-editor-workspace-area">
          <MonacoEditor
            height="100%"
            language={getLanguage(activeTab.name)}
            value={activeTab.content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 13,
              fontFamily: 'Consolas, "Courier New", Courier, monospace',
              minimap: { enabled: false },
              scrollbar: {
                vertical: 'visible',
                horizontal: 'visible',
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              lineNumbersMinChars: 3,
              automaticLayout: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              padding: { top: 16 },
              tabSize: 2,
            }}
          />
        </div>
      ) : (
        <div className="nx-editor-welcome-backdrop">
          <div className="nx-welcome-glass-plate">
            <div className="nx-welcome-branding-wrapper">
              <img src={logoImg} className="nx-welcome-logo" alt="Nexel IDE Logo" />
              <h1 className="nx-welcome-headline">NEXEL IDE</h1>
            </div>
            <p className="nx-welcome-subtitle">A premium minimal workspace with native Monaco integration.</p>
            <div className="nx-shortcut-box">
              <div className="nx-shortcut-row"><span>Open Workspace Folder</span> <kbd>Click Explorer Header</kbd></div>
              <div className="nx-shortcut-row"><span>Create New File</span> <kbd>Right Click in Sidebar</kbd></div>
              <div className="nx-shortcut-row"><span>Save Working Changes</span> <kbd>Ctrl + S</kbd></div>
              <div className="nx-shortcut-row"><span>Close Active Tab</span> <kbd>Ctrl + W</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Status metrics footer */}
      {activeTab && (
        <div className="nx-editor-footer-metrics">
          <span className="nx-footer-path">{activeTab.filePath}</span>
          <div className="nx-footer-right-cluster">
            <span className="nx-footer-metric-pill">Monaco Editor</span>
            <span className="nx-footer-metric-pill">UTF-8</span>
            <span className="nx-footer-metric-pill">Lines: {getStats().lines}</span>
            <span className="nx-footer-metric-pill">Chars: {getStats().chars}</span>
            <span className="nx-footer-metric-pill active">Nexel Engine</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
