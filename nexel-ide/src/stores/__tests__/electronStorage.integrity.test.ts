import { describe, it, expect, vi, beforeEach } from 'vitest';
import { electronStorage } from '../electronStorage';

describe('electronStorage Zustand persistence adapter integrity', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    
    // Setup clean window.nexelAPI mock environment for integrity checks
    (global as any).window = {
      nexelAPI: {
        getStoreSync: vi.fn(),
        setStoreSync: vi.fn(),
        deleteStoreSync: vi.fn(),
      }
    };
  });

  it('prevents duplicate disk operations via Write Cache optimization (Test A)', () => {
    const mockSet = window.nexelAPI.setStoreSync as any;
    
    const jsonPayload = '{"theme":"cyberpunk","fontSize":14}';

    // First write should trigger disk operation (IPC)
    electronStorage.setItem('preferences-key', jsonPayload);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenLastCalledWith('preferences-key', { theme: 'cyberpunk', fontSize: 14 });

    // Second write with identical payload should trigger write cache hit, skipping disk operation
    electronStorage.setItem('preferences-key', jsonPayload);
    expect(mockSet).toHaveBeenCalledTimes(1); // Call count should remain 1
  });

  it('handles invalid JSON payloads gracefully by falling back to raw string storage (Test B)', () => {
    const mockSet = window.nexelAPI.setStoreSync as any;

    const invalidJson = 'malformed-raw-string-preferences';

    // Verify it doesn't throw and safely falls back
    expect(() => {
      electronStorage.setItem('invalid-key', invalidJson);
    }).not.toThrow();

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenLastCalledWith('invalid-key', invalidJson);
  });
});
