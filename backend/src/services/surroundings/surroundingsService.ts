/**
 * What surrounds a home: estimated noise by day and night, and how busy the
 * nearby streets are. One Overpass (OpenStreetMap) query per home, measured
 * from its own pin; the answer is kept in memory and in MongoDB for 30 days.
 */

import mongoose from 'mongoose';
import SurroundingsCache from '../../models/SurroundingsCache';
import { apiLogger } from '../../utils/logger';
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
export const MODEL_VERSION = 'v2';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;

/** The home's own pin, rounded to ~1 m: distances to the street it is on stay exact. */
const roundCoord = (v: number) => Math.round(v * 100_000) / 100_000;

export const buildOverpassQuery = (lat: number, lng: number): string => {
  const at = `${lat},${lng}`;
  const { roads, streets, airports, nightlife } = SEARCH_RADII;
  return [
    // Below the client's per-mirror timeout, so a slow server says so itself.
    '[out:json][timeout:10];',
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

const dbReady = () => mongoose.connection.readyState === 1;

const readStored = async (key: string): Promise<SurroundingsReport | null> => {
  if (!dbReady()) return null;
  try {
    const doc = await SurroundingsCache.findOne({ key, expiresAt: { $gt: new Date() } }).maxTimeMS(2000).lean();
    return (doc?.report as SurroundingsReport | undefined) ?? null;
  } catch (err) {
    apiLogger.warn('Surroundings cache read failed', err);
    return null;
  }
};

const writeStored = async (key: string, report: SurroundingsReport): Promise<void> => {
  if (!dbReady()) return;
  try {
    await SurroundingsCache.updateOne(
      { key },
      { $set: { report, expiresAt: new Date(Date.now() + CACHE_TTL_MS) } },
      { upsert: true }
    );
  } catch (err) {
    apiLogger.warn('Surroundings cache write failed', err);
  }
};

const cache = createPromiseCache<SurroundingsReport>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

/** For tests. */
export const clearSurroundingsCache = (): void => cache.clear();

export const getSurroundings = (lat: number, lng: number): Promise<SurroundingsReport> => {
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  const key = `${MODEL_VERSION}:${rLat.toFixed(5)},${rLng.toFixed(5)}`;
  return cache.get(key, async () => {
    const stored = await readStored(key);
    if (stored) return stored;
    const sources = toSources(await queryOverpass(buildOverpassQuery(rLat, rLng)), { lat: rLat, lng: rLng });
    const report = { noise: estimateNoise(sources), traffic: estimateTraffic(sources) };
    void writeStored(key, report);
    return report;
  });
};
