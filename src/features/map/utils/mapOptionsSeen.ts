/**
 * Remembers that the phone "Map options" button has been opened, so its
 * attention pulse stops for good. Storage can be missing or throw (private
 * mode, blocked site data): then it is remembered for this page load only,
 * and nothing ever throws.
 */
export const MAP_OPTIONS_SEEN_KEY = 'be.map.optionsSeen';

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

export function hasOpenedMapOptions(store: ReadStore | null): boolean {
  if (seenThisLoad) return true;
  try {
    return store?.getItem(MAP_OPTIONS_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markMapOptionsOpened(store: WriteStore | null): void {
  seenThisLoad = true;
  try {
    store?.setItem(MAP_OPTIONS_SEEN_KEY, '1');
  } catch {
    /* remembered for this load only */
  }
}

/** Test helper: forget the in-memory flag. */
export function resetMapOptionsMemory(): void {
  seenThisLoad = false;
}
