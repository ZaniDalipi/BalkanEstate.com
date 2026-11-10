/**
 * Noise, traffic and map roads from OpenFreeMap vector tiles: tile maths,
 * features → sources, road lines, and the tile client's failure handling.
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { type AxiosResponse } from 'axios';
import { tileFor, tilesCovering } from '../services/surroundings/tileMath';
import { tileFeaturesToSources, tileKindOf, type TileFeature } from '../services/surroundings/tileSources';
import { osmRoadLines, tileRoadLines } from '../services/surroundings/roadLines';
import { clearTileCaches, featuresAround, isTrustedTemplate, TilesUnavailableError } from '../services/surroundings/vectorTileClient';
import { clearSurroundingsCache, getSurroundings } from '../services/surroundings/surroundingsService';

const HOME = { lat: 41.3275, lng: 19.8187 };
const north = (m: number) => HOME.lat + m / 111_320;
/** An east–west line `m` metres north of the home, as GeoJSON. */
const line = (m: number) => ({
  type: 'LineString',
  coordinates: [[HOME.lng - 0.01, north(m)], [HOME.lng + 0.01, north(m)]],
});
const feature = (layer: string, properties: Record<string, unknown>, geometry: TileFeature['geometry']): TileFeature =>
  ({ layer, properties, geometry });

describe('tileMath', () => {
  it('finds the tile of a point', () => {
    expect(tileFor(41.3275, 19.8187, 14)).toEqual({ z: 14, x: 9093, y: 6122 });
  });

  it('covers a radius with one to four street tiles', () => {
    const tiles = tilesCovering(41.3275, 19.8187, 500, 14);
    expect(tiles.length).toBeGreaterThanOrEqual(1);
    expect(tiles.length).toBeLessThanOrEqual(4);
    expect(tiles).toContainEqual({ z: 14, x: 9093, y: 6122 });
  });
});

describe('tileKindOf', () => {
  it('maps OpenMapTiles classes onto noise sources', () => {
    expect(tileKindOf('transportation', { class: 'primary' })).toBe('primary');
    expect(tileKindOf('transportation', { class: 'primary', ramp: 1 })).toBe('tertiary');
    expect(tileKindOf('transportation', { class: 'minor' })).toBe('street');
    expect(tileKindOf('transportation', { class: 'primary', brunnel: 'tunnel' })).toBeNull();
    expect(tileKindOf('transportation', { class: 'rail', subclass: 'rail' })).toBe('railway');
    expect(tileKindOf('transportation', { class: 'rail', subclass: 'tram' })).toBe('tram');
    expect(tileKindOf('transportation', { class: 'rail', subclass: 'subway' })).toBeNull();
    expect(tileKindOf('transportation', { class: 'path', subclass: 'footway' })).toBeNull();
    expect(tileKindOf('poi', { class: 'bar', subclass: 'pub' })).toBe('bar');
    expect(tileKindOf('poi', { class: 'bar', subclass: 'nightclub' })).toBe('nightclub');
    expect(tileKindOf('poi', { class: 'cafe', subclass: 'cafe' })).toBeNull();
    expect(tileKindOf('aerodrome_label', { iata: 'TIA' })).toBe('airport');
    expect(tileKindOf('aerodrome_label', {})).toBeNull();
  });
});

describe('tileFeaturesToSources', () => {
  it('names roads from transportation_name and drops their unnamed duplicate pieces', () => {
    const sources = tileFeaturesToSources([
      feature('transportation', { class: 'secondary' }, line(65)),
      feature('transportation_name', { class: 'secondary', name: 'Sheshi Skënderbej' }, line(66)),
      feature('transportation', { class: 'primary' }, line(300)),
    ], HOME);
    expect(sources.map((s) => [s.kind, s.name, s.distanceM])).toEqual([
      ['secondary', 'Sheshi Skënderbej', 66],
      ['primary', undefined, 300],
    ]);
  });

  it('keeps each kind within its own radius and skips malformed features', () => {
    const sources = tileFeaturesToSources([
      feature('transportation', { class: 'minor' }, line(200)), // streets: 150 m
      feature('poi', { class: 'bar', subclass: 'bar', name: 'Kristal' }, { type: 'Point', coordinates: [HOME.lng, north(60)] }),
      feature('poi', { class: 'bar', subclass: 'bar' }, { type: 'Point', coordinates: [HOME.lng, north(400)] }),
      feature('transportation', { class: 'primary' }, { type: 'LineString', coordinates: [['x', 1]] }),
      null as unknown as TileFeature,
    ], HOME);
    expect(sources).toEqual([{ kind: 'bar', name: 'Kristal', distanceM: 60, group: 'bar:Kristal' }]);
  });
});

describe('road lines for the map', () => {
  it('keeps main roads and streets within ~600 m, nearest first, rounded', () => {
    const roads = tileRoadLines([
      feature('transportation', { class: 'primary' }, line(300)),
      feature('transportation', { class: 'minor' }, line(40)),
      feature('transportation', { class: 'primary' }, line(2000)),
      feature('transportation', { class: 'path', subclass: 'footway' }, line(10)),
      feature('transportation_name', { class: 'primary', name: 'X' }, line(300)),
    ], HOME);
    expect(roads.map((r) => r.kind)).toEqual(['street', 'primary']);
    expect(roads[0].points[0]).toEqual([Math.round(north(40) * 1e5) / 1e5, Math.round((HOME.lng - 0.01) * 1e5) / 1e5]);
  });

  it('builds the same from Overpass ways, with names', () => {
    const roads = osmRoadLines([
      { type: 'way', id: 1, tags: { highway: 'secondary', name: 'Rruga A' }, geometry: [{ lat: north(50), lon: HOME.lng - 0.005 }, { lat: north(50), lon: HOME.lng + 0.005 }] },
      { type: 'way', id: 2, tags: { railway: 'rail' }, geometry: [{ lat: north(20), lon: HOME.lng }, { lat: north(21), lon: HOME.lng }] },
    ], HOME);
    expect(roads).toHaveLength(1);
    expect(roads[0]).toMatchObject({ kind: 'secondary', name: 'Rruga A' });
  });
});

describe('isTrustedTemplate (SSRF guard)', () => {
  const tileJson = 'https://tiles.openfreemap.org/planet';
  it('accepts an https tile URL on the TileJSON host', () => {
    expect(isTrustedTemplate('https://tiles.openfreemap.org/planet/2026/{z}/{x}/{y}.pbf', tileJson)).toBe(true);
  });

  it('refuses other hosts, internal addresses, plain http and nonsense', () => {
    expect(isTrustedTemplate('https://evil.example/{z}/{x}/{y}.pbf', tileJson)).toBe(false);
    expect(isTrustedTemplate('https://169.254.169.254/{z}/{x}/{y}', tileJson)).toBe(false);
    expect(isTrustedTemplate('http://localhost:27017/{z}/{x}/{y}', tileJson)).toBe(false);
    expect(isTrustedTemplate('http://tiles.openfreemap.org/planet/{z}/{x}/{y}.pbf', tileJson)).toBe(false);
    expect(isTrustedTemplate('https://tiles.openfreemap.org.evil.example/{z}/{x}/{y}', tileJson)).toBe(false);
    expect(isTrustedTemplate('https://tiles.openfreemap.org/no-placeholders.pbf', tileJson)).toBe(false);
    expect(isTrustedTemplate(42, tileJson)).toBe(false);
  });
});

describe('vector tile client', () => {
  let getSpy: jest.SpyInstance;
  beforeEach(() => {
    clearTileCaches();
    getSpy = jest.spyOn(axios, 'get');
  });
  afterEach(() => getSpy.mockRestore());

  it('reads the tile URL from the TileJSON and treats an empty tile as nothing there', async () => {
    getSpy.mockImplementation(async (url: string) => (url.endsWith('/planet')
      ? { data: { tiles: ['https://tiles.openfreemap.org/planet/2026/{z}/{x}/{y}.pbf'] } }
      : { data: new ArrayBuffer(0) }) as AxiosResponse);
    await expect(featuresAround(HOME.lat, HOME.lng)).resolves.toEqual([]);
    expect(getSpy.mock.calls.some(([u]) => String(u).startsWith('https://tiles.openfreemap.org/planet/2026/14/9093/6122.pbf'))).toBe(true);
  });

  it('refuses a TileJSON that points the tiles at another host', async () => {
    getSpy.mockResolvedValueOnce({ data: { tiles: ['https://internal.example/{z}/{x}/{y}.pbf'] } } as AxiosResponse);
    await expect(featuresAround(HOME.lat, HOME.lng)).rejects.toBeInstanceOf(TilesUnavailableError);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('caps response sizes and never follows redirects', async () => {
    getSpy.mockImplementation(async (url: string) => (url.endsWith('/planet')
      ? { data: { tiles: ['https://tiles.openfreemap.org/planet/v/{z}/{x}/{y}.pbf'] } }
      : { data: new ArrayBuffer(0) }) as AxiosResponse);
    await featuresAround(HOME.lat, HOME.lng);
    for (const [, config] of getSpy.mock.calls) {
      expect(config).toMatchObject({ maxRedirects: 0, maxContentLength: expect.any(Number) });
    }
  });

  it('fails as TilesUnavailableError when the TileJSON is broken or unreachable', async () => {
    getSpy.mockResolvedValueOnce({ data: { tiles: [] } } as AxiosResponse);
    await expect(featuresAround(HOME.lat, HOME.lng)).rejects.toBeInstanceOf(TilesUnavailableError);
    clearTileCaches();
    getSpy.mockRejectedValueOnce(new Error('ENOTFOUND'));
    await expect(featuresAround(HOME.lat, HOME.lng)).rejects.toBeInstanceOf(TilesUnavailableError);
  });
});

describe('getSurroundings sources', () => {
  let getSpy: jest.SpyInstance;
  let postSpy: jest.SpyInstance;
  beforeEach(() => {
    clearTileCaches();
    clearSurroundingsCache();
    process.env.OVERPASS_URL = 'https://one.example/api/interpreter';
    getSpy = jest.spyOn(axios, 'get');
    postSpy = jest.spyOn(axios, 'post');
  });
  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
    delete process.env.OVERPASS_URL;
  });

  it('uses the tiles and never asks Overpass when they answer', async () => {
    getSpy.mockImplementation(async (url: string) => (url.endsWith('/planet')
      ? { data: { tiles: ['https://tiles.openfreemap.org/planet/v/{z}/{x}/{y}.pbf'] } }
      : { data: new ArrayBuffer(0) }) as AxiosResponse);
    const report = await getSurroundings(HOME.lat, HOME.lng);
    expect(report).toMatchObject({ traffic: { level: 'calm' }, roads: [] });
    expect(postSpy).not.toHaveBeenCalled();
  });

  it('falls back to Overpass when the tiles cannot be read', async () => {
    getSpy.mockRejectedValue(new Error('tiles down'));
    postSpy.mockResolvedValue({
      data: { elements: [{ type: 'way', id: 1, tags: { highway: 'primary', name: 'Bulevardi' }, geometry: [{ lat: north(40), lon: HOME.lng - 0.01 }, { lat: north(40), lon: HOME.lng + 0.01 }] }] },
    } as AxiosResponse);
    const report = await getSurroundings(HOME.lat, HOME.lng);
    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(report.roads.length).toBe(1);
  });
});
