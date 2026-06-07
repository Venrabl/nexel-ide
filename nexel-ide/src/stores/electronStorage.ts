import type { StateStorage } from 'zustand/middleware';

// Write cache to avoid duplicate disk-writes for non-persisted states (e.g. editor tabs contents changing on every keystroke)
const writeCache: Record<string, string> = {};

/**
 * Custom storage adapter mapping Zustand's persistence layer to Electron Store
 * synchronously via ipcRenderer.sendSync, optimized with a write-cache to prevent disk I/O bottlenecks.
 */
export const electronStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const data = window.nexelAPI.getStoreSync(name);
      if (data === undefined || data === null) {
        return null;
      }
      // Zustand expects a JSON string returned from getItem
      const stringified = typeof data === 'string' ? data : JSON.stringify(data);
      // Seed the cache with the loaded state
      writeCache[name] = stringified;
      return stringified;
    } catch (err) {
      console.error(`[electronStorage] getItem failed for key: ${name}`, err);
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      // Performance optimization: skip IPC and disk I/O if the persisted state slice didn't change
      if (writeCache[name] === value) {
        return;
      }
      writeCache[name] = value;

      // Parse JSON string to store it as a native structured object inside electron-store
      let parsedValue: unknown = value;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // Keep as raw string if parsing fails
      }
      window.nexelAPI.setStoreSync(name, parsedValue);
    } catch (err) {
      console.error(`[electronStorage] setItem failed for key: ${name}`, err);
    }
  },

  removeItem: (name: string): void => {
    try {
      delete writeCache[name];
      window.nexelAPI.deleteStoreSync(name);
    } catch (err) {
      console.error(`[electronStorage] removeItem failed for key: ${name}`, err);
    }
  },
};
