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
  formatPropertyPlace,
  placeSearchValue,
  type Coordinates,
} from '@/shared/geo';
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

/** Local sources answer from memory; only the geocoder needs a debounce. */
const GEOCODER_DEBOUNCE_MS = 220;
/** Nominatim rejects anything shorter. */
const MIN_GEOCODER_QUERY_LENGTH = 3;
/** Below this many local places, ask the geocoder as well. */
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
  /** Ask the geocoder for places the app does not hold itself. */
  useGeocoder?: boolean;
}

export interface UniversalSearchState {
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
  useGeocoder = true,
}: UseUniversalSearchOptions): UniversalSearchState => {
  const [geocoded, setGeocoded] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestIdRef = useRef(0);

  const refreshRecents = useCallback(() => setRecents(getRecentSearches()), []);

  useEffect(() => {
    if (enabled) refreshRecents();
  }, [enabled, refreshRecents]);

  const trimmed = query.trim();
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

  // ── Geocoder fill-in ──────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !useGeocoder || placeQuery.length < MIN_GEOCODER_QUERY_LENGTH) {
      requestIdRef.current += 1;
      setGeocoded([]);
      setIsSearching(false);
      return;
    }

    // The app's own gazetteer already answered well; a round trip would only
    // add rows nobody is going to read.
    if (localPlaces.length >= THIN_PLACE_RESULTS) {
      requestIdRef.current += 1;
      setGeocoded([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      const results = await searchLocation(placeQuery, undefined, { near, radiusKm: 100 });
      if (requestId !== requestIdRef.current) return; // Superseded.

      const known = new Set(localPlaces.map((result) => result.place.searchValue.toLowerCase()));
      const suggestions: PlaceSuggestion[] = [];

      for (const result of results) {
        const label = formatGeocodedPlace(result);
        if (!label.primary) continue;

        const value = placeSearchValue(label);
        if (known.has(value.toLowerCase())) continue;
        known.add(value.toLowerCase());

        const lat = Number.parseFloat(result.lat);
        const lng = Number.parseFloat(result.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        suggestions.push({
          id: `geocoder:${result.place_id}`,
          type: 'place',
          title: label.primary,
          subtitle: label.secondary,
          searchValue: value,
          lat,
          lng,
          zoom: result.boundingbox ? getZoomFromBoundingBox(result.boundingbox) : undefined,
          boundingbox: result.boundingbox,
          source: 'geocoder',
        });
      }

      setGeocoded(suggestions.slice(0, MAX_PLACES));
      setIsSearching(false);
    }, GEOCODER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, useGeocoder, placeQuery, localPlaces, near]);

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
      ...geocoded,
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
  }, [enabled, trimmed, parsed, recents, localPlaces, geocoded, propertyMatches]);

  const suggestions = useMemo(
    () => groups.flatMap((group) => group.suggestions),
    [groups]
  );

  return { groups, suggestions, parsed, isSearching, recents, refreshRecents };
};
