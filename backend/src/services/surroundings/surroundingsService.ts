/**
 * What surrounds a home: estimated noise by day and night, and how busy the
 * nearby streets are. One Overpass (OpenStreetMap) query per home, measured
 * from its own pin; the answer is kept in memory and in MongoDB for 30 days.
 */

import { readStored, writeStored } from '../../utils/storedCache';
import { createPromiseCache } from '../../utils/promiseCache';
import { toSources } from './osmSources';
import { estimateNoise, estimateTraffic, type NoiseEstimate, type TrafficEstimate } from './noiseModel';
import { OverpassUnavailableError, queryOverpass } from './overpassClient';

export interface SurroundingsReport {
  noise: NoiseEstimate;
  traffic: TrafficEstimate;
}

/** The provider is unreachable; the controller answers 503. */
export { OverpassUnavailableError as SurroundingsUnavailableError };

/** How far each kind of source is looked for, in metres. */
export const SEARCH_RADII = { roads: 500, streets: 150, airports: 4000, nightlife: 150 } as const;

/** Bump when the model or query changes, so stored reports are worked out again. */
export const MODEL_VERSION = 'v3';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

/** The home's own pin, rounded to ~1 m: distances to the street it is on stay exact. */
const roundCoord = (v: number) => Math.round(v * 100_000) / 100_000;

export const buildOverpassQuery = (lat: number, lng: number): string => {
  const at = `${lat},${lng}`;
  const { roads, streets, airports, nightlife } = SEARCH_RADII;
  return [
    // Below the client's per-mirror timeout, so a slow server says so itself.
    '[out:json][timeout:40];',
    '(',
    `  way(around:${roads},${at})[highway~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$"];`,
    `  way(around:${roads},${at})[railway~"^(rail|tram|light_rail)$"];`,
    `  way(around:${streets},${at})[highway~"^(residential|unclassified|living_street)$"];`,
    ');',
    'out tags geom;',
    '(',
    `  nwr(around:${airports},${at})[aeroway=aerodrome][iata];`,
    `  nwr(around:${nightlife},${at})[amenity~"^(bar|pub|nightclub)$"];`,
    ');',
    'out tags center;',
  ].join('\n');
};

const cache = createPromiseCache<SurroundingsReport>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

/** For tests. */
export const clearSurroundingsCache = (): void => cache.clear();

/** Where a home's report is kept: model version + its pin rounded to ~1 m. */
export const surroundingsKey = (lat: number, lng: number): string =>
  `surroundings:${MODEL_VERSION}:${roundCoord(lat).toFixed(5)},${roundCoord(lng).toFixed(5)}`;

/** True when this spot's report is already worked out (memory or database). */
export const hasStoredSurroundings = async (lat: number, lng: number): Promise<boolean> =>
  (await readStored<SurroundingsReport>(surroundingsKey(lat, lng))) !== null;

export const getSurroundings = (lat: number, lng: number): Promise<SurroundingsReport> => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  const key = surroundingsKey(lat, lng);
  return cache.get(key, async () => {
    const stored = await readStored<SurroundingsReport>(key);
    if (stored) return stored;
    const sources = toSources(await queryOverpass(buildOverpassQuery(rLat, rLng)), { lat: rLat, lng: rLng });
    const report = { noise: estimateNoise(sources), traffic: estimateTraffic(sources) };
    void writeStored(key, report, CACHE_TTL_MS);
    return report;
  });
};

/** How long a page request waits for a fresh lookup before answering "pending". */
export const PAGE_WAIT_MS = 8_000;

export type SurroundingsLookup = { status: 'ok'; report: SurroundingsReport } | { status: 'pending' };

/**
 * The report if it is ready within `waitMs`, else "pending" while the lookup
 * carries on in the background (shared by every caller for the same spot, and
 * stored when it lands). A lookup that has already failed rejects, so the
 * caller can answer 503; the next request then starts a new one.
 */
export const getSurroundingsWithin = async (lat: number, lng: number, waitMs = PAGE_WAIT_MS): Promise<SurroundingsLookup> => {
  const lookup = getSurroundings(lat, lng);
  lookup.catch(() => undefined); // still running when we answer "pending"; failures are logged in the client
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pending = new Promise<SurroundingsLookup>((resolve) => {
    timer = setTimeout(() => resolve({ status: 'pending' }), waitMs);
  });
  try {
    return await Promise.race([lookup.then((report): SurroundingsLookup => ({ status: 'ok', report })), pending]);
  } finally {
    clearTimeout(timer);
  }
};
