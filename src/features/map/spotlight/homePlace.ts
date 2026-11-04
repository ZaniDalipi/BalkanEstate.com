/**
 * "My place": where routes and distances start from. A per-device convenience
 * (the visitor's current position, or an address they typed), so it lives in
 * localStorage; every read is validated and every access guarded, because
 * storage can be missing, blocked or hold anything.
 */
import { isValidLatLng, type LatLng } from './spotlightUtils';

export interface HomePlace extends LatLng {
  /** What to show for it: an address, or "Current location". */
  label: string;
  source: 'gps' | 'address';
}

export const HOME_PLACE_KEY = 'be:homePlace';

export function parseHomePlace(raw: string | null): HomePlace | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<HomePlace>;
    if (!isValidLatLng(v)) return null;
    if (v.source !== 'gps' && v.source !== 'address') return null;
    const label = typeof v.label === 'string' ? v.label.trim().slice(0, 160) : '';
    return { lat: v.lat, lng: v.lng, label, source: v.source };
  } catch {
    return null;
  }
}

export function readHomePlace(): HomePlace | null {
  try {
    return parseHomePlace(window.localStorage.getItem(HOME_PLACE_KEY));
  } catch {
    return null;
  }
}

export function writeHomePlace(place: HomePlace | null): void {
  try {
    if (place) window.localStorage.setItem(HOME_PLACE_KEY, JSON.stringify(place));
    else window.localStorage.removeItem(HOME_PLACE_KEY);
  } catch {
    /* blocked storage: it just isn't remembered */
  }
}
