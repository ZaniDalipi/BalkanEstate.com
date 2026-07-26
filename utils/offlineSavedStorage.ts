/**
 * Offline cache for the user's saved data.
 *
 * Goal: when the user has no network (or the auth/data requests fail), they can
 * still open the app and see the properties and searches they saved before.
 *
 * The service worker (see vite.config.ts) already caches the app shell and the
 * property images (Cloudinary / Unsplash). This module fills the remaining gap:
 * the *data* for the saved list, which normally comes from an authenticated API
 * call that can't complete while offline. We snapshot it to localStorage while
 * online and restore it when the network is unavailable.
 *
 * Privacy: this lives in localStorage on the user's own device and is cleared on
 * logout / session expiry, mirroring how the session hint is already handled.
 */

import type { Property, SavedSearch, User } from '../types';

const STORAGE_KEY = 'balkanestate_offline_saved_v1';

// Don't let a huge favourites list blow past localStorage quotas. The most
// recently saved items are the ones people expect to find offline.
const MAX_SAVED_HOMES = 60;

export interface OfflineSavedSnapshot {
  /** Owner of this snapshot — guards against showing one account's data to another. */
  userId: string;
  /** Minimal user profile so the app can render an authenticated (read-only) UI offline. */
  user: User;
  savedHomes: Property[];
  savedSearches: SavedSearch[];
  /** When this snapshot was written (ms since epoch). */
  updatedAt: number;
}

/** True when the browser reports it is offline. Defaults to "online" if unknown. */
export const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

/**
 * Persist the user's saved data for offline access.
 * Silently no-ops on any storage error (quota, private mode, etc.).
 */
export const saveOfflineSnapshot = (snapshot: {
  user: User;
  savedHomes: Property[];
  savedSearches: SavedSearch[];
}): void => {
  if (typeof localStorage === 'undefined') return;
  const userId = snapshot.user?.id;
  if (!userId) return;

  const payload: OfflineSavedSnapshot = {
    userId,
    user: snapshot.user,
    savedHomes: (snapshot.savedHomes || []).slice(0, MAX_SAVED_HOMES),
    savedSearches: snapshot.savedSearches || [],
    updatedAt: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full / unavailable — offline snapshot is best-effort.
  }
};

/** Read the offline snapshot, or null if none / unreadable. */
export const loadOfflineSnapshot = (): OfflineSavedSnapshot | null => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OfflineSavedSnapshot;
    if (!parsed || !parsed.userId || !parsed.user) return null;
    return {
      userId: parsed.userId,
      user: parsed.user,
      savedHomes: Array.isArray(parsed.savedHomes) ? parsed.savedHomes : [],
      savedSearches: Array.isArray(parsed.savedSearches) ? parsed.savedSearches : [],
      updatedAt: parsed.updatedAt || 0,
    };
  } catch {
    return null;
  }
};

/** Remove the offline snapshot (called on logout / session expiry). */
export const clearOfflineSnapshot = (): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
