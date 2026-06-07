import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../useEditorStore';

describe('useEditorStore concurrency and edge cases', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useEditorStore.setState({
      tabs: [],
      activeTabPath: null,
      isSplit: false,
      rightTabPath: null,
      splitRatio: 50,
      autoSave: false,
      cppTemplate: '',
      enableSnippets: true,
      acCelebration: false
    });
  });

  it('handles rapid open and close operations without desyncing tabs list (Test A)', () => {
    // 1. Open File A
    useEditorStore.getState().openFile('C:/project/FileA.cpp', 'FileA.cpp', 'content A');
    
    // 2. Open File B (simulating rapid user click)
    useEditorStore.getState().openFile('C:/project/FileB.cpp', 'FileB.cpp', 'content B');
    
    // 3. Close File A
    useEditorStore.getState().closeTab('C:/project/FileA.cpp');

    const state = useEditorStore.getState();

    // Verify File A is completely removed, tabs count is 1, and activeTab falls back to File B
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].filePath).toBe('C:/project/FileB.cpp');
    expect(state.activeTabPath).toBe('C:/project/FileB.cpp');
  });

  it('manages tab dirty state and originalContent on update and successful save (Test B)', () => {
    // 1. Open empty file
    useEditorStore.getState().openFile('C:/project/code.cpp', 'code.cpp', 'initial');

    // 2. Update buffer content (isDirty should flip to true)
    useEditorStore.getState().updateTabContent('C:/project/code.cpp', 'modified content');
    let state = useEditorStore.getState();
    expect(state.tabs[0].isDirty).toBe(true);

    // 3. Revert back to match originalContent (isDirty should revert to false)
    useEditorStore.getState().updateTabContent('C:/project/code.cpp', 'initial');
    state = useEditorStore.getState();
    expect(state.tabs[0].isDirty).toBe(false);

    // 4. Update content again and save
    useEditorStore.getState().updateTabContent('C:/project/code.cpp', 'saved changes');
    useEditorStore.getState().saveTabSuccess('C:/project/code.cpp');
    state = useEditorStore.getState();

    // Verify isDirty resets to false and originalContent updates to match new content
    expect(state.tabs[0].isDirty).toBe(false);
    expect(state.tabs[0].originalContent).toBe('saved changes');
    expect(state.tabs[0].content).toBe('saved changes');
  });
});
