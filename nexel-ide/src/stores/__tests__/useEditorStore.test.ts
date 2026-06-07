import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../useEditorStore';

describe('useEditorStore state management', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useEditorStore.getState().closeAllTabs();
  });

  it('verifies openFile adds a tab, updates activeTabPath, and isDirty is false', () => {
    const store = useEditorStore.getState();
    expect(store.tabs.length).toBe(0);
    expect(store.activeTabPath).toBeNull();

    // Open first file
    useEditorStore.getState().openFile('C:/project/main.cpp', 'main.cpp', 'int main() {}');
    
    const updatedStore = useEditorStore.getState();
    expect(updatedStore.tabs.length).toBe(1);
    expect(updatedStore.tabs[0].filePath).toBe('C:/project/main.cpp');
    expect(updatedStore.tabs[0].name).toBe('main.cpp');
    expect(updatedStore.tabs[0].content).toBe('int main() {}');
    expect(updatedStore.tabs[0].isDirty).toBe(false);
    expect(updatedStore.activeTabPath).toBe('C:/project/main.cpp');
  });

  it('verifies updateTabContent handles dirty states correctly', () => {
    // Open file
    useEditorStore.getState().openFile('C:/project/main.cpp', 'main.cpp', 'int main() {}');

    // Update with changes
    useEditorStore.getState().updateTabContent('C:/project/main.cpp', 'int main() { return 0; }');
    let store = useEditorStore.getState();
    expect(store.tabs[0].content).toBe('int main() { return 0; }');
    expect(store.tabs[0].isDirty).toBe(true);

    // Revert changes back to originalContent
    useEditorStore.getState().updateTabContent('C:/project/main.cpp', 'int main() {}');
    store = useEditorStore.getState();
    expect(store.tabs[0].isDirty).toBe(false);
  });

  it('verifies closeTab removes the tab and activeTabPath falls back to last tab or null', () => {
    // Open 3 files
    useEditorStore.getState().openFile('1.cpp', '1.cpp', '1');
    useEditorStore.getState().openFile('2.cpp', '2.cpp', '2');
    useEditorStore.getState().openFile('3.cpp', '3.cpp', '3');

    let store = useEditorStore.getState();
    expect(store.tabs.length).toBe(3);
    expect(store.activeTabPath).toBe('3.cpp');

    // Close 3.cpp -> active falls back to 2.cpp
    useEditorStore.getState().closeTab('3.cpp');
    store = useEditorStore.getState();
    expect(store.tabs.length).toBe(2);
    expect(store.activeTabPath).toBe('2.cpp');

    // Close 1.cpp -> active tab remains 2.cpp
    useEditorStore.getState().closeTab('1.cpp');
    store = useEditorStore.getState();
    expect(store.tabs.length).toBe(1);
    expect(store.activeTabPath).toBe('2.cpp');

    // Close 2.cpp -> active tab becomes null
    useEditorStore.getState().closeTab('2.cpp');
    store = useEditorStore.getState();
    expect(store.tabs.length).toBe(0);
    expect(store.activeTabPath).toBeNull();
  });
});
