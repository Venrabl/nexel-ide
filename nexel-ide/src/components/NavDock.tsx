import React, { useState } from 'react';
import './NavDock.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavDockProps {
  activeSection: string;
  onSelect: (id: string) => void;
  sidebarCollapsed?: boolean;
}

export const NavDock: React.FC<NavDockProps> = ({ activeSection, onSelect, sidebarCollapsed }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);

  const navItems: NavItem[] = [
    {
      id: 'workspace',
      label: 'Workspace Explorer',
      icon: (
        <svg className="nd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'judge',
      label: 'Judge System',
      icon: (
        <svg className="nd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22V13m0 0l-4 2m4-2l4 2" />
          <path d="M12 7V2m0 5a3 3 0 1 0 0 6 3 3 0 1 0 0-6z" />
          <path d="M5 17h14M3 22h18" />
        </svg>
      ),
    },
  ];

  return (
    <div className="nd-wrapper-axis">
      <div 
        className={`nd-dock ${isDockHovered ? 'nd-dock-expanded' : ''}`}
        onMouseEnter={() => setIsDockHovered(true)}
        onMouseLeave={() => {
          setIsDockHovered(false);
          setHoveredItem(null);
        }}
      >
        {/* Top Accent Hardware Pin with Pulse effect */}
        <div className="nd-hardware-pin top-pin">
          <div className="nd-dot pulsing" />
        </div>

        {/* Navigation Core stack */}
        <div className="nd-items-stack">
          {navItems.map((item) => {
            const isItemHovered = hoveredItem === item.id;
            const isItemActive = activeSection === item.id && !(item.id === 'workspace' && sidebarCollapsed);

            return (
              <div
                key={item.id}
                className={`nd-item-row ${isItemHovered ? 'nd-row-hovered' : ''} ${isItemActive ? 'nd-row-active' : ''}`}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => onSelect(item.id)}
              >
                {/* Neon Tube Active Indicator Pillar */}
                <div className="nd-active-indicator" />

                <div className="nd-capsule-container">
                  <div className="nd-glow-layer" />
                  <div className="nd-icon-fluid">
                    {item.icon}
                  </div>
                </div>

                {/* Cyberpunk Glass Tooltip */}
                <div className="nd-tooltip">
                  <span className="nd-tooltip-text">{item.label}</span>
                  <div className="nd-tooltip-indicator" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Gear/Settings Action Button */}
        <div className="nd-footer-action">
          <button 
            className="nd-footer-btn" 
            title="IDE Preferences"
            onClick={() => alert("Nexel IDE v1.0.0 Preferences Panel - Design overhauled with premium dark themes.")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          
          <div className="nd-hardware-pin bottom-pin">
            <div className="nd-dot" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavDock;