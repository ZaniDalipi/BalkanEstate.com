/**
 * The one search box.
 *
 * Everything the app lets a person look for answers the same box: a country,
 * a city, a village, a live listing, or a sentence describing what they want.
 * The results come back grouped and ranked, and the local ones — places and
 * listings the browser already holds — arrive on the same keystroke that
 * produced them. The geocoder is asked only when the app's own places did not
 * answer well, and its results are folded into the same list when they land.
 *
 * That ordering is the whole trick: a search box that answers instantly and
 * then quietly gets better feels like Google. One that waits 500ms for a
 * network round trip before showing anything feels like a form.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Property } from '@/types';
import { getZoomFromBoundingBox, searchLocation } from '@/services/osmService';
import {
  formatGeocodedPlace,
  formatPlaceLabel,
  formatPropertyPlace,
  placeSearchValue,
  type Coordinates,
} from '@/shared/geo';
import {
  createSessionToken,
  fetchPlacePredictions,
  isPlacesAvailable,
  resolvePlaceDetails,
} from '@/shared/places';
import { useGoogleMapLoader } from '@/src/features/map/hooks/useGoogleMapLoader';
import { getCountryCode } from '@/src/features/seller/hooks/useLocationSearch';
import { validateSearchQuery } from '@/shared/utils/validation';
import { createSearchIndex, parseSearchQuery, type ParsedQuery } from '@/shared/search';
import { searchPlaces, type IndexedPlace } from './places';
import { getRecentSearches, type RecentSearch } from './recentSearches';
import type {
  PlaceSuggestion,
  PropertySuggestion,
  QuerySuggestion,
  Suggestion,
  SuggestionGroup,
} from './types';

/** Local sources answer from memory; only the remote ones need a debounce. */
const REMOTE_DEBOUNCE_MS = 220;
/** Both Places and Nominatim reject anything shorter. */
const MIN_REMOTE_QUERY_LENGTH = 3;
/** Below this many local places, ask the remote sources as well. */
const THIN_PLACE_RESULTS = 3;

const MAX_PLACES = 5;
const MAX_PROPERTIES = 4;
const MAX_RECENTS = 4;

export interface UseUniversalSearchOptions {
  /** Live text in the box. */
  query: string;
  /** Listings to search — usually whatever the page has already loaded. */
  properties?: readonly Property[];
  /** Restrict places to one country (stored name or ISO code). */
  country?: string;
  /** Bias place ranking towards here — the map centre, or the user. */
  near?: Coordinates | null;
  /** False while the box is closed, so nothing is computed or fetched. */
  enabled?: boolean;
  /**
   * Ask Google Places, then the geocoder, for what the app's own gazetteer
   * does not hold — businesses, residences, buildings, streets.
   */
  useRemoteSources?: boolean;
}

export interface UniversalSearchState {
  /**
   * Turn a picked suggestion into coordinates.
   *
   * Google Places rows carry no geometry — fetching it is a second billed
   * call — so it is resolved here, when a row is actually chosen. Every other
   * kind of suggestion already has its coordinates and resolves without a
   * round trip. Resolves to `null` when the lookup fails, which the caller
   * reports rather than silently ignoring.
   */
  resolvePlace: (suggestion: PlaceSuggestion) => Promise<Coordinates | null>;
  /** Ranked, grouped, ready to render. */
  groups: SuggestionGroup[];
  /** The same suggestions, flat and in display order, for keyboard nav. */
  suggestions: Suggestion[];
  /** What the engine understood the query to mean. */
  parsed: ParsedQuery;
  /** True while the geocoder round trip is in flight. */
  isSearching: boolean;
  recents: RecentSearch[];
  refreshRecents: () => void;
}

/**
 * Listings are searched on the fields a person actually types: where it is,
 * what it is called, and the reference number off a flyer. The description is
 * in there at a low weight so "sea view" finds something, without letting a
 * long description outrank a title.
 */
const buildPropertyIndex = (properties: readonly Property[]) =>
  createSearchIndex(properties, {
    fields: [
      { key: 'title', value: (property) => property.title, weight: 3 },
      { key: 'address', value: (property) => property.address, weight: 2.5 },
      { key: 'city', value: (property) => property.city, weight: 2 },
      { key: 'country', value: (property) => property.country, weight: 1 },
      { key: 'reference', value: (property) => [property.propertyId, property.id], weight: 3 },
      { key: 'type', value: (property) => property.propertyType, weight: 1 },
      { key: 'amenities', value: (property) => property.amenities, weight: 0.6 },
      { key: 'description', value: (property) => property.description, weight: 0.4 },
    ],
    // A listing people look at is a listing people mean. Capped well below a
    // tier gap so popularity never outranks a better textual match.
    boost: (property) => Math.min(30, Math.log10((property.views ?? 0) + 1) * 10),
  });

const placeToSuggestion = (place: IndexedPlace, distanceKm?: number): PlaceSuggestion => ({
  id: place.id,
  type: 'place',
  title: place.label.primary,
  subtitle: place.label.secondary,
  place,
  searchValue: place.searchValue,
  lat: place.lat,
  lng: place.lng,
  zoom: place.zoom,
  source: 'local',
  distanceKm,
});

const propertyToSuggestion = (property: Property): PropertySuggestion => {
  const label = formatPropertyPlace(property);
  return {
    id: `property:${property.id}`,
    type: 'property',
    title: property.title?.trim() || label.primary || label.full,
    subtitle: label.full,
    property,
  };
};

/** A short description of what a parsed sentence will actually filter by. */
const describeIntent = (parsed: ParsedQuery): string | undefined => {
  const { intent } = parsed;
  const parts: string[] = [];

  if (intent.beds) parts.push(`${intent.beds}+ bed`);
  if (intent.baths) parts.push(`${intent.baths}+ bath`);
  if (intent.propertyType) parts.push(intent.propertyType.replace('-', ' '));
  if (intent.listingType) parts.push(`for ${intent.listingType}`);
  if (intent.minPrice && intent.maxPrice) {
    parts.push(`€${intent.minPrice.toLocaleString()}–€${intent.maxPrice.toLocaleString()}`);
  } else if (intent.maxPrice) {
    parts.push(`under €${intent.maxPrice.toLocaleString()}`);
  } else if (intent.minPrice) {
    parts.push(`over €${intent.minPrice.toLocaleString()}`);
  }
  if (intent.minSqft) parts.push(`${intent.minSqft}m²+`);
  if (intent.hasPool) parts.push('pool');
  if (intent.seaView) parts.push('sea view');
  if (intent.hasGarden) parts.push('garden');
  if (intent.hasParking) parts.push('parking');
  if (intent.furnished) parts.push('furnished');

  return parts.length > 0 ? parts.join(' · ') : undefined;
};

export const useUniversalSearch = ({
  query,
  properties = [],
  country,
  near,
  enabled = true,
  useRemoteSources = true,
}: UseUniversalSearchOptions): UniversalSearchState => {
  const [remote, setRemote] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestIdRef = useRef(0);
  // A Places session token groups a run of keystrokes with the detail lookup
  // that follows into one billed session. It is spent on select.
  const sessionTokenRef = useRef<unknown>(undefined);

  // The Places library rides on the Maps script the app already loads for its
  // maps. Asking for it here too means the box works on pages that have no
  // map — the home hero, the filter panel — and the loader is shared, so this
  // never loads the script twice.
  useGoogleMapLoader();

  const refreshRecents = useCallback(() => setRecents(getRecentSearches()), []);

  useEffect(() => {
    if (enabled) refreshRecents();
  }, [enabled, refreshRecents]);

  // The search box is a system boundary: what arrives here is raw user input
  // that goes on to a third-party API and into a saved search. It is
  // sanitised and length-capped once, here, rather than at each source.
  const trimmed = useMemo(() => validateSearchQuery(query).sanitized.trim(), [query]);
  const parsed = useMemo(() => parseSearchQuery(trimmed), [trimmed]);

  // The place-name part of the query — "villa in Budva under 300k" searches
  // places for "Budva", not for the whole sentence.
  const placeQuery = parsed.text.trim() || trimmed;

  const propertyIndex = useMemo(() => buildPropertyIndex(properties), [properties]);

  const localPlaces = useMemo(() => {
    if (!enabled || placeQuery.length < 2) return [];
    return searchPlaces(placeQuery, { limit: MAX_PLACES, country, near });
  }, [enabled, placeQuery, country, near]);

  const propertyMatches = useMemo(() => {
    if (!enabled || trimmed.length < 2) return [];
    // The full query, not just the place part: a listing can answer "3 bed
    // Budva" on its title alone.
    return propertyIndex.search(trimmed, { limit: MAX_PROPERTIES, requireAllTerms: false, minScore: 80 });
  }, [enabled, trimmed, propertyIndex]);

  /**
   * Ask the remote sources, best first, and stop as soon as one answers.
   *
   * Every provider here resolves to `[]` rather than throwing — a quota
   * error, a missing key or a dead network is a thinner suggestion list, not
   * a broken search box — so there is no try/catch at the call site and the
   * user always gets whatever did come back.
   */
  const gatherRemote = useCallback(
    async (query: string, requestId: number): Promise<PlaceSuggestion[]> => {
      const taken = new Set(localPlaces.map((result) => result.place.searchValue.toLowerCase()));

      const collect = (candidates: PlaceSuggestion[]): PlaceSuggestion[] => {
        const kept: PlaceSuggestion[] = [];
        for (const candidate of candidates) {
          const key = candidate.searchValue.toLowerCase();
          if (!candidate.title || taken.has(key)) continue;
          taken.add(key);
          kept.push(candidate);
        }
        return kept.slice(0, MAX_PLACES);
      };

      if (isPlacesAvailable()) {
        // One token groups this run of keystrokes with the detail lookup that
        // follows into a single billed session.
        if (!sessionTokenRef.current) sessionTokenRef.current = createSessionToken();

        const predictions = await fetchPlacePredictions(query, {
          countryCode: getCountryCode(country),
          origin: near,
          biasRadiusKm: 50,
          sessionToken: sessionTokenRef.current,
        });
        if (requestId !== requestIdRef.current) return [];

        const fromPlaces = collect(
          predictions.map((prediction) => {
            // Google's secondary line is already "<city>, <country>" for a
            // Balkan result, but it can run longer; the formatter trims it to
            // the app's shape rather than trusting it.
            const [city, ...rest] = prediction.subtitle.split(',').map((part) => part.trim());
            const label = formatPlaceLabel({
              name: prediction.title,
              city,
              country: rest.length > 0 ? rest[rest.length - 1] : undefined,
            });

            return {
              id: `places:${prediction.placeId}`,
              type: 'place' as const,
              title: label.primary,
              subtitle: label.secondary,
              searchValue: label.full,
              placeId: prediction.placeId,
              // Coordinates cost a second billed call, so they are resolved
              // when the row is picked, not when it is shown.
              source: 'places' as const,
              distanceKm: prediction.distanceKm,
            };
          })
        );

        if (fromPlaces.length > 0) return fromPlaces;
      }

      const results = await searchLocation(query, undefined, { near, radiusKm: 100 });
      if (requestId !== requestIdRef.current) return [];

      return collect(
        results.flatMap((result) => {
          const label = formatGeocodedPlace(result);
          const lat = Number.parseFloat(result.lat);
          const lng = Number.parseFloat(result.lon);
          if (!label.primary || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];

          return [{
            id: `geocoder:${result.place_id}`,
            type: 'place' as const,
            title: label.primary,
            subtitle: label.secondary,
            searchValue: placeSearchValue(label),
            lat,
            lng,
            zoom: result.boundingbox ? getZoomFromBoundingBox(result.boundingbox) : undefined,
            boundingbox: result.boundingbox,
            source: 'geocoder' as const,
          }];
        })
      );
    },
    [localPlaces, country, near]
  );

  // ── Remote fill-in: Google Places, then the geocoder ──────────────────
  /**
   * What the app's own gazetteer cannot know.
   *
   * The gazetteer holds countries, cities and villages; it does not hold
   * businesses, residences or buildings, and those are exactly what people
   * type — "MOA Residence", "Rolling Hills", a hotel name. Google Places
   * indexes them, and is the same source Google Maps' own search box uses,
   * so it runs first. The Nominatim proxy stays as the fallback for
   * installations with no Maps key.
   *
   * Both are asked only when the local sources came back thin, which keeps a
   * search for a city that the app already knows off the network — and, for
   * Places, off the bill.
   */
  useEffect(() => {
    const cancel = () => {
      requestIdRef.current += 1;
      setRemote([]);
      setIsSearching(false);
    };

    if (!enabled || !useRemoteSources || placeQuery.length < MIN_REMOTE_QUERY_LENGTH) return cancel();
    // The app's own gazetteer already answered well; a round trip would only
    // add rows nobody is going to read.
    if (localPlaces.length >= THIN_PLACE_RESULTS) return cancel();

    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const suggestions = await gatherRemote(placeQuery, requestId);
      if (requestId !== requestIdRef.current) return; // Superseded.

      setRemote(suggestions);
      setIsSearching(false);
    }, REMOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, useRemoteSources, placeQuery, localPlaces, gatherRemote]);

  // ── Assembly ──────────────────────────────────────────────────────────
  const groups = useMemo<SuggestionGroup[]>(() => {
    if (!enabled) return [];

    // Nothing typed: offer what was searched before, the way Google does on
    // focus. Anything else here would be a guess.
    if (!trimmed) {
      if (recents.length === 0) return [];
      return [
        {
          labelKey: 'search:suggestions.recent',
          suggestions: recents.slice(0, MAX_RECENTS).map((entry, index) => ({
            id: `recent:${index}:${entry.text}`,
            type: 'recent' as const,
            title: entry.text,
            text: entry.text,
          })),
        },
      ];
    }

    const assembled: SuggestionGroup[] = [];

    // Row one is always the query itself. It is what Enter does, so it has to
    // be visible and selectable — and when the sentence was understood, it
    // says so, which is how the user learns the box reads sentences at all.
    const intentSummary = describeIntent(parsed);
    const runQuery: QuerySuggestion = {
      id: `query:${trimmed}`,
      type: 'query',
      title: trimmed,
      subtitle: intentSummary,
      text: trimmed,
      intent: parsed.hasIntent ? parsed.intent : undefined,
    };
    assembled.push({ labelKey: '', suggestions: [runQuery] });

    const places: Suggestion[] = [
      ...localPlaces.map((result) => placeToSuggestion(result.place, result.distanceKm)),
      ...remote,
    ].slice(0, MAX_PLACES);

    if (places.length > 0) {
      assembled.push({ labelKey: 'search:suggestions.places', suggestions: places });
    }

    if (propertyMatches.length > 0) {
      assembled.push({
        labelKey: 'search:suggestions.listings',
        suggestions: propertyMatches.map((result) => propertyToSuggestion(result.doc)),
      });
    }

    return assembled;
  }, [enabled, trimmed, parsed, recents, localPlaces, remote, propertyMatches]);

  const resolvePlace = useCallback(
    async (suggestion: PlaceSuggestion): Promise<Coordinates | null> => {
      if (suggestion.placeId) {
        const place = await resolvePlaceDetails(suggestion.placeId, sessionTokenRef.current);
        // The token is spent once a detail lookup uses it; the next keystroke
        // starts a new session.
        sessionTokenRef.current = undefined;
        if (place) return { lat: place.lat, lng: place.lng };
        // The lookup failed — fall through to any geometry the row carries.
      }

      if (!Number.isFinite(suggestion.lat) || !Number.isFinite(suggestion.lng)) return null;
      return { lat: suggestion.lat as number, lng: suggestion.lng as number };
    },
    []
  );

  const suggestions = useMemo(
    () => groups.flatMap((group) => group.suggestions),
    [groups]
  );

  return { groups, suggestions, parsed, isSearching, recents, refreshRecents, resolvePlace };
};
