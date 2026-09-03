/**
 * Every place the app knows, in one searchable index.
 *
 * Three tiers of place live in different files for good reasons — countries
 * and cities in `BALKAN_LOCATIONS` because that is what a seller files a
 * listing under, villages and resorts in the gazetteer because Nominatim
 * cannot rank them — but a person typing into a search box does not know
 * that and should not have to. "Montenegro", "Budva" and "Bečići" are three
 * answers to the same box, told apart by their label and their icon, not by
 * which list they came from.
 *
 * The index is built once at module load: it is a few thousand short strings
 * and it never changes at runtime, so every keystroke is a synchronous scan
 * with no network in the way. That is what makes local places appear
 * instantly while the geocoder is still being asked about the rest.
 */

import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import {
  BALKAN_LOCALITIES,
  canonicalPlaceName,
  formatPlace,
  formatPlaceLabel,
  haversineDistanceKm,
  placeSearchValue,
  type Coordinates,
  type PlaceLabel,
} from '@/shared/geo';
import { createSearchIndex, type SearchResult } from '@/shared/search';

export type PlaceKind = 'country' | 'city' | 'locality';

export interface IndexedPlace {
  id: string;
  kind: PlaceKind;
  /** Local spelling, for display. */
  name: string;
  /** Stored ASCII spelling — what filters and URLs carry. */
  storedName: string;
  city?: string;
  country: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  label: PlaceLabel;
  /** What goes into the search box when this place is picked. */
  searchValue: string;
  /** Every spelling that should find this place. */
  aliases: string[];
  /** Rough map zoom for the place's size. */
  zoom: number;
}

/**
 * A country outranks a city outranks a village, all else equal — the same
 * ordering Google applies when a name is ambiguous, and the reason typing
 * "bar" offers the Montenegrin city before any beach bar.
 */
const KIND_BOOST: Record<PlaceKind, number> = {
  country: 40,
  city: 30,
  locality: 12,
};

const ZOOM_BY_KIND: Record<PlaceKind, number> = {
  country: 7,
  city: 12,
  locality: 14,
};

const buildPlaces = (): IndexedPlace[] => {
  const places: IndexedPlace[] = [];

  for (const country of BALKAN_LOCATIONS) {
    const countryName = canonicalPlaceName(country.name);
    places.push({
      id: `country:${country.code}`,
      kind: 'country',
      name: countryName,
      storedName: country.name,
      country: country.name,
      countryCode: country.code,
      label: { primary: countryName, secondary: '', full: countryName },
      searchValue: countryName,
      aliases: [country.name, country.code],
      zoom: ZOOM_BY_KIND.country,
    });

    for (const city of country.cities) {
      const label = formatPlaceLabel([city.name, country.name]);
      places.push({
        id: `city:${country.code}:${city.name}`,
        kind: 'city',
        name: label.primary,
        storedName: city.name,
        city: city.name,
        country: country.name,
        countryCode: country.code,
        lat: city.lat,
        lng: city.lng,
        label,
        searchValue: placeSearchValue(label),
        aliases: [city.name, label.primary],
        zoom: ZOOM_BY_KIND.city,
      });
    }
  }

  for (const locality of BALKAN_LOCALITIES) {
    const label = formatPlace(locality);
    places.push({
      id: `locality:${locality.country}:${locality.city}:${locality.name}`,
      kind: 'locality',
      name: label.primary,
      storedName: locality.name,
      city: locality.city,
      country: locality.country,
      lat: locality.lat,
      lng: locality.lng,
      label,
      searchValue: placeSearchValue(label),
      aliases: [locality.name, ...(locality.aliases ?? [])],
      zoom: ZOOM_BY_KIND.locality,
    });
  }

  return places;
};

export const ALL_PLACES: IndexedPlace[] = buildPlaces();

/**
 * The name is weighted far above the parent city and country, so typing
 * "budva" offers Budva itself before the twelve villages that merely sit in
 * it — while those villages still surface once the query stops matching any
 * name of their own.
 */
const placeIndex = createSearchIndex(ALL_PLACES, {
  fields: [
    { key: 'name', value: (place) => [place.name, ...place.aliases], weight: 4 },
    { key: 'city', value: (place) => place.city, weight: 1.2 },
    { key: 'country', value: (place) => place.country, weight: 0.8 },
  ],
  boost: (place) => KIND_BOOST[place.kind],
});

export interface PlaceSearchOptions {
  limit?: number;
  /** Restrict to one country, by stored name or ISO code. */
  country?: string;
  /** Bias towards this point: nearer places win ties. */
  near?: Coordinates | null;
}

export interface PlaceSearchResult {
  place: IndexedPlace;
  score: number;
  distanceKm?: number;
}

const matchesCountry = (place: IndexedPlace, country: string): boolean => {
  const wanted = country.trim().toLowerCase();
  if (!wanted || wanted === 'any') return true;
  return (
    place.country.toLowerCase() === wanted ||
    place.countryCode?.toLowerCase() === wanted ||
    place.name.toLowerCase() === wanted
  );
};

/**
 * Rank the app's own places against a query.
 * Proximity is a tiebreak, never a filter: a user searching from Tirana who
 * types "Split" means Split.
 */
export const searchPlaces = (
  query: string,
  { limit = 8, country, near }: PlaceSearchOptions = {}
): PlaceSearchResult[] => {
  // Over-fetch so that country filtering does not empty a full result set.
  const raw: SearchResult<IndexedPlace>[] = placeIndex.search(query, { limit: limit * 4 });

  const results = raw
    .filter((result) => !country || matchesCountry(result.doc, country))
    .map((result) => {
      const { lat, lng } = result.doc;
      const distanceKm =
        near && Number.isFinite(lat) && Number.isFinite(lng)
          ? haversineDistanceKm(near, { lat: lat as number, lng: lng as number })
          : undefined;

      // Worth at most ~25 points: enough to order two equally good name
      // matches, never enough to lift a weaker one above a better one.
      const proximityBoost =
        distanceKm === undefined ? 0 : Math.max(0, 25 - distanceKm / 20);

      return { place: result.doc, score: result.score + proximityBoost, distanceKm };
    });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
};

/** Look one place up by an exact (spelling-insensitive) name. */
export const findPlace = (name: string, country?: string): IndexedPlace | undefined => {
  const results = searchPlaces(name, { limit: 1, country });
  return results[0]?.place;
};
