/**
 * What surrounds a home: estimated noise by day and night, and how busy the
 * nearby streets are. One Overpass (OpenStreetMap) query per location, cached
 * for 30 days: roads and railways rarely move.
 *
 * Overpass is a shared public service: OVERPASS_URL can point at a paid or
 * self-hosted instance; the default is the main public one.
 *   https://wiki.openstreetmap.org/wiki/Overpass_API
 */

import axios from 'axios';
import { apiLogger } from '../../utils/logger';
import { createPromiseCache } from '../../utils/promiseCache';
import { toSources } from './osmSources';
import { estimateNoise, estimateTraffic, type NoiseEstimate, type TrafficEstimate } from './noiseModel';

export interface SurroundingsReport {
  noise: NoiseEstimate;
  traffic: TrafficEstimate;
}

export class SurroundingsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SurroundingsUnavailableError';
  }
}

/** How far each kind of source is looked for, in metres. */
export const SEARCH_RADII = { roads: 500, airports: 4000, nightlife: 150 } as const;

const DEFAULT_OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;
const REQUEST_TIMEOUT_MS = 25_000;

/** Coordinates rounded to ~11 m: enough for distances to a road. */
const roundCoord = (v: number) => Math.round(v * 10_000) / 10_000;

export const buildOverpassQuery = (lat: number, lng: number): string => {
  const at = `${lat},${lng}`;
  const { roads, airports, nightlife } = SEARCH_RADII;
  return [
    '[out:json][timeout:20];',
    '(',
    `  way(around:${roads},${at})[highway~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"];`,
    `  way(around:${roads},${at})[railway~"^(rail|tram|light_rail)$"];`,
    ');',
    'out tags geom;',
    '(',
    `  nwr(around:${airports},${at})[aeroway=aerodrome][iata];`,
    `  nwr(around:${nightlife},${at})[amenity~"^(bar|pub|nightclub)$"];`,
    ');',
    'out tags center;',
  ].join('\n');
};

const fetchElements = async (lat: number, lng: number): Promise<unknown[]> => {
  const url = process.env.OVERPASS_URL?.trim() || DEFAULT_OVERPASS_URL;
  try {
    const { data } = await axios.post(url, new URLSearchParams({ data: buildOverpassQuery(lat, lng) }).toString(), {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BalkanEstate Surroundings/1.0',
        Accept: 'application/json',
      },
    });
    const body = data as { elements?: unknown; remark?: unknown } | null;
    // Overpass answers 200 with a "remark" when the query ran out of time or memory.
    if (typeof body?.remark === 'string' && /error|timed out|out of memory/i.test(body.remark)) {
      throw new SurroundingsUnavailableError(`Overpass: ${body.remark}`);
    }
    if (!body || !Array.isArray(body.elements)) {
      throw new SurroundingsUnavailableError('Overpass answer has no elements');
    }
    return body.elements;
  } catch (err: unknown) {
    if (err instanceof SurroundingsUnavailableError) throw err;
    apiLogger.warn(`Overpass query failed for ${lat},${lng}`, err);
    throw new SurroundingsUnavailableError('Map data provider unavailable');
  }
};

const cache = createPromiseCache<SurroundingsReport>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

/** For tests. */
export const clearSurroundingsCache = (): void => cache.clear();

export const getSurroundings = (lat: number, lng: number): Promise<SurroundingsReport> => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  return cache.get(`${rLat},${rLng}`, async () => {
    const sources = toSources(await fetchElements(rLat, rLng), { lat: rLat, lng: rLng });
    return { noise: estimateNoise(sources), traffic: estimateTraffic(sources) };
  });
};
