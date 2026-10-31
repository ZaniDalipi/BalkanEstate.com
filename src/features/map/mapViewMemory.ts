/**
 * Where a search map was left, per history entry.
 *
 * Opening a listing from the map (or the list beside it) and pressing back
 * should land on the same view the user left — not their GPS position, not
 * the city in the URL — with the listing they opened in focus. Each history
 * entry gets its own record, keyed by React Router's entry key, so going back
 * restores exactly that entry's view while a fresh visit to the search page
 * (a new entry) still starts from the usual place.
 *
 * Kept in sessionStorage so it survives the search page unmounting, and a
 * reload of the same entry, but not a new tab.
 */

export interface SavedMapView {
  lat: number;
  lng: number;
  zoom: number;
  /** The listing opened from this view, focused again on return. */
  openedPropertyId?: string;
}

const STORAGE_KEY = 'be:mapViews';
/** Enough for a long back stack; older entries are dropped first. */
const MAX_ENTRIES = 30;

type Store = Record<string, SavedMapView>;

/** The current history entry: its path plus React Router's per-entry key. */
function currentEntryKey(): string {
  const routerKey = (window.history.state as { key?: string } | null)?.key ?? 'default';
  return `${window.location.pathname}#${routerKey}`;
}

function readStore(): Store {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    const keys = Object.keys(store);
    // Insertion order is the age order: re-saved entries are moved to the end.
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
      delete store[key];
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked — the map just won't be restored.
  }
}

function isValid(view: unknown): view is SavedMapView {
  const v = view as SavedMapView | null;
  return !!v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && Number.isFinite(v.zoom);
}

/** The view saved for the current history entry, if the user has been here before. */
export function readMapView(): SavedMapView | null {
  const view = readStore()[currentEntryKey()];
  return isValid(view) ? view : null;
}

/** Record where the map is now, for the current history entry. */
export function saveMapView(lat: number, lng: number, zoom: number): void {
  const store = readStore();
  const key = currentEntryKey();
  const previous = store[key];
  delete store[key];
  store[key] = { lat, lng, zoom, openedPropertyId: previous?.openedPropertyId };
  writeStore(store);
}

/**
 * Note that a listing is being opened from the current page. Call it just
 * before navigating to the listing; it only sticks when this page has a map
 * view to return to, so callers outside the search maps need not care.
 */
export function rememberOpenedProperty(propertyId: string): void {
  const store = readStore();
  const key = currentEntryKey();
  if (!isValid(store[key])) return;
  store[key] = { ...store[key], openedPropertyId: propertyId };
  writeStore(store);
}

/** Forget the opened listing once it has been focused again. */
export function clearOpenedProperty(): void {
  const store = readStore();
  const key = currentEntryKey();
  if (!store[key]?.openedPropertyId) return;
  store[key] = { ...store[key], openedPropertyId: undefined };
  writeStore(store);
}
