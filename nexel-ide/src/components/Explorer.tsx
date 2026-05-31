import React, { useState } from 'react';
import './Explorer.css';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  isOpen?: boolean;
  color?: string;
  children?: FileNode[];
}

export const Explorer: React.FC = () => {
  const [tree, setTree] = useState<FileNode[]>([
    {
      name: 'NEXEL-IDE',
      type: 'folder',
      isOpen: true,
      children: [
        {
          name: 'docs',
          type: 'folder',
          isOpen: false,
          children: [
            { name: 'architecture.md', type: 'file' },
            { name: 'features.md', type: 'file' },
          ]
        },
        {
          name: 'nexel-ide',
          type: 'folder',
          isOpen: true,
          children: [
            { name: 'node_modules', type: 'folder', isOpen: false, color: '#64748b' },
            { name: 'public', type: 'folder', isOpen: false, color: '#38bdf8' },
            {
              name: 'src',
              type: 'folder',
              isOpen: true,
              color: '#c084fc',
              children: [
                { name: 'assets', type: 'folder', isOpen: false, color: '#fb923c' },
                {
                  name: 'components',
                  type: 'folder',
                  isOpen: true,
                  children: [
                    { name: 'NavDock.css', type: 'file', color: '#38bdf8' },
                    { name: 'NavDock.tsx', type: 'file', color: '#61dafb' },
                  ]
                },
                { name: 'App.css', type: 'file', color: '#38bdf8' },
                { name: 'App.tsx', type: 'file', color: '#61dafb' },
                { name: 'index.css', type: 'file', color: '#38bdf8' },
                { name: 'main.tsx', type: 'file', color: '#61dafb' },
                { name: 'nexel-env.d.ts', type: 'file', color: '#4ade80' },
              ]
            },
            { name: '.gitignore', type: 'file', color: '#f05032' },
            { name: 'eslint.config.js', type: 'file', color: '#8080f2' },
            { name: 'index.html', type: 'file', color: '#e34c26' },
            { name: 'main.cjs', type: 'file', color: '#f7df1e' },
            { name: 'package-lock.json', type: 'file', color: '#4ade80' },
            { name: 'package.json', type: 'file', color: '#4ade80' },
            { name: 'preload.cjs', type: 'file', color: '#f7df1e' },
            { name: 'README.md', type: 'file', color: '#38bdf8' },
            { name: 'tsconfig.app.json', type: 'file', color: '#3178c6' },
            { name: 'tsconfig.json', type: 'file', color: '#3178c6' },
            { name: 'tsconfig.node.json', type: 'file', color: '#3178c6' },
            { name: 'vite.config.ts', type: 'file', color: '#eab308' },
          ]
        },
        { name: '.gitignore', type: 'file', color: '#f05032' },
        { name: 'README.md', type: 'file', color: '#38bdf8' },
        { name: 'repomix-output.xml', type: 'file', color: '#ff8200' },
      ]
    }
  ]);

  const [selectedPath, setSelectedPath] = useState<string>('App.tsx');

  const toggleFolder = (pathName: string) => {
    const deepToggle = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.name === pathName && node.type === 'folder') {
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

  const renderTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node, index) => {
      const isSelected = selectedPath === node.name;

      return (
        <div key={`${node.name}-${index}`} className="nx-node-block">
          <div 
            className={`nx-node-row ${isSelected ? 'nx-row-selected' : ''}`}
            style={{ paddingLeft: `${depth * 14 + 18}px` }}
            onClick={() => {
              if (node.type === 'folder') {
                toggleFolder(node.name);
              } else {
                setSelectedPath(node.name);
              }
            }}
          >
            {/* Minimalist Micro Chevron */}
            {node.type === 'folder' ? (
              <span className={`nx-chevron ${node.isOpen ? 'open' : ''}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7"/></svg>
              </span>
            ) : (
              <span className="nx-chevron-spacer" />
            )}

            {/* Custom Premium File/Folder Icons tailored to Dock Design System */}
            <span className="nx-icon-frame" style={{ color: node.color || 'rgba(255,255,255,0.3)' }}>
              {node.type === 'folder' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
              )}
            </span>

            <span className="nx-node-text">{node.name}</span>
          </div>

          {node.type === 'folder' && node.isOpen && node.children && (
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
        <span className="nx-explorer-title">NEXEL IDE</span>
      </div>
      <div className="nx-tree-scroll">
        {renderTree(tree)}
      </div>
    </div>
  );
};

export default Explorer;