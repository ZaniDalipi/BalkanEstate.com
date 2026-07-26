/**
 * Offline Saved Storage Tests
 * Tests the localStorage snapshot used to show saved properties/searches offline.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveOfflineSnapshot,
  loadOfflineSnapshot,
  clearOfflineSnapshot,
  isOffline,
} from '../../utils/offlineSavedStorage';

const user: any = { id: 'user-1', name: 'Ana', email: 'ana@example.com' };
const homeA: any = { id: 'home-a', title: 'Apartment A' };
const homeB: any = { id: 'home-b', title: 'Villa B' };
const search: any = { id: 'search-1', name: 'Belgrade 2BR', filters: {} };

describe('offlineSavedStorage', () => {
  // The global test setup (src/tests/setup.ts) stubs localStorage with inert
  // vi.fn()s that don't actually store anything. Back them with a real in-memory
  // map so the persist → load round-trip can be exercised.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.mocked(localStorage.getItem).mockImplementation((k: string) =>
      store.has(k) ? store.get(k)! : null
    );
    vi.mocked(localStorage.setItem).mockImplementation((k: string, v: string) => {
      store.set(k, String(v));
    });
    vi.mocked(localStorage.removeItem).mockImplementation((k: string) => {
      store.delete(k);
    });
    vi.mocked(localStorage.clear).mockImplementation(() => {
      store.clear();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists and restores a saved snapshot', () => {
    saveOfflineSnapshot({ user, savedHomes: [homeA, homeB], savedSearches: [search] });

    const snapshot = loadOfflineSnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.userId).toBe('user-1');
    expect(snapshot!.user.id).toBe('user-1');
    expect(snapshot!.savedHomes.map((h) => h.id)).toEqual(['home-a', 'home-b']);
    expect(snapshot!.savedSearches[0].id).toBe('search-1');
    expect(snapshot!.updatedAt).toBeGreaterThan(0);
  });

  it('returns null when nothing is stored', () => {
    expect(loadOfflineSnapshot()).toBeNull();
  });

  it('does not store a snapshot without a user id', () => {
    saveOfflineSnapshot({ user: {} as any, savedHomes: [homeA], savedSearches: [] });
    expect(loadOfflineSnapshot()).toBeNull();
  });

  it('caps the number of saved homes to avoid storage bloat', () => {
    const manyHomes = Array.from({ length: 100 }, (_, i) => ({ id: `h-${i}` }) as any);
    saveOfflineSnapshot({ user, savedHomes: manyHomes, savedSearches: [] });

    const snapshot = loadOfflineSnapshot();
    expect(snapshot!.savedHomes.length).toBe(60);
    // Keeps the most recently saved (first) entries.
    expect(snapshot!.savedHomes[0].id).toBe('h-0');
  });

  it('clears the snapshot', () => {
    saveOfflineSnapshot({ user, savedHomes: [homeA], savedSearches: [] });
    expect(loadOfflineSnapshot()).not.toBeNull();

    clearOfflineSnapshot();
    expect(loadOfflineSnapshot()).toBeNull();
  });

  it('returns null for corrupt stored data', () => {
    localStorage.setItem('balkanestate_offline_saved_v1', '{not valid json');
    expect(loadOfflineSnapshot()).toBeNull();
  });

  it('reflects navigator.onLine in isOffline()', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isOffline()).toBe(true);

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    expect(isOffline()).toBe(false);
  });
});
