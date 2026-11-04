/**
 * Pure helpers for the map spotlight (details, route, ask).
 */
import { validateCoordinates } from '@/shared/utils/validation';

export type TravelMode = 'driving' | 'walking' | 'transit';
export const TRAVEL_MODES: readonly TravelMode[] = ['driving', 'walking', 'transit'];

export interface LatLng { lat: number; lng: number }

export function isValidLatLng(p: Partial<LatLng> | null | undefined): p is LatLng {
  return !!p && typeof p.lat === 'number' && typeof p.lng === 'number' && validateCoordinates(p.lat, p.lng).isValid;
}

/** Great-circle distance in metres (haversine). */
export function straightLineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "850 m", "3.2 km", "42 km". */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/** Whole hours and minutes, at least one minute. */
export function splitDuration(seconds: number): { hours: number; minutes: number } {
  const total = Math.max(1, Math.round((Number.isFinite(seconds) ? seconds : 0) / 60));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** A Google Maps directions link: works on every phone, with or without our map. */
export function directionsUrl(origin: LatLng | null, destination: LatLng, mode: TravelMode): string {
  const params = new URLSearchParams({ api: '1', destination: `${destination.lat},${destination.lng}`, travelmode: mode });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Price per square metre, or null when either side is missing. */
export function pricePerSquareMetre(price: unknown, area: unknown): number | null {
  if (typeof price !== 'number' || typeof area !== 'number' || price <= 0 || area <= 0) return null;
  return Math.round(price / area);
}
