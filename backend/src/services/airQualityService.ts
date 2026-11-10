/**
 * Air quality around a listing — the average European AQI and PM2.5 for the
 * latest full summer and winter, so a buyer sees both the clean season and the
 * heating season (winter smog is the Balkan problem).
 *
 * Data: Copernicus Atmosphere Monitoring Service (CAMS) model data served by
 * Open-Meteo's air-quality API. It covers every coordinate, unlike the sparse
 * monitoring stations. Open-Meteo's free host is for non-commercial use; set
 * OPEN_METEO_API_KEY to use the commercial host.
 *   https://open-meteo.com/en/docs/air-quality-api
 *
 * European AQI bands: 0–20 good, 20–40 fair, 40–60 moderate, 60–80 poor,
 * 80–100 very poor, over 100 extremely poor.
 */

import axios from 'axios';
import { apiLogger } from '../utils/logger';
import { createPromiseCache } from '../utils/promiseCache';
import { describeHttpError } from '../utils/describeHttpError';
import { readStored, writeStored } from '../utils/storedCache';

export type Season = 'summer' | 'winter';

export interface SeasonWindow {
  season: Season;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
}

export interface SeasonAirQuality extends SeasonWindow {
  /** Mean hourly European AQI, or null when too little data was available. */
  aqi: number | null;
  /** Mean PM2.5 in µg/m³. */
  pm25: number | null;
}

export interface AirQualityReport {
  seasons: SeasonAirQuality[];
}

/** Thrown when the provider cannot be reached or answers with nonsense. */
export class AirQualityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AirQualityUnavailableError';
  }
}

/** A season with fewer hours of data than this share gives no average. */
export const MIN_COVERAGE = 0.5;

/** Coordinates are snapped to this grid (≈5 km); the model grid is ~10 km. */
export const GRID_DEG = 0.05;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5000;
const REQUEST_TIMEOUT_MS = 10_000;

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
/** Last day of February in `year` (UTC). */
const febEnd = (year: number) => new Date(Date.UTC(year, 2, 0)).getUTCDate();

/** The latest summer (Jun–Aug) and winter (Dec–Feb) that have fully ended by `now`. */
export const seasonWindows = (now: Date = new Date()): SeasonWindow[] => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = January
  const summerYear = month >= 8 ? year : year - 1;
  const winterEndYear = month >= 2 ? year : year - 1;
  return [
    { season: 'summer', start: isoDate(summerYear, 6, 1), end: isoDate(summerYear, 8, 31) },
    { season: 'winter', start: isoDate(winterEndYear - 1, 12, 1), end: isoDate(winterEndYear, 2, febEnd(winterEndYear)) },
  ];
};

/** Hours in an inclusive date window. */
export const hoursIn = (w: SeasonWindow): number =>
  (Date.parse(`${w.end}T00:00:00Z`) - Date.parse(`${w.start}T00:00:00Z`)) / 3_600_000 + 24;

/** Mean of the finite values, or null when they cover less than MIN_COVERAGE of `expected`. */
export const coveredMean = (values: unknown, expected: number): number | null => {
  if (!Array.isArray(values)) return null;
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0 || nums.length < expected * MIN_COVERAGE) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
};

export const snapToGrid = (value: number): number =>
  Math.round(Math.round(value / GRID_DEG) * GRID_DEG * 1000) / 1000;

const endpoint = (): { url: string; apiKey?: string } => {
  const apiKey = process.env.OPEN_METEO_API_KEY?.trim();
  return apiKey
    ? { url: 'https://customer-air-quality-api.open-meteo.com/v1/air-quality', apiKey }
    : { url: 'https://air-quality-api.open-meteo.com/v1/air-quality' };
};

const fetchSeason = async (lat: number, lng: number, w: SeasonWindow): Promise<SeasonAirQuality> => {
  const { url, apiKey } = endpoint();
  try {
    const { data } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      params: {
        latitude: lat,
        longitude: lng,
        hourly: 'european_aqi,pm2_5',
        start_date: w.start,
        end_date: w.end,
        timezone: 'GMT',
        ...(apiKey ? { apikey: apiKey } : {}),
      },
    });
    const hourly = (data as { hourly?: Record<string, unknown> } | null)?.hourly;
    if (!hourly || typeof hourly !== 'object') {
      throw new AirQualityUnavailableError('Air quality response has no hourly data');
    }
    const expected = hoursIn(w);
    return { ...w, aqi: coveredMean(hourly.european_aqi, expected), pm25: coveredMean(hourly.pm2_5, expected) };
  } catch (err: unknown) {
    if (err instanceof AirQualityUnavailableError) throw err;
    // 400 = the provider has no data for this window or place: an empty season, not an outage.
    if (axios.isAxiosError(err) && err.response?.status === 400) {
      return { ...w, aqi: null, pm25: null };
    }
    apiLogger.warn(`Air quality fetch failed for ${lat},${lng} ${w.start}..${w.end}: ${describeHttpError(err)}`);
    throw new AirQualityUnavailableError('Air quality provider unavailable');
  }
};

const cache = createPromiseCache<AirQualityReport>(CACHE_TTL_MS, CACHE_MAX_ENTRIES);

/** For tests. */
export const clearAirQualityCache = (): void => cache.clear();

/**
 * Seasonal air quality at a point. Cached per grid cell and season pair, and
 * concurrent requests for the same cell share one fetch. Failures are not cached.
 */
export const getSeasonalAirQuality = (lat: number, lng: number, now: Date = new Date()): Promise<AirQualityReport> => {
  const sLat = snapToGrid(lat);
  const sLng = snapToGrid(lng);
  const windows = seasonWindows(now);
  const key = `${sLat},${sLng},${windows.map((w) => w.start).join(',')}`;
  return cache.get(key, async () => {
    const storeKey = `air-quality:${key}`;
    const stored = await readStored<AirQualityReport>(storeKey);
    if (stored) return stored;
    const report = { seasons: await Promise.all(windows.map((w) => fetchSeason(sLat, sLng, w))) };
    // Keep it until the next season ends at the latest; a fresh pair of seasons gives a new key.
    void writeStored(storeKey, report, CACHE_TTL_MS);
    return report;
  });
};
