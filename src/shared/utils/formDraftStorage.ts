/**
 * Unsent form data kept on this device, so a person who closes the app, loses
 * the tab or navigates away finds what they typed waiting next time.
 *
 * localStorage, one entry per form and person, each with an expiry. Every call
 * degrades to a no-op where storage is unavailable (private mode, quota, SSR):
 * a draft is a convenience, never a reason for a form to fail.
 *
 * Only plain JSON goes in here — never passwords, card details or File objects.
 * (Property listings, which keep photos, use IndexedDB: see listingDraftStorage.)
 */

const PREFIX = 'be-form-draft:v1:';

/** How long an unsent form is kept by default */
export const FORM_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredFormDraft<T> {
  savedAt: number;
  expiresAt: number;
  data: T;
}

/** Storage key for one form of one person (`guest` when signed out). */
export const formDraftKey = (form: string, userId?: string | null): string =>
  `${PREFIX}${form}:${userId || 'guest'}`;

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const isStoredDraft = (value: unknown): value is StoredFormDraft<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as StoredFormDraft<unknown>).savedAt === 'number' &&
  typeof (value as StoredFormDraft<unknown>).expiresAt === 'number' &&
  'data' in value;

export function readFormDraft<T>(key: string, now = Date.now()): StoredFormDraft<T> | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDraft(parsed) || parsed.expiresAt <= now) {
      store.removeItem(key);
      return null;
    }
    return parsed as StoredFormDraft<T>;
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(key: string, data: T, ttlMs = FORM_DRAFT_TTL_MS, now = Date.now()): StoredFormDraft<T> | null {
  const store = storage();
  if (!store) return null;
  const entry: StoredFormDraft<T> = { savedAt: now, expiresAt: now + ttlMs, data };
  try {
    store.setItem(key, JSON.stringify(entry));
    return entry;
  } catch {
    return null;
  }
}

export function removeFormDraft(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // nothing to do
  }
}

/** True when two form snapshots hold the same data (JSON-equal). */
export const sameFormData = (a: unknown, b: unknown): boolean => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

/** Drop expired drafts of every form; run once at start so old entries never pile up. */
export function pruneExpiredFormDrafts(now = Date.now()): void {
  const store = storage();
  if (!store) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach(key => readFormDraft(key, now));
  } catch {
    // nothing to do
  }
}
