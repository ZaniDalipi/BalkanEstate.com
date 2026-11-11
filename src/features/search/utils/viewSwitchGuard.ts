/**
 * Crash-loop guard for the List / Map switch.
 *
 * When iOS Safari runs out of memory it kills the page without running a single
 * line of our code, so a crash cannot be caught — only noticed on the next load.
 * So the switch leaves a marker before it does its heavy work and removes it
 * once the page has lived through the aftermath. A marker found on load means
 * the last page died mid-switch, and the page opens in a lighter mode instead
 * of walking into the same crash again ("A problem repeatedly occurred").
 *
 * Pure functions over a Storage-like object: the storage can be missing or
 * throw (private mode, blocked site data), and then the guard just does nothing.
 */

export const SWITCH_MARKER_KEY = 'be:view-switch-pending';

/** How long the page must live after a switch for it to count as survived. */
export const SWITCH_SURVIVE_MS = 6000;

/** A marker older than this is a stale tab, not a crash we just recovered from. */
export const SWITCH_CRASH_WINDOW_MS = 5 * 60 * 1000;

export type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** The tab's storage, or null where it cannot be read. */
export function getMarkerStorage(): MarkerStorage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function markSwitchStart(storage: MarkerStorage | null, now: number): void {
  try {
    storage?.setItem(SWITCH_MARKER_KEY, String(now));
  } catch {
    /* storage full or blocked: the guard is best effort */
  }
}

export function clearSwitchMarker(storage: MarkerStorage | null): void {
  try {
    storage?.removeItem(SWITCH_MARKER_KEY);
  } catch {
    /* nothing to clean up */
  }
}

/**
 * True when the previous page in this tab died during a switch. Reads the
 * marker and removes it, so only the load straight after the crash is lighter.
 */
export function consumeSwitchCrash(storage: MarkerStorage | null, now: number): boolean {
  if (!storage) return false;
  let raw: string | null = null;
  try {
    raw = storage.getItem(SWITCH_MARKER_KEY);
  } catch {
    return false;
  }
  if (raw === null) return false;
  clearSwitchMarker(storage);

  const startedAt = Number(raw);
  if (!Number.isFinite(startedAt)) return false;
  const age = now - startedAt;
  return age >= 0 && age <= SWITCH_CRASH_WINDOW_MS;
}
