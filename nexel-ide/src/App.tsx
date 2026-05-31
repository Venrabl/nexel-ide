import { NavDock } from './components/NavDock';
import './App.css';

function App() {
  return (
    <div style={{ 
      backgroundColor: '#0B0B0D', 
      minHeight: '100vh',
      color: '#f3f4f6',
      display: 'flex',
      flexDirection: 'row', /* Keeps layout structure modular and predictable */
      overflow: 'hidden'
    }}>
      {/* Premium Symmetrical Navigation Layer */}
      <NavDock />

      
    </div>
  );
}

export default App;