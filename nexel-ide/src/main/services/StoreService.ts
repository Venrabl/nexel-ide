import type Store from 'electron-store';

export type StoreKey = 'nexel-ui-store' | 'nexel-workspace-store' | 'nexel-editor-store' | 'nexel-judge-store';

export class StoreService {
  private store: Store | null = null;

  /**
   * Pre-initialize the electron-store instance asynchronously at application startup
   */
  async initialize(): Promise<void> {
    if (this.store) return;
    const { default: StoreClass } = await (import('electron-store') as Promise<{ default: typeof Store }>);
    this.store = new StoreClass();
  }

  getSync(key: StoreKey): unknown {
    if (!this.store) {
      console.warn(`[StoreService] getSync called before initialization for key: ${key}`);
      return null;
    }
    try {
      return this.store.get(key);
    } catch (err) {
      console.error(`StoreService getSync error for key ${key}:`, err);
      return null;
    }
  }

  setSync(key: StoreKey, value: unknown): void {
    if (!this.store) {
      console.warn(`[StoreService] setSync called before initialization for key: ${key}`);
      return;
    }
    try {
      this.store.set(key, value);
    } catch (err) {
      console.error(`StoreService setSync error for key ${key}:`, err);
    }
  }

  deleteSync(key: StoreKey): void {
    if (!this.store) {
      console.warn(`[StoreService] deleteSync called before initialization for key: ${key}`);
      return;
    }
    try {
      this.store.delete(key);
    } catch (err) {
      console.error(`StoreService deleteSync error for key ${key}:`, err);
    }
  }
}
