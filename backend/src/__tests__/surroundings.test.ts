/**
 * Noise and traffic around a home: OSM geometry, the noise model, the cached
 * Overpass call and `GET /properties/:id/surroundings`, with Overpass mocked.
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { type AxiosResponse } from 'axios';
import mongoose from 'mongoose';
import Property from '../models/Property';
import { getPropertySurroundings } from '../controllers/propertyController';
import { kindOf, polylineDistance, toSources, type NoiseSource } from '../services/surroundings/osmSources';
import { addLevels, bandFor, estimateNoise, estimateTraffic, levelAt } from '../services/surroundings/noiseModel';
import { buildOverpassQuery, clearSurroundingsCache, getSurroundings, getSurroundingsWithin } from '../services/surroundings/surroundingsService';
import { describeHttpError } from '../utils/describeHttpError';
import { AxiosError } from 'axios';
import { createPromiseCache } from '../utils/promiseCache';
import { hasUsableLocation } from '../utils/coordinates';

// Korçë centre; 0.001° of latitude is ~111 m
const HOME = { lat: 40.618, lng: 20.78 };
const north = (m: number) => HOME.lat + m / 111_320;

/** An east–west road `m` metres north of the home. */
const road = (id: number, highway: string, m: number, name?: string) => ({
  type: 'way', id,
  tags: { highway, ...(name ? { name } : {}) },
  geometry: [{ lat: north(m), lon: HOME.lng - 0.01 }, { lat: north(m), lon: HOME.lng + 0.01 }],
});

const source = (kind: NoiseSource['kind'], distanceM: number, group = `${kind}:${distanceM}`): NoiseSource =>
  ({ kind, distanceM, group });

describe('osmSources', () => {
  it('measures the distance to the nearest point of a line, not its ends', () => {
    const d = polylineDistance({ lat: HOME.lat, lon: HOME.lng }, road(1, 'primary', 100).geometry);
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });

  it('recognises roads, ramps, railways, commercial airports and nightlife', () => {
    expect(kindOf({ highway: 'primary' })).toBe('primary');
    expect(kindOf({ highway: 'trunk_link' })).toBe('tertiary');
    expect(kindOf({ highway: 'residential' })).toBe('street');
    expect(kindOf({ highway: 'living_street' })).toBe('street');
    expect(kindOf({ highway: 'footway' })).toBeNull();
    expect(kindOf({ railway: 'rail' })).toBe('railway');
    expect(kindOf({ railway: 'light_rail' })).toBe('tram');
    expect(kindOf({ aeroway: 'aerodrome', iata: 'TIA' })).toBe('airport');
    expect(kindOf({ aeroway: 'aerodrome' })).toBeNull();
    expect(kindOf({ amenity: 'pub' })).toBe('bar');
  });

  it('groups the pieces of one named road and skips malformed elements', () => {
    const sources = toSources([
      road(1, 'primary', 80, 'Rruga Republika'),
      road(2, 'primary', 120, 'Rruga Republika'),
      { type: 'node', id: 3, lat: north(50), lon: HOME.lng, tags: { amenity: 'bar' } },
      { type: 'way', id: 4, tags: { highway: 'primary' }, geometry: [null, { lat: 'x', lon: 1 }] },
      null,
      { type: 'node', id: 5 },
    ], HOME);
    expect(sources.map((s) => [s.kind, s.group, s.distanceM])).toEqual([
      ['primary', 'primary:Rruga Republika', 80],
      ['primary', 'primary:Rruga Republika', 120],
      ['bar', 'bar:node/3', 50],
    ]);
  });
});

describe('noiseModel', () => {
  it('drops with distance, and more for a quieter road class', () => {
    expect(levelAt('primary', 10, 'day')).toBe(71);
    expect(levelAt('primary', 100, 'day')).toBeLessThan(levelAt('primary', 30, 'day'));
    expect(levelAt('tertiary', 50, 'day')).toBeLessThan(levelAt('primary', 50, 'day'));
    expect(levelAt('primary', 50, 'night')).toBeLessThan(levelAt('primary', 50, 'day'));
    expect(levelAt('nightclub', 30, 'night')).toBeGreaterThan(levelAt('nightclub', 30, 'day'));
  });

  it('adds levels on an energy basis', () => {
    expect(Math.round(addLevels([60, 60]))).toBe(63);
    expect(Math.round(addLevels([70, 50]))).toBe(70);
  });

  it('bands day and night separately', () => {
    expect(bandFor(44, 'day')).toBe('quiet');
    expect(bandFor(50, 'day')).toBe('moderate');
    expect(bandFor(60, 'day')).toBe('noisy');
    expect(bandFor(70, 'day')).toBe('veryNoisy');
    expect(bandFor(44, 'night')).toBe('moderate');
  });

  it('is the background alone with nothing nearby', () => {
    expect(estimateNoise([])).toEqual({
      day: { db: 42, band: 'quiet' },
      night: { db: 33, band: 'quiet' },
      sources: [],
    });
  });

  it('is noisy on a main road and names it', () => {
    const noise = estimateNoise([{ ...source('primary', 15), name: 'Bulevardi' }]);
    expect(noise.day.band).toBe('veryNoisy');
    expect(noise.sources).toEqual([{ kind: 'primary', name: 'Bulevardi', distanceM: 15 }]);
  });

  it('counts one road once however many pieces it has', () => {
    const one = estimateNoise([source('secondary', 60, 'secondary:A')]);
    const split = estimateNoise([source('secondary', 60, 'secondary:A'), source('secondary', 70, 'secondary:A')]);
    expect(split.day.db).toBe(one.day.db);
  });

  it('rates traffic by the class and distance of the nearest roads', () => {
    expect(estimateTraffic([]).level).toBe('calm');
    expect(estimateTraffic([source('primary', 100)]).level).toBe('busy');
    expect(estimateTraffic([source('primary', 300)]).level).toBe('moderate');
    expect(estimateTraffic([source('tertiary', 300)]).level).toBe('calm');
    expect(estimateTraffic([source('tertiary', 40), source('secondary', 200)]).nearestMainRoad)
      .toEqual({ kind: 'secondary', distanceM: 200 });
  });

  it('names the street the home is on, even a quiet one', () => {
    const traffic = estimateTraffic([
      { ...source('street', 12, 'street:Rruga Kala'), name: 'Rruga Kala' },
      source('primary', 260),
    ]);
    expect(traffic.nearestStreet).toEqual({ kind: 'street', name: 'Rruga Kala', distanceM: 12 });
    expect(traffic.nearestMainRoad).toEqual({ kind: 'primary', distanceM: 260 });
    expect(traffic.level).toBe('moderate');
  });

  it('counts the home\'s own street in the noise, a little', () => {
    const quiet = estimateNoise([]);
    const onStreet = estimateNoise([source('street', 10)]);
    expect(onStreet.day.db).toBeGreaterThan(quiet.day.db);
    // A quiet side street: about 50–55 dB at the façade, as on EU noise maps.
    expect(onStreet.day.band).toBe('moderate');
    expect(estimateNoise([source('street', 150)]).day.band).toBe('quiet');
  });
});

describe('promiseCache / hasUsableLocation', () => {
  it('shares a call, and retries after a failure', async () => {
    const cache = createPromiseCache<number>(60_000, 10);
    const load = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(7);
    await expect(cache.get('k', load)).rejects.toThrow('x');
    await expect(Promise.all([cache.get('k', load), cache.get('k', load)])).resolves.toEqual([7, 7]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest entry past the limit', async () => {
    const cache = createPromiseCache<number>(60_000, 2);
    const load = jest.fn().mockResolvedValue(1);
    await cache.get('a', load);
    await cache.get('b', load);
    await cache.get('c', load);
    await cache.get('a', load);
    expect(load).toHaveBeenCalledTimes(4);
  });

  it('rejects missing, out-of-range and 0,0 positions', () => {
    expect(hasUsableLocation(40.6, 20.8)).toBe(true);
    expect(hasUsableLocation(0, 0)).toBe(false);
    expect(hasUsableLocation(91, 20)).toBe(false);
    expect(hasUsableLocation(undefined, 20)).toBe(false);
    expect(hasUsableLocation(Number.NaN, 20)).toBe(false);
  });
});

describe('getSurroundings', () => {
  let postSpy: jest.SpyInstance;
  beforeEach(() => {
    clearSurroundingsCache();
    postSpy = jest.spyOn(axios, 'post');
  });
  afterEach(() => postSpy.mockRestore());

  const answer = (body: unknown) => ({ data: body }) as AxiosResponse;

  it('asks for roads, rail, airports and nightlife around the point', () => {
    const q = buildOverpassQuery(40.618, 20.78);
    expect(q).toContain('way(around:500,40.618,20.78)[highway~');
    expect(q).toContain('way(around:150,40.618,20.78)[highway~"^(residential|unclassified|living_street)$"]');
    expect(q).toContain('[aeroway=aerodrome][iata]');
    expect(q).toContain('nwr(around:150,40.618,20.78)[amenity~');
  });

  it('turns the answer into noise and traffic, and caches it', async () => {
    postSpy.mockResolvedValue(answer({ elements: [road(1, 'primary', 40, 'Bulevardi')] }));
    const report = await getSurroundings(HOME.lat, HOME.lng);
    expect(report.traffic).toEqual({
      level: 'busy',
      nearestStreet: { kind: 'primary', name: 'Bulevardi', distanceM: 40 },
      nearestMainRoad: { kind: 'primary', name: 'Bulevardi', distanceM: 40 },
    });
    expect(report.noise.day.band).toBe('noisy');
    // Within the ~1 m rounding of the pin: the same place, served from the cache.
    await getSurroundings(HOME.lat + 0.000001, HOME.lng);
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('treats an Overpass runtime remark as unavailable, and does not cache it', async () => {
    process.env.OVERPASS_URL = 'https://one.example/api/interpreter';
    postSpy.mockResolvedValueOnce(answer({ elements: [], remark: 'runtime error: Query timed out' }));
    await expect(getSurroundings(41, 20)).rejects.toThrow('timed out');
    postSpy.mockResolvedValueOnce(answer({ elements: [] }));
    await expect(getSurroundings(41, 20)).resolves.toMatchObject({ traffic: { level: 'calm' } });
    delete process.env.OVERPASS_URL;
  });

  it('turns a network failure into unavailable', async () => {
    postSpy.mockRejectedValue(new Error('ECONNRESET'));
    await expect(getSurroundings(42, 21)).rejects.toThrow('unavailable');
  });
});

describe('getSurroundingsWithin', () => {
  let postSpy: jest.SpyInstance;
  beforeEach(() => {
    clearSurroundingsCache();
    process.env.OVERPASS_URL = 'https://one.example/api/interpreter';
    postSpy = jest.spyOn(axios, 'post');
  });
  afterEach(() => {
    postSpy.mockRestore();
    delete process.env.OVERPASS_URL;
  });

  it('answers pending while the lookup is slow, then ok from the same lookup', async () => {
    let answer: (v: AxiosResponse) => void = () => undefined;
    postSpy.mockImplementation(() => new Promise<AxiosResponse>((resolve) => { answer = resolve; }));
    await expect(getSurroundingsWithin(HOME.lat, HOME.lng, 20)).resolves.toEqual({ status: 'pending' });
    answer({ data: { elements: [] } } as AxiosResponse);
    await expect(getSurroundingsWithin(HOME.lat, HOME.lng, 20)).resolves.toMatchObject({ status: 'ok' });
    expect(postSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects when the lookup has already failed', async () => {
    postSpy.mockRejectedValue(new Error('down'));
    await expect(getSurroundingsWithin(HOME.lat, HOME.lng, 1000)).rejects.toThrow('unavailable');
  });
});

describe('describeHttpError', () => {
  it('keeps status and code but never the request URL, query or headers', () => {
    const err = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', {
      url: 'https://customer-air-quality-api.open-meteo.com/v1/air-quality',
      params: { apikey: 'SECRET-KEY' },
      headers: { Authorization: 'Bearer SECRET-TOKEN' },
    } as never, undefined, { status: 502 } as AxiosResponse);
    const text = describeHttpError(err);
    expect(text).toBe('HTTP 502 · ERR_BAD_RESPONSE · Request failed');
    expect(text).not.toMatch(/SECRET|apikey|open-meteo/);
  });
});

describe('GET /properties/:id/surroundings', () => {
  let postSpy: jest.SpyInstance;
  beforeEach(() => {
    clearSurroundingsCache();
    postSpy = jest.spyOn(axios, 'post');
  });
  afterEach(() => jest.restoreAllMocks());

  const findHome = (doc: Record<string, unknown> | null) =>
    jest.spyOn(Property, 'findById').mockReturnValue({
      select: () => ({ lean: async () => doc }),
    } as unknown as ReturnType<typeof Property.findById>);

  const call = async () => {
    const req: any = { params: { id: String(new mongoose.Types.ObjectId()) }, query: {} };
    let body: any;
    let status = 200;
    const headers: Record<string, string> = {};
    const res: any = {
      status: (code: number) => { status = code; return res; },
      json: (data: any) => { body = data; return res; },
      set: (name: string, value: string) => { headers[name] = value; return res; },
    };
    await getPropertySurroundings(req, res);
    return { status, body, headers };
  };

  it('returns noise and traffic for a located home', async () => {
    findHome(HOME);
    postSpy.mockResolvedValue({ data: { elements: [] } } as AxiosResponse);
    const { status, body } = await call();
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', noise: { day: { band: 'quiet' } }, traffic: { level: 'calm', nearestStreet: null, nearestMainRoad: null } });
  });

  it('says so when the home has no location, without calling Overpass', async () => {
    findHome({ lat: 0, lng: 0 });
    expect((await call()).body).toEqual({ status: 'no-location' });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('answers pending with Retry-After while the lookup is still running', async () => {
    findHome({ lat: 42.2, lng: 20.3 });
    postSpy.mockImplementation(() => new Promise(() => undefined));
    jest.useFakeTimers();
    const pending = call();
    await jest.advanceTimersByTimeAsync(8_000);
    const { body, headers } = await pending;
    jest.useRealTimers();
    expect(body).toEqual({ status: 'pending' });
    expect(headers['Retry-After']).toBe('5');
  });

  it('answers 503 when Overpass is down and 404 for an unknown home', async () => {
    findHome({ lat: 41.1, lng: 20.1 });
    postSpy.mockRejectedValue(new Error('down'));
    expect((await call()).status).toBe(503);
    findHome(null);
    expect((await call()).status).toBe(404);
  });
});
