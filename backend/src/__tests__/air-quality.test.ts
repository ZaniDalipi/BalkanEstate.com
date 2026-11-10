/**
 * Seasonal air quality — season windows, averaging, caching, and the
 * `GET /properties/:id/air-quality` endpoint with the provider mocked.
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { AxiosError, type AxiosResponse } from 'axios';
import mongoose from 'mongoose';
import Property from '../models/Property';
import { getPropertyAirQuality } from '../controllers/propertyController';
import {
  clearAirQualityCache,
  coveredMean,
  getSeasonalAirQuality,
  hoursIn,
  seasonWindows,
  snapToGrid,
} from '../services/airQualityService';

const hourly = (aqi: number, pm25: number, hours = 2208) => ({
  data: {
    hourly: {
      time: Array.from({ length: hours }, (_, i) => String(i)),
      european_aqi: Array.from({ length: hours }, () => aqi),
      pm2_5: Array.from({ length: hours }, () => pm25),
    },
  },
}) as unknown as AxiosResponse;

let getSpy: jest.SpyInstance;
beforeEach(() => {
  clearAirQualityCache();
  getSpy = jest.spyOn(axios, 'get');
});
afterEach(() => getSpy.mockRestore());

describe('seasonWindows', () => {
  it('picks this year\'s summer once it has ended, and the last full winter', () => {
    expect(seasonWindows(new Date('2026-11-10T00:00:00Z'))).toEqual([
      { season: 'summer', start: '2026-06-01', end: '2026-08-31' },
      { season: 'winter', start: '2025-12-01', end: '2026-02-28' },
    ]);
  });

  it('falls back a year while a season is still running', () => {
    expect(seasonWindows(new Date('2026-01-15T00:00:00Z'))).toEqual([
      { season: 'summer', start: '2025-06-01', end: '2025-08-31' },
      { season: 'winter', start: '2024-12-01', end: '2025-02-28' },
    ]);
  });

  it('ends a leap-year winter on 29 February', () => {
    expect(seasonWindows(new Date('2028-04-01T00:00:00Z'))[1].end).toBe('2028-02-29');
  });
});

describe('coveredMean / hoursIn / snapToGrid', () => {
  it('averages finite values when enough hours are covered', () => {
    expect(coveredMean([10, 20, null, 30], 4)).toBe(20);
    expect(coveredMean([10, null, null, null], 4)).toBeNull();
    expect(coveredMean('nope', 4)).toBeNull();
  });

  it('counts hours in an inclusive window', () => {
    expect(hoursIn({ season: 'summer', start: '2026-06-01', end: '2026-08-31' })).toBe(92 * 24);
  });

  it('snaps nearby points to the same cell', () => {
    expect(snapToGrid(42.6629)).toBe(42.65);
    expect(snapToGrid(42.6741)).toBe(42.65);
    expect(snapToGrid(20.78)).toBe(20.8);
  });
});

describe('getSeasonalAirQuality', () => {
  const now = new Date('2026-11-10T00:00:00Z');

  it('averages each season and serves neighbours from the cache', async () => {
    getSpy.mockResolvedValueOnce(hourly(33, 7.7)).mockResolvedValueOnce(hourly(54, 31.2, 2160));
    const report = await getSeasonalAirQuality(42.663, 21.166, now);
    expect(report.seasons.map((s) => [s.season, s.aqi, s.pm25])).toEqual([
      ['summer', 33, 7.7],
      ['winter', 54, 31.2],
    ]);
    await getSeasonalAirQuality(42.664, 21.167, now);
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('treats a 400 as an empty season, not an outage', async () => {
    const bad = new AxiosError('bad', 'ERR_BAD_REQUEST', undefined, undefined, { status: 400 } as AxiosResponse);
    getSpy.mockResolvedValueOnce(hourly(20, 5)).mockRejectedValueOnce(bad);
    const report = await getSeasonalAirQuality(41, 20, now);
    expect(report.seasons[1]).toMatchObject({ season: 'winter', aqi: null, pm25: null });
  });

  it('does not cache a failure', async () => {
    getSpy.mockRejectedValue(new Error('network down'));
    await expect(getSeasonalAirQuality(40, 19, now)).rejects.toThrow('unavailable');
    getSpy.mockReset();
    getSpy.mockResolvedValue(hourly(20, 5));
    await expect(getSeasonalAirQuality(40, 19, now)).resolves.toBeDefined();
  });
});

describe('GET /properties/:id/air-quality', () => {
  // The database is stubbed: the endpoint only reads the home's coordinates.
  const findHome = (doc: Record<string, unknown> | null) =>
    jest.spyOn(Property, 'findById').mockReturnValue({
      select: () => ({ lean: async () => doc }),
    } as unknown as ReturnType<typeof Property.findById>);
  afterEach(() => jest.restoreAllMocks());

  const call = async () => {
    const req: any = { params: { id: String(new mongoose.Types.ObjectId()) }, query: {} };
    let body: any;
    let status = 200;
    const res: any = {
      status: (code: number) => { status = code; return res; },
      json: (data: any) => { body = data; return res; },
    };
    await getPropertyAirQuality(req, res);
    return { status, body };
  };

  it('returns both seasons for a located home', async () => {
    findHome({ lat: 40.618, lng: 20.78 });
    getSpy.mockResolvedValue(hourly(33, 7.7));
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.seasons).toHaveLength(2);
  });

  it('says so when the home has no location, without calling the provider', async () => {
    findHome({ lat: 0, lng: 0 });
    const { body } = await call();
    expect(body).toEqual({ status: 'no-location' });
    expect(getSpy).not.toHaveBeenCalled();
  });

  it('says so when the provider has nothing for the place', async () => {
    findHome({ lat: 42.0, lng: 21.4 });
    getSpy.mockResolvedValue(hourly(0, 0, 0));
    const { body } = await call();
    expect(body).toEqual({ status: 'no-data' });
  });

  it('answers 503 when the provider is down', async () => {
    findHome({ lat: 41.33, lng: 19.82 });
    getSpy.mockRejectedValue(new Error('timeout'));
    const { status } = await call();
    expect(status).toBe(503);
  });

  it('answers 404 for an unknown home', async () => {
    findHome(null);
    const { status } = await call();
    expect(status).toBe(404);
  });
});
