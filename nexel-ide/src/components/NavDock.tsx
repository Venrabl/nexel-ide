import React, { useState } from 'react';
import './NavDock.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export const NavDock: React.FC = () => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDockHovered, setIsDockHovered] = useState<boolean>(false);

  const navItems: NavItem[] = [
    {
      id: 'workspace',
      label: 'Workspace Explorer',
      icon: (
        <svg className="nd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: 'judge',
      label: 'Judge System',
      icon: (
        <svg className="nd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        {/* Top Specular Accent */}
        <div className="nd-hardware-pin">
          <div className="nd-dot" />
        </div>

        {/* Navigation Core */}
        <div className="nd-items-stack">
          {navItems.map((item) => {
            const isItemHovered = hoveredItem === item.id;
            return (
              <div
                key={item.id}
                className={`nd-item-row ${isItemHovered ? 'nd-row-hovered' : ''}`}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="nd-capsule-container">
                  <div className="nd-glow-layer" />
                  <div className="nd-icon-fluid">
                    {item.icon}
                  </div>
                </div>

                {/* Premium Hardware Tooltip */}
                <div className="nd-tooltip">
                  <span className="nd-tooltip-text">{item.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Specular Accent */}
        <div className="nd-hardware-pin">
          <div className="nd-dot" />
        </div>
      </div>
    </div>
  );
};

export default NavDock;