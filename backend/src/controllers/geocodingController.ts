import { Request, Response } from 'express';
import { geocodingLogger } from '../utils/logger';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search?';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse?';
const BALKAN_COUNTRY_CODES = 'gr,al,mk,bg,xk,rs,me,ba,hr,ro';
const NOMINATIM_HEADERS = { 'User-Agent': 'BalkanEstate/1.0' }; // Nominatim requires a User-Agent

const RESULT_LIMIT = 10;
/** Nominatim rejects `countrycodes` values that aren't two-letter codes. */
const COUNTRY_CODE_PATTERN = /^[a-z]{2}$/;

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  [key: string]: unknown;
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const readNumber = (value: unknown): number | undefined => {
  const parsed = Number(readString(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Bounding box around a point, in the `left,top,right,bottom` order Nominatim
 * expects. Used to pull results towards the city the seller picked instead of
 * ranking them by global importance.
 */
const buildViewbox = (lat: number, lon: number, radiusKm: number): string => {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return [lon - lonDelta, lat + latDelta, lon + lonDelta, lat - latDelta]
    .map((value) => value.toFixed(6))
    .join(',');
};

const queryNominatim = async (params: URLSearchParams): Promise<NominatimResult[]> => {
  const response = await fetch(`${NOMINATIM_BASE_URL}${params.toString()}`, { headers: NOMINATIM_HEADERS });
  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.statusText}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as NominatimResult[]) : [];
};

/**
 * Fold a name to a matching key: lowercase, no diacritics, no punctuation.
 *
 * Mirrors the client's `foldText` (`src/shared/search/text.ts`) closely
 * enough for ranking. The client does the authoritative folding for display
 * and matching; this exists so the proxy can order and de-duplicate what it
 * hands back rather than passing Nominatim's global-importance order
 * straight through.
 */
const foldName = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đð]/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Place types worth showing above a road or a shop with the same name. */
const SETTLEMENT_TYPES = new Set([
  'country', 'state', 'region', 'county', 'city', 'town', 'village', 'hamlet',
  'suburb', 'neighbourhood', 'municipality', 'island', 'locality',
]);

/**
 * How well a result answers the query.
 *
 * Nominatim ranks by global importance, which is why a query for a Balkan
 * village loses to a same-named street in a bigger country. Ranking by name
 * match first — exact, then prefix, then anything else — puts the place the
 * user typed at the top, and settlements ahead of streets when the names
 * tie.
 */
const scoreResult = (result: NominatimResult, foldedQuery: string): number => {
  const name = foldName(String(result.display_name).split(',')[0] ?? '');

  let score = 0;
  if (name === foldedQuery) score += 1000;
  else if (name.startsWith(foldedQuery)) score += 700;
  else if (name.includes(foldedQuery)) score += 400;

  if (SETTLEMENT_TYPES.has(String(result.type))) score += 120;
  if (result.class === 'place') score += 60;

  // Importance still breaks ties between two equally good name matches.
  const importance = typeof result.importance === 'number' ? result.importance : 0;
  return score + importance * 50;
};

/**
 * Collapse rows that are the same place seen twice.
 *
 * Nominatim regularly returns a settlement as both a node and an
 * administrative boundary; they carry the same name and sit within a few
 * hundred metres of each other, and one of them is noise in a suggestion
 * list.
 */
const dedupeResults = (results: NominatimResult[]): NominatimResult[] => {
  const kept: NominatimResult[] = [];

  for (const result of results) {
    const name = foldName(String(result.display_name).split(',')[0] ?? '');
    const lat = Number(result.lat);
    const lon = Number(result.lon);

    const isDuplicate = kept.some((other) => {
      if (foldName(String(other.display_name).split(',')[0] ?? '') !== name) return false;
      const dLat = Math.abs(Number(other.lat) - lat);
      const dLon = Math.abs(Number(other.lon) - lon);
      // ~2km at Balkan latitudes: the same settlement, not two of them.
      return dLat < 0.02 && dLon < 0.02;
    });

    if (!isDuplicate) kept.push(result);
  }

  return kept;
};

// @desc    Search locations using Nominatim (proxy to avoid CORS)
// @route   GET /api/geocoding/search
// @access  Public
export const searchLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = readString(req.query.query);

    if (!query || query.length < 3) {
      res.json([]);
      return;
    }

    // Restricting to the selected country removes the single biggest source of
    // noise: the same village name repeated across ten Balkan countries.
    const requestedCode = readString(req.query.countryCode)?.toLowerCase();
    const countryCodes =
      requestedCode && COUNTRY_CODE_PATTERN.test(requestedCode) ? requestedCode : BALKAN_COUNTRY_CODES;

    const lat = readNumber(req.query.lat);
    const lon = readNumber(req.query.lon);
    const radiusKm = readNumber(req.query.radiusKm) ?? 50;

    const baseParams = {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: String(RESULT_LIMIT),
      countrycodes: countryCodes,
    };

    geocodingLogger.info('Geocoding search for:', query);

    let results: NominatimResult[] = [];

    // Pass 1: bounded to the area around the chosen city, so small local places
    // outrank globally "important" matches with the same name.
    if (lat !== undefined && lon !== undefined) {
      results = await queryNominatim(
        new URLSearchParams({
          ...baseParams,
          viewbox: buildViewbox(lat, lon, radiusKm),
          bounded: '1',
        })
      );
    }

    // Pass 2: unbounded within the country, to fill out a thin local result set.
    if (results.length < RESULT_LIMIT) {
      const seen = new Set(results.map((result) => result.place_id));
      const wider = await queryNominatim(new URLSearchParams(baseParams));
      for (const result of wider) {
        if (seen.has(result.place_id)) continue;
        seen.add(result.place_id);
        results.push(result);
      }
    }

    // Ordered by how well each row answers the query, not by how important
    // the place is in the world, and with each place named only once.
    const foldedQuery = foldName(query);
    const ranked = dedupeResults(results).sort(
      (a, b) => scoreResult(b, foldedQuery) - scoreResult(a, foldedQuery)
    );

    res.json(ranked.slice(0, RESULT_LIMIT));
  } catch (error: any) {
    geocodingLogger.error('Geocoding search error:', error);
    res.status(500).json({ message: 'Error searching location' });
  }
};

// @desc    Reverse geocode coordinates to address using Nominatim
// @route   GET /api/geocoding/reverse
// @access  Public
export const reverseGeocode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
      res.status(400).json({ message: 'Latitude and longitude are required' });
      return;
    }

    const params = new URLSearchParams({
      lat: lat,
      lon: lon,
      format: 'json',
      addressdetails: '1',
      zoom: '18', // Higher zoom = more detailed address
    });

    geocodingLogger.info('Reverse geocoding for:', lat, lon);

    const response = await fetch(`${NOMINATIM_REVERSE_URL}${params.toString()}`, {
      headers: NOMINATIM_HEADERS,
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    geocodingLogger.error('Reverse geocoding error:', error);
    res.status(500).json({ message: 'Error reverse geocoding location' });
  }
};
