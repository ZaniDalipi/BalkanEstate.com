import { describe, it, expect } from 'vitest';
import {
  SWITCH_CRASH_WINDOW_MS,
  SWITCH_MARKER_KEY,
  clearSwitchMarker,
  consumeSwitchCrash,
  markSwitchStart,
  type MarkerStorage,
} from './viewSwitchGuard';

function memoryStorage(): MarkerStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: MarkerStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
  removeItem: () => { throw new Error('blocked'); },
};

describe('viewSwitchGuard', () => {
  it('reports no crash when no switch was left pending', () => {
    expect(consumeSwitchCrash(memoryStorage(), 1000)).toBe(false);
  });

  it('reports a crash when a switch marker survives into the next load, once', () => {
    const storage = memoryStorage();
    markSwitchStart(storage, 1000);
    expect(consumeSwitchCrash(storage, 3000)).toBe(true);
    expect(storage.data.has(SWITCH_MARKER_KEY)).toBe(false);
    expect(consumeSwitchCrash(storage, 4000)).toBe(false);
  });

  it('reports no crash when the page cleared its marker after surviving', () => {
    const storage = memoryStorage();
    markSwitchStart(storage, 1000);
    clearSwitchMarker(storage);
    expect(consumeSwitchCrash(storage, 3000)).toBe(false);
  });

  it('ignores a stale marker, a future one and garbage', () => {
    const storage = memoryStorage();
    markSwitchStart(storage, 1000);
    expect(consumeSwitchCrash(storage, 1000 + SWITCH_CRASH_WINDOW_MS + 1)).toBe(false);
    markSwitchStart(storage, 9000);
    expect(consumeSwitchCrash(storage, 1000)).toBe(false);
    storage.setItem(SWITCH_MARKER_KEY, 'nonsense');
    expect(consumeSwitchCrash(storage, 1000)).toBe(false);
  });

  it('does nothing, and never throws, without usable storage', () => {
    expect(() => markSwitchStart(null, 1)).not.toThrow();
    expect(() => markSwitchStart(throwing, 1)).not.toThrow();
    expect(() => clearSwitchMarker(throwing)).not.toThrow();
    expect(consumeSwitchCrash(null, 1)).toBe(false);
    expect(consumeSwitchCrash(throwing, 1)).toBe(false);
  });
});
