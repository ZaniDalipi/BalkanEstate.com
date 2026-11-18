/**
 * Remembers that the phone "Layers are here" hint was seen, so it shows once.
 * Storage can be missing or throw (private mode, blocked site data): then the
 * hint is remembered for this page load only, and nothing ever throws.
 */
export const LAYERS_HINT_KEY = 'be.map.layersHintSeen';

type ReadStore = Pick<Storage, 'getItem'>;
type WriteStore = Pick<Storage, 'setItem'>;

let seenThisLoad = false;

export function getSafeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenLayersHint(store: ReadStore | null): boolean {
  if (seenThisLoad) return true;
  try {
    return store?.getItem(LAYERS_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLayersHintSeen(store: WriteStore | null): void {
  seenThisLoad = true;
  try {
    store?.setItem(LAYERS_HINT_KEY, '1');
  } catch {
    /* remembered for this load only */
  }
}

/** Test helper: forget the in-memory flag. */
export function resetLayersHintMemory(): void {
  seenThisLoad = false;
}
