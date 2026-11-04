/**
 * Getting from the visitor to the business: straight-line distance, readable
 * distances and durations (in the reader's language via Intl units), and
 * hand-off links to Google and Apple Maps.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export const TRAVEL_MODES = ['car', 'foot', 'bike'] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export interface TravelRoute {
  distanceMeters: number;
  durationSeconds: number;
  path: Array<[number, number]>;
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const unit = (locale: string, u: string, value: number, digits = 0) =>
  new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short', maximumFractionDigits: digits }).format(value);

/** "850 m", "4.2 km", "38 km" — one decimal only while it still means something. */
export function formatDistance(km: number, locale = 'en'): string {
  if (km < 1) return unit(locale, 'meter', Math.max(10, Math.round((km * 1000) / 10) * 10));
  return unit(locale, 'kilometer', km, km < 10 ? 1 : 0);
}

/** "6 min", "1 hr 25 min", "3 hr". */
export function formatDuration(seconds: number, locale = 'en'): string {
  const totalMin = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return unit(locale, 'minute', m);
  return m === 0 ? unit(locale, 'hour', h) : `${unit(locale, 'hour', h)} ${unit(locale, 'minute', m)}`;
}

const GOOGLE_MODE: Record<TravelMode, string> = { car: 'driving', foot: 'walking', bike: 'bicycling' };
const APPLE_MODE: Record<TravelMode, string> = { car: 'd', foot: 'w', bike: 'd' };

const pt = (p: LatLng) => `${p.lat},${p.lng}`;

/** Turn-by-turn in Google Maps; without a start it uses the phone's own location. */
export const googleMapsDirections = (to: LatLng, mode: TravelMode, from?: LatLng | null): string =>
  `https://www.google.com/maps/dir/?api=1${from ? `&origin=${pt(from)}` : ''}&destination=${pt(to)}&travelmode=${GOOGLE_MODE[mode]}`;

/** Turn-by-turn in Apple Maps (no cycling there; it falls back to driving). */
export const appleMapsDirections = (to: LatLng, mode: TravelMode, from?: LatLng | null): string =>
  `https://maps.apple.com/?${from ? `saddr=${pt(from)}&` : ''}daddr=${pt(to)}&dirflg=${APPLE_MODE[mode]}`;

/** Round to ~10 m: same cache entry for the same trip, and the visitor's exact spot isn't kept in keys. */
export const roundPoint = (p: LatLng): LatLng => ({ lat: Math.round(p.lat * 1e4) / 1e4, lng: Math.round(p.lng * 1e4) / 1e4 });

/** Apple devices get Apple Maps first. */
export const prefersAppleMaps = (userAgent: string): boolean => /iPhone|iPad|iPod|Macintosh/.test(userAgent);
