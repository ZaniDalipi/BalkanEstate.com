import { searchPlaces } from '@/src/features/search/universal/places';
import type { Coordinates } from '@/shared/geo';

/**
 * A city from the app's own place index, ready to be offered by a map picker.
 *
 * The curated gazetteer the picker searches first only holds villages and
 * resorts; the cities a listing is filed under (Athens, Tirana, Budva…) live in
 * `BALKAN_LOCATIONS`. The site-wide search box already searches both through
 * one index, so the picker borrows that index and every place the search box
 * can find can be pinned too.
 */
export interface CityPlaceSuggestion {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  distanceKm?: number;
}

export interface CityPlaceOptions {
  /** Restrict to one country, by stored name or ISO code. Omit for all ten. */
  country?: string;
  near?: Coordinates | null;
  limit?: number;
}

/**
 * Cities matching `query`, best first.
 *
 * Countries carry no single point to drop a pin on, and villages already come
 * from the gazetteer search with richer context, so only cities are returned.
 */
export const cityPlaceSuggestions = (
  query: string,
  { country, near, limit = 5 }: CityPlaceOptions = {}
): CityPlaceSuggestion[] =>
  searchPlaces(query, { country, near, limit: limit * 3 })
    .flatMap(({ place, distanceKm }) => {
      if (place.kind !== 'city') return [];
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return [];
      return [{
        id: place.id,
        title: place.label.primary,
        subtitle: place.label.secondary,
        lat: place.lat as number,
        lng: place.lng as number,
        distanceKm,
      }];
    })
    .slice(0, limit);
