import type { StateStorage } from 'zustand/middleware';

/**
 * localStorage for persisted stores that never throws.
 *
 * Storage can be missing (SSR), blocked (private mode, site data off) or full
 * (quota). A remembered preference is a convenience: when storage fails the
 * app keeps working and simply forgets, instead of an exception escaping a
 * click handler from inside the store's `set`.
 */
const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return store()?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      store()?.setItem(name, value);
    } catch {
      // Full or blocked: the preference just isn't remembered.
    }
  },
  removeItem: (name) => {
    try {
      store()?.removeItem(name);
    } catch {
      // Nothing to clean up when storage is unavailable.
    }
  },
};
