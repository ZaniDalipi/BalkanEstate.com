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

    res.json(results.slice(0, RESULT_LIMIT));
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
