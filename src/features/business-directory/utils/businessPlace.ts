import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import type { LatLng } from './travel';

/**
 * Where to put the business on the map. The owner's own pin when there is
 * one; otherwise the address looked up, and failing that the city — each
 * with how precise it is, so the map can say "approximate" honestly.
 */
export type PlacePrecision = 'pin' | 'address' | 'city';

export interface BusinessPlace {
  position: LatLng;
  precision: PlacePrecision;
}

const COUNTRY_CODES: Record<string, string> = {
  albania: 'al', 'bosnia and herzegovina': 'ba', bosnia: 'ba', bulgaria: 'bg', croatia: 'hr', greece: 'gr',
  kosovo: 'xk', montenegro: 'me', 'north macedonia': 'mk', macedonia: 'mk', romania: 'ro', serbia: 'rs',
};

/** "Albania" → "al", for narrowing the address search; null for anywhere else. */
export const countryCodeFor = (country: string | undefined): string | null =>
  (country && COUNTRY_CODES[country.trim().toLowerCase()]) || null;

/** The owner's pin, when it is a real coordinate. */
export function pinnedPlace(l: Pick<BusinessListing, 'latitude' | 'longitude'>): BusinessPlace | null {
  const { latitude: lat, longitude: lng } = l;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { position: { lat: lat!, lng: lng! }, precision: 'pin' };
}

/** What to search for, most precise first: the street address, then the city. */
export function placeQueries(l: Pick<BusinessListing, 'address' | 'city' | 'country'>): Array<{ query: string; precision: PlacePrecision }> {
  const queries: Array<{ query: string; precision: PlacePrecision }> = [];
  const address = l.address?.trim();
  if (address && address.length >= 3) queries.push({ query: address, precision: 'address' });
  if (l.city?.trim()) queries.push({ query: [l.city.trim(), l.country?.trim()].filter(Boolean).join(', '), precision: 'city' });
  return queries;
}

/** How big an area to draw around an approximate place, in metres. */
export const APPROXIMATE_RADIUS_M: Record<PlacePrecision, number> = { pin: 18, address: 90, city: 900 };
