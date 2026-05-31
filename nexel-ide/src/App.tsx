import { useState } from 'react';
import { NavDock } from './components/NavDock';
import { Explorer } from './components/Explorer';
import './App.css';

function App() {
  const [currentSection, setCurrentSection] = useState<string>('workspace');

  return (
    <div style={{ 
      backgroundColor: '#0B0B0D', 
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      {/* Floating high-fidelity glass dock layer */}
      <NavDock 
        activeSection={currentSection} 
        onSelect={(id) => setCurrentSection(id)} 
      />

      {/* Workspace Panel Stream */}
      {currentSection === 'workspace' && <Explorer />}

      {/* Main UI Text Editor Core Canvas */}
      <div style={{ 
        flexGrow: 1,
        height: '100vh',
        padding: '24px', 
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: '#0B0B0D' /* Shared background color palette context locks it flush */
      }}>
        {currentSection === 'judge' && (
          <div className="panel-fade-in" style={{ width: '100%' }}>
            <p style={{ color: '#8c95a5', fontSize: '13px', fontFamily: 'sans-serif' }}>
              Judge Compiler Panel Active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;