import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { electronStorage } from './electronStorage';

interface UIState {
  currentSection: string;
  sidebarCollapsed: boolean;
  isHoverRevealed: boolean;
  terminalVisible: boolean;
  templateModalVisible: boolean;
  setSection: (section: string) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setIsHoverRevealed: (revealed: boolean) => void;
  toggleTerminal: () => void;
  setTerminalVisible: (visible: boolean) => void;
  openTemplateModal: (visible: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currentSection: 'workspace',
      sidebarCollapsed: false,
      isHoverRevealed: false,
      terminalVisible: false,
      templateModalVisible: false,
      setSection: (section) => set({ currentSection: section }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed, isHoverRevealed: false })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setIsHoverRevealed: (revealed) => set({ isHoverRevealed: revealed }),
      toggleTerminal: () => set((state) => ({ terminalVisible: !state.terminalVisible })),
      setTerminalVisible: (visible) => set({ terminalVisible: visible }),
      openTemplateModal: (visible) => set({ templateModalVisible: visible }),
    }),
    {
      name: 'nexel-ui-store',
      storage: createJSONStorage(() => electronStorage),
    }
  )
);
