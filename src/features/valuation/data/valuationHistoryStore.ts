/**
 * valuationHistoryStore — device-local persistence for property valuations.
 *
 * The valuation page is usable without an account, so a signed-out visitor
 * would otherwise lose every estimate on refresh. This store keeps a capped,
 * most-recent-first list of completed valuations in localStorage so anyone can
 * revisit their history. For signed-in users this local history is merged with
 * the server-backed history (see mergeHistories) — the server remains the
 * source of truth across devices; this is the offline/guest layer.
 *
 * Only non-sensitive valuation output is stored (address text, size, estimate);
 * no auth tokens or credentials ever go here, per the app's storage policy.
 */

import type { PropertyValuation } from '../types';

const STORAGE_KEY = 'be:valuation-history:v1';
const MAX_ITEMS = 25;

const hasStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

/** A stable identity for de-duplication (server id if present, else a composite). */
export const valuationKey = (v: PropertyValuation): string =>
  v._id || `${v.address}|${v.city}|${v.country}|${v.sqft}|${v.estimatedValue}`;

/** Read the local history, newest first. Never throws. */
export function readHistory(): PropertyValuation[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PropertyValuation[]) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: PropertyValuation[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Quota or serialization failure — history is best-effort, so ignore.
  }
}

/** Save (or move-to-top) a valuation. Returns the updated list. */
export function saveValuation(valuation: PropertyValuation): PropertyValuation[] {
  const key = valuationKey(valuation);
  const withStamp: PropertyValuation = {
    ...valuation,
    createdAt: valuation.createdAt || new Date().toISOString(),
  };
  const next = [withStamp, ...readHistory().filter((v) => valuationKey(v) !== key)];
  writeHistory(next);
  return next.slice(0, MAX_ITEMS);
}

/** Remove one valuation by key. Returns the updated list. */
export function removeValuation(key: string): PropertyValuation[] {
  const next = readHistory().filter((v) => valuationKey(v) !== key);
  writeHistory(next);
  return next;
}

/** Clear all local history. */
export function clearHistory(): void {
  writeHistory([]);
}

/** True if a valuation is already in local history. */
export function isSaved(valuation: PropertyValuation): boolean {
  const key = valuationKey(valuation);
  return readHistory().some((v) => valuationKey(v) === key);
}

/**
 * Merge local and server histories, de-duplicated by key and sorted newest
 * first. Server items win on conflict (they carry the canonical record).
 */
export function mergeHistories(
  local: PropertyValuation[],
  server: PropertyValuation[],
): PropertyValuation[] {
  const byKey = new Map<string, PropertyValuation>();
  for (const v of local) byKey.set(valuationKey(v), v);
  for (const v of server) byKey.set(valuationKey(v), v); // server overrides
  return Array.from(byKey.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );
}
