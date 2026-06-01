import { useState, useEffect } from 'react';
import { NavDock } from './components/NavDock';
import { Explorer } from './components/Explorer';
import { Editor } from './components/Editor';
import { TitleBar } from './components/TitleBar';
import { Terminal } from './components/Terminal';
import { JudgeSystem } from './components/JudgeSystem';
import './App.css';

function App() {
  const [currentSection, setCurrentSection] = useState<string>('workspace');
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isHoverRevealed, setIsHoverRevealed] = useState<boolean>(false);
  const [terminalVisible, setTerminalVisible] = useState<boolean>(false);

  const handleFileSelect = (filePath: string) => {
    setActiveFilePath(filePath);
  };

  const handleCloseFile = () => {
    setActiveFilePath(null);
  };

  const handleSelectSection = (id: string) => {
    if (id === 'workspace' || id === 'judge') {
      if (currentSection === id) {
        // Toggle collapse state when clicking active workspace or judge icon
        setSidebarCollapsed(!sidebarCollapsed);
        setIsHoverRevealed(false);
      } else {
        setCurrentSection(id);
        setSidebarCollapsed(false);
      }
    } else {
      setCurrentSection(id);
    }
  };

  // Toggle sidebar event hook
  useEffect(() => {
    const handleToggle = () => {
      setSidebarCollapsed(prev => !prev);
      setIsHoverRevealed(false);
    };
    window.addEventListener('nx-toggle-sidebar', handleToggle);
    return () => window.removeEventListener('nx-toggle-sidebar', handleToggle);
  }, []);

  // Terminal toggle and spawn event hooks
  useEffect(() => {
    const handleOpen = () => setTerminalVisible(true);
    const handleToggle = () => setTerminalVisible(prev => !prev);

    window.addEventListener('nx-open-terminal', handleOpen);
    window.addEventListener('nx-toggle-terminal', handleToggle);

    return () => {
      window.removeEventListener('nx-open-terminal', handleOpen);
      window.removeEventListener('nx-toggle-terminal', handleToggle);
    };
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden', 
      backgroundColor: '#0B0B0D' 
    }}>
      <TitleBar />

      <div style={{ 
        flexGrow: 1,
        width: '100vw',
        height: 'calc(100vh - 34px)',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Invisible Hover Trigger zone at absolute left edge when NavDock is collapsed */}
        {sidebarCollapsed && (
          <div 
            className="nx-navdock-hover-trigger"
            onMouseEnter={() => setIsHoverRevealed(true)}
            style={{
              position: 'fixed',
              left: 0,
              top: '34px',
              width: '24px',
              height: 'calc(100vh - 34px)',
              zIndex: 9999,
              background: 'transparent'
            }}
          />
        )}

        {/* Floating high-fidelity glass dock layer (collapses off-screen, reveals on hover) */}
        <div 
          className={`nx-navdock-wrapper-container ${sidebarCollapsed ? 'collapsed' : ''} ${isHoverRevealed ? 'hover-revealed' : ''}`}
          onMouseLeave={() => setIsHoverRevealed(false)}
          style={{
            height: 'calc(100vh - 34px)',
            zIndex: 10000,
            position: 'fixed',
            top: '34px',
            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <NavDock 
            activeSection={currentSection} 
            onSelect={handleSelectSection} 
            sidebarCollapsed={sidebarCollapsed}
          />
        </div>

        {/* Workspace Panel Stream (Collapses completely on toggle, no hover reveal) */}
        <div 
          className={`nx-sidebar-container ${sidebarCollapsed ? 'collapsed' : ''}`}
          style={{ 
            display: (currentSection === 'workspace' || currentSection === 'judge') ? 'flex' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            height: '100%'
          }}
        >
          <div style={{ display: currentSection === 'workspace' ? 'flex' : 'none', height: '100%', width: '100%' }}>
            <Explorer 
              onFileSelect={handleFileSelect} 
              activeFilePath={activeFilePath}
            />
          </div>
          <div style={{ display: currentSection === 'judge' ? 'flex' : 'none', height: '100%', width: '100%' }}>
            <JudgeSystem activeFilePath={activeFilePath} />
          </div>
        </div>

        {/* Main UI Text Editor Core Canvas */}
        <div style={{ 
          flexGrow: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          background: '#0B0B0D',
          position: 'relative'
        }}>
          {/* Editor panel is always mounted but toggled using CSS to prevent vanishing tabs */}
          <div style={{ display: (currentSection === 'workspace' || currentSection === 'judge') ? 'flex' : 'none', width: '100%', height: '100%' }}>
            <Editor 
              activeFilePath={activeFilePath} 
              onFileSelect={handleFileSelect}
              onCloseFile={handleCloseFile}
            />
          </div>


        </div>
      </div>
      <Terminal 
        visible={terminalVisible} 
        onClose={() => setTerminalVisible(false)} 
        sidebarCollapsed={sidebarCollapsed}
      />
    </div>
  );
}

export default App;