/**
 * What surrounds a home: estimated noise by day and night, how busy the
 * nearby streets are, and their shapes for the typical-traffic map. Measured
 * from the home's own pin; kept in memory and in MongoDB for 30 days.
 *
 * Map data comes from OpenFreeMap's vector tiles (~0.2 s); only when those
 * cannot be read does it fall back to Overpass (often 17–30 s).
 */

import { readStored, writeStored } from '../../utils/storedCache';
import { createPromiseCache } from '../../utils/promiseCache';
import { toSources } from './osmSources';
import { featuresAround } from './vectorTileClient';
import { tileFeaturesToSources } from './tileSources';
import { osmRoadLines, tileRoadLines, type RoadLine } from './roadLines';
import { estimateNoise, estimateTraffic, type NoiseEstimate, type TrafficEstimate } from './noiseModel';
import { OverpassUnavailableError, queryOverpass } from './overpassClient';

export interface SurroundingsReport {
  noise: NoiseEstimate;
  traffic: TrafficEstimate;
  /** Road shapes within ~600 m, for the typical-traffic map. */
  roads: RoadLine[];
}

/** The provider is unreachable; the controller answers 503. */
export { OverpassUnavailableError as SurroundingsUnavailableError };

/** How far each kind of source is looked for, in metres. */
export const SEARCH_RADII = { roads: 500, streets: 150, airports: 4000, nightlife: 150 } as const;

/** Bump when the model or query changes, so stored reports are worked out again. */
export const MODEL_VERSION = 'v4';

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

/** A failed lookup is remembered this long, so visitors cannot hammer a provider that is down. */
export const FAILURE_TTL_MS = 30_000;

const cache = createPromiseCache<SurroundingsReport>(CACHE_TTL_MS, CACHE_MAX_ENTRIES, FAILURE_TTL_MS);

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
    const home = { lat: rLat, lng: rLng };
    let sources;
    let roads: RoadLine[];
    try {
      const features = await featuresAround(rLat, rLng);
      sources = tileFeaturesToSources(features, home);
      roads = tileRoadLines(features, home);
    } catch {
      // Tiles unreadable (logged by the tile client): ask Overpass instead.
      const elements = await queryOverpass(buildOverpassQuery(rLat, rLng));
      sources = toSources(elements, home);
      roads = osmRoadLines(elements, home);
    }
    const report: SurroundingsReport = { noise: estimateNoise(sources), traffic: estimateTraffic(sources), roads };
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
