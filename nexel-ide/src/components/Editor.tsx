import React, { useState, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import './Editor.css';
import logoImg from '../assets/logo.png';
import dataset from '../../dataset.json';
import snippets from '../../snippets.json';

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
  const [acCelebration, setAcCelebration] = useState<boolean>(false);
  
  // Split pane system states
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [rightTabPath, setRightTabPath] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveIntervalRef = useRef<any>(null);
  const editorRef = useRef<any>(null);
  const completionProviderRef = useRef<any>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      
      // Enforce bounds (min 20%, max 80%) for visual premium feel
      if (percentage > 20 && percentage < 80) {
        setSplitRatio(percentage);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Clean up completion provider on unmount
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  // Open Snippets Tab global listener
  useEffect(() => {
    const handleOpenSnippets = () => {
      setTabs(prev => {
        const existing = prev.find(t => t.filePath === 'nexel://snippets');
        if (existing) {
          setActiveTabPath('nexel://snippets');
          return prev;
        }
        const newTab: EditorTab = {
          filePath: 'nexel://snippets',
          name: 'Code Snippets',
          content: '',
          originalContent: '',
          isDirty: false
        };
        setActiveTabPath('nexel://snippets');
        return [...prev, newTab];
      });
    };
    window.addEventListener('nx-open-snippets', handleOpenSnippets);
    return () => window.removeEventListener('nx-open-snippets', handleOpenSnippets);
  }, []);

  // Open Codeforces Problem Tab global listener
  useEffect(() => {
    const handleOpenProblem = (e: Event) => {
      const customEvent = e as CustomEvent<{ contestId: number; problem: any }>;
      if (!customEvent.detail || !customEvent.detail.problem) return;
      const { contestId, problem } = customEvent.detail;
      const tabPath = `cf://${contestId}/${problem.index}`;
      const tabName = `CF ${contestId}${problem.index}`;

      setTabs(prev => {
        const existing = prev.find(t => t.filePath === tabPath);
        if (existing) {
          setActiveTabPath(tabPath);
          return prev;
        }
        const newTab: EditorTab = {
          filePath: tabPath,
          name: tabName,
          content: JSON.stringify(problem),
          originalContent: JSON.stringify(problem),
          isDirty: false
        };
        setActiveTabPath(tabPath);
        return [...prev, newTab];
      });
    };
    window.addEventListener('nx-open-cf-problem', handleOpenProblem);
    return () => window.removeEventListener('nx-open-cf-problem', handleOpenProblem);
  }, []);

  // Listen for AC celebration event to flash green glow wash
  useEffect(() => {
    const handleAc = () => {
      setAcCelebration(true);
      setTimeout(() => setAcCelebration(false), 1500);
    };
    window.addEventListener('nx-ac-celebration', handleAc);
    return () => window.removeEventListener('nx-ac-celebration', handleAc);
  }, []);

  const toggleSplitTab = (path: string) => {
    if (isSplit && rightTabPath === path) {
      setIsSplit(false);
      setRightTabPath(null);
    } else {
      setIsSplit(true);
      setRightTabPath(path);
      // Switch active left tab if it matches the one being split to the right
      if (activeTabPath === path) {
        const otherTab = tabs.find(t => t.filePath !== path);
        if (otherTab) {
          setActiveTabPath(otherTab.filePath);
          onFileSelect(otherTab.filePath);
        }
      }
    }
  };

  const closeAllTabs = () => {
    setShowMenu(false);
    const hasDirty = tabs.some(t => t.isDirty);
    if (hasDirty) {
      const confirmClose = window.confirm("Some tabs have unsaved changes. Close all anyway?");
      if (!confirmClose) return;
    }
    setTabs([]);
    setActiveTabPath(null);
    setIsSplit(false);
    setRightTabPath(null);
    if (onCloseFile) onCloseFile("");
  };

  const closeSavedTabs = () => {
    setShowMenu(false);
    const remaining = tabs.filter(t => t.isDirty);
    setTabs(remaining);
    
    // Reset split tab if it was among closed tabs
    if (rightTabPath && !remaining.some(t => t.filePath === rightTabPath)) {
      setIsSplit(false);
      setRightTabPath(null);
    }

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

  const handleEditorChangeForTab = (path: string, value: string | undefined) => {
    const updatedValue = value || '';
    setTabs(prev => prev.map(t => 
      t.filePath === path 
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

    if (rightTabPath === path) {
      setIsSplit(false);
      setRightTabPath(null);
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

        // Inject snippets from snippets.json if enabled
        const showSnippets = localStorage.getItem('enable-snippets') !== 'false';
        if (showSnippets) {
          Object.entries(snippets).forEach(([_key, val]: [string, any]) => {
            const bodyStr = Array.isArray(val.body) ? val.body.join('\n') : val.body;
            suggestions.push({
              label: val.prefix,
              kind: monaco.languages.CompletionItemKind.Snippet,
              detail: val.description || 'Snippet',
              documentation: {
                value: `**${val.description}**\n\n\`\`\`cpp\n${bodyStr}\n\`\`\``
              },
              insertText: bodyStr,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
              sortText: '0001' // snippet has higher sorting priority
            });
          });
        }

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

  const renderWelcomeBackdrop = () => (
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
  );

  const renderTabContent = (tab: EditorTab) => {
    if (tab.filePath === 'nexel://snippets') {
      return <SnippetsViewer snippetsData={snippets} />;
    } else if (tab.filePath.startsWith('cf://')) {
      try {
        const parsed = JSON.parse(tab.content);
        return <ContestProblemViewer problemData={parsed} />;
      } catch (e) {
        console.error("Failed to parse problem statement JSON:", e);
        return (
          <div className="nx-contests-status-msg error">
            <p>Error rendering problem statement: Invalid data format.</p>
          </div>
        );
      }
    } else {
      return (
        <div className="nx-editor-workspace-area">
          <MonacoEditor
            height="100%"
            language={getLanguage(tab.name)}
            value={tab.content}
            onChange={(val) => handleEditorChangeForTab(tab.filePath, val)}
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
      );
    }
  };

  const rightTab = tabs.find(t => t.filePath === rightTabPath);

  return (
    <div ref={containerRef} className={`nx-editor-canvas ${acCelebration ? 'ac-celebrate-glow' : ''}`}>
      {/* Floating Premium aesthetic minimal active tabs bar */}
      {tabs.length > 0 && (
        <div className="nx-floating-tabbar-container">
          <div className="nx-floating-tabbar">
            <div className="nx-tabs-scroll-stack">
              {tabs.map((tab) => (
                <div 
                  key={tab.filePath} 
                  className={`nx-editor-tab ${activeTabPath === tab.filePath ? 'active' : ''} ${activeTabPath === tab.filePath && acCelebration ? 'ac-celebrate-glow' : ''}`}
                  onClick={() => {
                    setActiveTabPath(tab.filePath);
                    onFileSelect(tab.filePath);
                  }}
                >
                  <span className="nx-tab-title">{tab.name}</span>
                  {tab.isDirty && <div className="nx-dirty-indicator-glow" />}
                  <div className="nx-tab-actions-group">
                    <button 
                      className={`nx-tab-split-btn ${isSplit && rightTabPath === tab.filePath ? 'active' : ''}`}
                      title={isSplit && rightTabPath === tab.filePath ? "Close Split Pane" : "Split to Right Pane"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSplitTab(tab.filePath);
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="1.5" />
                        <line x1="12" y1="3" x2="12" y2="21" />
                      </svg>
                    </button>
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

      {/* Editor Main Content Area (supports Split Layout) */}
      <div className="nx-editor-main-container">
        {isSplit ? (
          <div className="nx-editor-split-container">
            {/* Left Pane */}
            <div className="nx-editor-split-pane left" style={{ width: `${splitRatio}%` }}>
              {activeTab && activeTab.filePath !== rightTabPath ? (
                renderTabContent(activeTab)
              ) : (
                renderWelcomeBackdrop()
              )}
            </div>

            {/* Draggable vertical divider */}
            <div 
              className={`nx-editor-split-divider ${isDragging ? 'dragging' : ''}`} 
              onMouseDown={handleMouseDown}
            >
              <div className="nx-divider-glow-line" />
            </div>

            {/* Right Pane */}
            <div className="nx-editor-split-pane right" style={{ width: `${100 - splitRatio}%` }}>
              {rightTab ? (
                <div className="nx-right-pane-wrapper">
                  <div className="nx-right-pane-header">
                    <span className="nx-right-pane-title">{rightTab.name}</span>
                    <button 
                      className="nx-right-pane-close" 
                      onClick={() => { setIsSplit(false); setRightTabPath(null); }} 
                      title="Close Split Pane"
                    >
                      ×
                    </button>
                  </div>
                  <div className="nx-right-pane-content">
                    {renderTabContent(rightTab)}
                  </div>
                </div>
              ) : (
                renderWelcomeBackdrop()
              )}
            </div>
          </div>
        ) : (
          /* Standard Single Pane View */
          activeTab ? renderTabContent(activeTab) : renderWelcomeBackdrop()
        )}
      </div>

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

interface SnippetsViewerProps {
  snippetsData: any;
}

const SnippetsViewer: React.FC<SnippetsViewerProps> = ({ snippetsData }) => {
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredSnippets = Object.entries(snippetsData).filter(([key, value]: [string, any]) => {
    const q = search.toLowerCase();
    return (
      key.toLowerCase().includes(q) ||
      (value.prefix && value.prefix.toLowerCase().includes(q)) ||
      (value.description && value.description.toLowerCase().includes(q))
    );
  });

  const handleCopy = (key: string, body: string[]) => {
    navigator.clipboard.writeText(body.join('\n'));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="nx-snippets-viewer">
      <div className="nx-snippets-header">
        <div>
          <h1 className="nx-snippets-title">NEXEL SNIPPETS</h1>
          <p className="nx-snippets-subtitle">Fast keyboard-expandable boilerplate fragments for Competitive Programming</p>
        </div>
        <input 
          type="text" 
          placeholder="Search snippets..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="nx-snippets-search"
        />
      </div>

      <div className="nx-snippets-grid">
        {filteredSnippets.map(([key, value]: [string, any]) => (
          <div key={key} className="nx-snippet-card">
            <div className="nx-snippet-card-header">
              <span className="nx-snippet-prefix-badge" title="Type prefix and press Tab to expand">{value.prefix}</span>
              <span className="nx-snippet-desc">{value.description}</span>
              <button 
                className={`nx-snippet-copy-btn ${copiedKey === key ? 'copied' : ''}`}
                onClick={() => handleCopy(key, value.body)}
              >
                {copiedKey === key ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="nx-snippet-code-block">
              <code>{value.body.join('\n')}</code>
            </pre>
          </div>
        ))}
        {filteredSnippets.length === 0 && (
          <div className="nx-snippets-empty">No matching snippets found.</div>
        )}
      </div>
    </div>
  );
};

interface ContestProblemViewerProps {
  problemData: any;
}

const ContestProblemViewer: React.FC<ContestProblemViewerProps> = React.memo(({ problemData }) => {
  useEffect(() => {
    const mj = (window as any).MathJax;
    if (mj && mj.typesetPromise) {
      mj.typesetPromise();
    }
  }, [problemData.url]);

  const handleImportSamples = () => {
    if (problemData.testCases && Array.isArray(problemData.testCases)) {
      window.dispatchEvent(new CustomEvent('nx-import-samples', { detail: problemData.testCases }));
      alert("Sample test cases successfully imported to Nexel Judge System! Switch to the Judge tab to run them.");
    }
  };

  return (
    <div className="nx-cf-problem-viewer">
      <div className="nx-cf-problem-header">
        <h1 className="nx-cf-problem-title">{problemData.index}. {problemData.title}</h1>
        <div className="nx-cf-problem-meta-row">
          <div className="nx-cf-meta-chip">
            <span className="label">TIME LIMIT</span>
            <span className="value">{problemData.timeLimit}</span>
          </div>
          <div className="nx-cf-meta-chip">
            <span className="label">MEMORY LIMIT</span>
            <span className="value">{problemData.memoryLimit}</span>
          </div>
          <button className="nx-cf-import-btn" onClick={handleImportSamples}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="nx-import-icon">
              <path d="M12 5v14M5 12h14" />
            </svg>
            IMPORT SAMPLES TO JUDGE
          </button>
        </div>
      </div>

      <div className="nx-cf-problem-body">
        {/* Description Statement */}
        {problemData.statement && (
          <div className="nx-cf-section statement-section">
            <div dangerouslySetInnerHTML={{ __html: problemData.statement }} />
          </div>
        )}

        {/* Input format */}
        {problemData.inputFormat && (
          <div className="nx-cf-section">
            <h3 className="nx-cf-section-title">Input</h3>
            <div dangerouslySetInnerHTML={{ __html: problemData.inputFormat }} />
          </div>
        )}

        {/* Output format */}
        {problemData.outputFormat && (
          <div className="nx-cf-section">
            <h3 className="nx-cf-section-title">Output</h3>
            <div dangerouslySetInnerHTML={{ __html: problemData.outputFormat }} />
          </div>
        )}

        {/* Sample Tests */}
        {problemData.testCases && problemData.testCases.length > 0 && (
          <div className="nx-cf-section">
            <h3 className="nx-cf-section-title">Sample Tests</h3>
            <div className="nx-cf-samples-stack">
              {problemData.testCases.map((tc: any, idx: number) => (
                <div key={idx} className="nx-cf-sample-box">
                  <div className="nx-cf-sample-header">
                    <span className="nx-sample-num">Example #{idx + 1}</span>
                    <div className="nx-cf-sample-actions">
                      <button 
                        className="nx-cf-copy-sample-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(tc.input);
                          alert(`Sample input #${idx + 1} copied to clipboard!`);
                        }}
                      >
                        Copy Input
                      </button>
                      <button 
                        className="nx-cf-copy-sample-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(tc.output);
                          alert(`Sample output #${idx + 1} copied to clipboard!`);
                        }}
                      >
                        Copy Output
                      </button>
                    </div>
                  </div>
                  <div className="nx-cf-sample-grid">
                    <div className="nx-cf-sample-column">
                      <div className="nx-cf-sample-label">INPUT</div>
                      <pre className="nx-cf-sample-pre"><code>{tc.input}</code></pre>
                    </div>
                    <div className="nx-cf-sample-column">
                      <div className="nx-cf-sample-label">OUTPUT</div>
                      <pre className="nx-cf-sample-pre"><code>{tc.output}</code></pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        {problemData.note && (
          <div className="nx-cf-section note-section">
            <h3 className="nx-cf-section-title">Note</h3>
            <div dangerouslySetInnerHTML={{ __html: problemData.note }} />
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => prev.problemData.url === next.problemData.url);

