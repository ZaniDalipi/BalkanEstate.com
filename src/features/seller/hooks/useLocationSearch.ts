import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchLocation } from '@/services/osmService';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import {
  canonicalPlaceName,
  formatGeocodedPlace,
  formatPlace,
  formatPlaceLabel,
  haversineDistanceKm,
  isPlaceInCoverage,
  normalizePlaceName,
  searchLocalities,
  type Coordinates,
} from '@/shared/geo';
import {
  createSessionToken,
  fetchPlacePredictions,
  isPlacesAvailable,
  resolvePlaceDetails,
} from '@/shared/places';

/**
 * Location search for the listing map picker.
 *
 * Three sources, best-first, merged and de-duplicated:
 *   1. the curated Balkan locality gazetteer — instant, offline, and the only
 *      source guaranteed to know the villages this app lists in;
 *   2. Google Places autocomplete — broad coverage, biased to the chosen city;
 *   3. the Nominatim proxy — the fallback when no Places key is configured.
 *
 * Sources 2 and 3 are unreliable by nature (quota, network, missing key), so
 * every one of them resolves to `[]` on failure and the merge simply carries
 * on with whatever came back.
 */

export type SuggestionSource = 'local' | 'google' | 'osm';

export interface LocationSuggestion {
  id: string;
  /** Primary line — the place name. */
  title: string;
  /** Secondary line — administrative context. */
  subtitle: string;
  source: SuggestionSource;
  /** Known up front for local and OSM results; resolved on demand for Google. */
  lat?: number;
  lng?: number;
  placeId?: string;
  distanceKm?: number;
}

export interface ResolvedLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface UseLocationSearchOptions {
  country?: string;
  city?: string;
  /** Centre the search is biased towards, and measured from. */
  cityCentre?: Coordinates | null;
}

export const MIN_QUERY_LENGTH = 2;
/** Nominatim rejects anything shorter, so it only joins in from 3 characters. */
const MIN_OSM_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;
/** Below this many hits, bring in the slower fallback source. */
const THIN_RESULTS_THRESHOLD = 4;

/**
 * How far around the selected city the geocoders are told to look first.
 *
 * A bias, never a limit: results outside it still come back and are still
 * selectable. It exists only so that typing "Riviera" while listing in Vlorë
 * surfaces the Albanian coast before a same-named street elsewhere.
 */
const SEARCH_BIAS_RADIUS_KM = 100;

const countryCodeByName = new Map(
  BALKAN_LOCATIONS.map((country) => [normalizePlaceName(country.name), country.code])
);

export const getCountryCode = (country?: string | null): string | undefined =>
  country ? countryCodeByName.get(normalizePlaceName(country)) : undefined;

/**
 * Two same-named places closer together than this are the same settlement seen
 * through two sources; further apart they are genuinely different places (Zaton
 * near Dubrovnik and Zaton near Šibenik, for instance).
 */
const NEAR_DUPLICATE_KM = 5;

/**
 * Collapse the same place arriving from more than one source.
 *
 * Sources are appended best-first, so the survivor of each collision is the
 * curated entry over a Google prediction over a raw geocoder row. A Google
 * prediction carries no coordinates, so a name collision with something already
 * kept is always treated as a duplicate — which is the common case and keeps
 * the better-labelled entry.
 */
const dedupe = (suggestions: LocationSuggestion[]): LocationSuggestion[] => {
  const keptByName = new Map<string, LocationSuggestion[]>();
  const result: LocationSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = normalizePlaceName(suggestion.title);
    const kept = keptByName.get(key);

    if (kept?.length) {
      const hasCoordinates = Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng);
      const isDistinctPlace =
        hasCoordinates &&
        kept.every((other) => {
          if (!Number.isFinite(other.lat) || !Number.isFinite(other.lng)) return false;
          const distanceKm = haversineDistanceKm(
            { lat: other.lat as number, lng: other.lng as number },
            { lat: suggestion.lat as number, lng: suggestion.lng as number }
          );
          return distanceKm > NEAR_DUPLICATE_KM;
        });

      if (!isDistinctPlace) continue;
      kept.push(suggestion);
    } else {
      keptByName.set(key, [suggestion]);
    }

    result.push(suggestion);
  }

  return result;
};

export const useLocationSearch = ({
  country,
  city,
  cityCentre,
}: UseLocationSearchOptions) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // A Places session token groups a run of keystrokes with the detail lookup
  // that follows into a single billed session. It is consumed on select.
  const sessionTokenRef = useRef<unknown>(undefined);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestIdRef = useRef(0);

  const countryCode = getCountryCode(country);
  const centreLat = cityCentre?.lat;
  const centreLng = cityCentre?.lng;

  const centre = useMemo<Coordinates | null>(
    () => (Number.isFinite(centreLat) && Number.isFinite(centreLng)
      ? { lat: centreLat as number, lng: centreLng as number }
      : null),
    [centreLat, centreLng]
  );

  const gather = useCallback(
    async (trimmedQuery: string): Promise<LocationSuggestion[]> => {
      const localMatches = searchLocalities(trimmedQuery, {
        country,
        city,
        near: centre,
        maxResults: 5,
      });

      // Every suggestion is written against the city the seller picked, so a
      // village 45km down the coast still reads "Himarë, Vlorë, Albania" —
      // the address agrees with the city the listing is filed under.
      const context = { city, country };

      const results: LocationSuggestion[] = localMatches.map((match) => ({
        id: `local:${match.country}:${match.city}:${match.name}`,
        title: canonicalPlaceName(match.name),
        subtitle: formatPlace(match, { context }).secondary,
        source: 'local',
        lat: match.lat,
        lng: match.lng,
        distanceKm: match.distanceKm,
      }));

      if (isPlacesAvailable()) {
        if (!sessionTokenRef.current) sessionTokenRef.current = createSessionToken();

        const predictions = await fetchPlacePredictions(trimmedQuery, {
          countryCode,
          origin: centre,
          biasRadiusKm: SEARCH_BIAS_RADIUS_KM,
          sessionToken: sessionTokenRef.current,
        });

        for (const prediction of predictions) {
          // A seller cannot file a listing outside the countries the app
          // covers, so a pin outside them is a dead end.
          const predictionCountry = prediction.subtitle.split(',').pop()?.trim();
          if (!isPlaceInCoverage(predictionCountry)) continue;

          const label = formatPlaceLabel({ name: prediction.title }, { context });
          results.push({
            id: `google:${prediction.placeId}`,
            title: label.primary,
            subtitle: label.secondary,
            source: 'google',
            placeId: prediction.placeId,
            distanceKm: prediction.distanceKm,
          });
        }
      }

      if (results.length < THIN_RESULTS_THRESHOLD && trimmedQuery.length >= MIN_OSM_QUERY_LENGTH) {
        const osmResults = await searchLocation(trimmedQuery, countryCode, {
          near: centre,
          radiusKm: SEARCH_BIAS_RADIUS_KM,
        });

        for (const result of osmResults) {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const distanceKm = centre ? haversineDistanceKm(centre, { lat, lng }) : undefined;

          // Named the same way as every other place in the app: local
          // spelling, no postcode, no repeated municipality.
          const label = formatGeocodedPlace(result, { context });
          if (!isPlaceInCoverage(result.address?.country)) continue;

          results.push({
            id: `osm:${result.place_id}`,
            title: label.primary,
            subtitle: label.secondary,
            source: 'osm',
            lat,
            lng,
            distanceKm,
          });
        }
      }

      return dedupe(results).slice(0, MAX_SUGGESTIONS);
    },
    [country, city, centre, countryCode]
  );

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      requestIdRef.current += 1; // Cancel any in-flight run.
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const results = await gather(trimmedQuery);
      if (requestId !== requestIdRef.current) return; // Superseded.
      setSuggestions(results);
      setIsSearching(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, gather]);

  /**
   * Turn a suggestion into concrete coordinates and the address to store.
   *
   * The address is the suggestion's own label — "Himarë, Vlorë, Albania" —
   * and not the provider's formatted address, which arrives in whatever shape
   * that provider prefers (Google's own, with a postcode and a county). One
   * shape everywhere is the point: what the seller read in the list is what
   * the listing is filed under.
   *
   * Google predictions carry no geometry, so they are resolved here; local and
   * OSM suggestions already have theirs and resolve without a round trip.
   */
  const resolveSuggestion = useCallback(
    async (suggestion: LocationSuggestion): Promise<ResolvedLocation | null> => {
      const address = [suggestion.title, suggestion.subtitle].filter(Boolean).join(', ');

      if (suggestion.placeId) {
        const place = await resolvePlaceDetails(suggestion.placeId, sessionTokenRef.current);
        // The token is spent once a detail lookup uses it; the next keystroke
        // starts a new session.
        sessionTokenRef.current = undefined;

        if (place) return { lat: place.lat, lng: place.lng, address };
        // Detail lookup failed — fall through to any stored geometry below.
      }

      if (!Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lng)) return null;
      return { lat: suggestion.lat as number, lng: suggestion.lng as number, address };
    },
    []
  );

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setSuggestions([]);
    setIsSearching(false);
  }, []);

  return { query, setQuery, suggestions, isSearching, resolveSuggestion, reset };
};
