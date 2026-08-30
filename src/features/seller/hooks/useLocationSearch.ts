import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { searchLocation } from '@/services/osmService';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import {
  haversineDistanceKm,
  normalizePlaceName,
  searchLocalities,
  type Coordinates,
} from '@/shared/geo';
import {
  createSessionToken,
  fetchPlacePredictions,
  isPlacesAvailable,
  resolvePlaceDetails,
} from '../api/placesAutocomplete';

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
  /** Allowed distance from `cityCentre`; results beyond it are dropped. */
  radiusKm?: number;
  /** Admin mode — keep results regardless of how far from the city they are. */
  allowOutsideCityArea?: boolean;
}

export const MIN_QUERY_LENGTH = 2;
/** Nominatim rejects anything shorter, so it only joins in from 3 characters. */
const MIN_OSM_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 8;
/** Below this many hits, bring in the slower fallback source. */
const THIN_RESULTS_THRESHOLD = 4;

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

/** Split a Nominatim `display_name` into a name line and a context line. */
const splitDisplayName = (displayName: string): { title: string; subtitle: string } => {
  const [first, ...rest] = displayName.split(',').map((part) => part.trim());
  return { title: first ?? displayName, subtitle: rest.join(', ') };
};

export const useLocationSearch = ({
  country,
  city,
  cityCentre,
  radiusKm,
  allowOutsideCityArea = false,
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

  /** Distance limit actually applied to results, or `undefined` for none. */
  const limitKm = !allowOutsideCityArea && centre && radiusKm ? radiusKm : undefined;

  const gather = useCallback(
    async (trimmedQuery: string): Promise<LocationSuggestion[]> => {
      const localMatches = searchLocalities(trimmedQuery, {
        country,
        city,
        near: centre,
        maxDistanceKm: limitKm,
        maxResults: 5,
      });

      const results: LocationSuggestion[] = localMatches.map((match) => ({
        id: `local:${match.country}:${match.city}:${match.name}`,
        title: match.name,
        subtitle: [match.city, match.country].filter(Boolean).join(', '),
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
          biasRadiusKm: radiusKm,
          sessionToken: sessionTokenRef.current,
        });

        for (const prediction of predictions) {
          // Google reports the distance from `origin`; when it is missing we
          // keep the prediction and re-check once its coordinates resolve.
          if (limitKm !== undefined && prediction.distanceKm !== undefined && prediction.distanceKm > limitKm) {
            continue;
          }
          results.push({
            id: `google:${prediction.placeId}`,
            title: prediction.title,
            subtitle: prediction.subtitle,
            source: 'google',
            placeId: prediction.placeId,
            distanceKm: prediction.distanceKm,
          });
        }
      }

      if (results.length < THIN_RESULTS_THRESHOLD && trimmedQuery.length >= MIN_OSM_QUERY_LENGTH) {
        const osmResults = await searchLocation(trimmedQuery, countryCode, { near: centre, radiusKm });

        for (const result of osmResults) {
          const lat = parseFloat(result.lat);
          const lng = parseFloat(result.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

          const distanceKm = centre ? haversineDistanceKm(centre, { lat, lng }) : undefined;
          if (limitKm !== undefined && distanceKm !== undefined && distanceKm > limitKm) continue;

          const { title, subtitle } = splitDisplayName(result.display_name);
          results.push({
            id: `osm:${result.place_id}`,
            title,
            subtitle,
            source: 'osm',
            lat,
            lng,
            distanceKm,
          });
        }
      }

      return dedupe(results).slice(0, MAX_SUGGESTIONS);
    },
    [country, city, centre, countryCode, radiusKm, limitKm]
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
   * Turn a suggestion into concrete coordinates.
   * Google predictions carry no geometry, so they are resolved here; local and
   * OSM suggestions already have theirs and resolve without a round trip.
   */
  const resolveSuggestion = useCallback(
    async (suggestion: LocationSuggestion): Promise<ResolvedLocation | null> => {
      const label = [suggestion.title, suggestion.subtitle].filter(Boolean).join(', ');

      if (suggestion.placeId) {
        const place = await resolvePlaceDetails(suggestion.placeId, sessionTokenRef.current);
        // The token is spent once a detail lookup uses it; the next keystroke
        // starts a new session.
        sessionTokenRef.current = undefined;

        if (place) {
          return { lat: place.lat, lng: place.lng, address: place.formattedAddress || label };
        }
        // Detail lookup failed — fall through to any stored geometry below.
      }

      if (!Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lng)) return null;
      return { lat: suggestion.lat as number, lng: suggestion.lng as number, address: label };
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
