/**
 * Places of interest for the search map: category mapping, tile validation,
 * features → short list, the cached service and the controller's answers.
 */
process.env.SKIP_TEST_DB = 'true';

import axios, { type AxiosResponse } from 'axios';
import type { Request, Response } from 'express';
import { poiCategoryOf } from '../services/pois/poiCategories';
import { MAX_POIS_PER_TILE, parsePoiTile, tileFeaturesToPois } from '../services/pois/poiTile';
import { clearPoiCache, getTilePois, PoisUnavailableError } from '../services/pois/poiService';
import { clearTileCaches } from '../services/surroundings/vectorTileClient';
import type { TileFeature } from '../services/surroundings/tileSources';
import { getPoiTile } from '../controllers/poiController';

const TIRANA = { x: '9093', y: '6122' };

const poi = (properties: Record<string, unknown>, lng = 19.82, lat = 41.33): TileFeature => ({
  layer: 'poi',
  properties,
  geometry: { type: 'Point', coordinates: [lng, lat] },
});

describe('poiCategoryOf', () => {
  it('maps the places a home buyer cares about', () => {
    expect(poiCategoryOf({ class: 'bus', subclass: 'bus_stop' })).toBe('transport');
    expect(poiCategoryOf({ class: 'school', subclass: 'kindergarten' })).toBe('education');
    expect(poiCategoryOf({ class: 'hospital', subclass: 'clinic' })).toBe('health');
    expect(poiCategoryOf({ class: 'grocery', subclass: 'supermarket' })).toBe('shopping');
    expect(poiCategoryOf({ class: 'place_of_worship', subclass: 'christian' })).toBe('worship');
  });

  it('leaves out street furniture and unknown values', () => {
    expect(poiCategoryOf({ class: 'gate', subclass: 'gate' })).toBeNull();
    expect(poiCategoryOf({ class: 'art_gallery', subclass: 'artwork' })).toBeNull();
    expect(poiCategoryOf({ class: 42, subclass: null })).toBeNull();
    expect(poiCategoryOf({})).toBeNull();
  });
});

describe('parsePoiTile', () => {
  it('accepts a tile inside the region', () => {
    expect(parsePoiTile(TIRANA.x, TIRANA.y)).toEqual({ ok: true, value: { z: 14, x: 9093, y: 6122 } });
  });

  it.each([
    ['abc', '6122'], ['9093', '-1'], ['9093.5', '6122'], ['', ''], [undefined, '6122'], ['99999999', '6122'],
  ])('rejects malformed coordinates %p / %p', (x, y) => {
    const result = parsePoiTile(x, y);
    expect(result.ok).toBe(false);
  });

  it('rejects a tile outside the region (not a general tile proxy)', () => {
    const london = parsePoiTile('8186', '5448');
    expect(london).toEqual({ ok: false, error: 'Tile is outside the area covered' });
  });
});

describe('tileFeaturesToPois', () => {
  it('keeps named places of a known category, most prominent first', () => {
    const pois = tileFeaturesToPois([
      poi({ class: 'cafe', subclass: 'cafe', name: 'Kafe  Flora ', rank: 7 }),
      poi({ class: 'hospital', subclass: 'hospital', name: 'Spitali', rank: 1 }, 19.83, 41.34),
      poi({ class: 'gate', subclass: 'gate', name: 'Gate' }),
      poi({ class: 'school', subclass: 'school' }), // no name
      { layer: 'transportation', properties: { class: 'primary', name: 'Road' }, geometry: { type: 'Point', coordinates: [19.8, 41.3] } },
    ]);
    expect(pois.map((p) => [p.name, p.category, p.rank])).toEqual([
      ['Spitali', 'health', 1],
      ['Kafe Flora', 'dining', 7],
    ]);
    expect(pois[0]).toMatchObject({ lat: 41.34, lng: 19.83 });
  });

  it('drops duplicates and features without a usable point', () => {
    const pois = tileFeaturesToPois([
      poi({ class: 'bank', subclass: 'bank', name: 'Banka' }),
      poi({ class: 'bank', subclass: 'bank', name: 'banka' }),
      { layer: 'poi', properties: { class: 'bank', subclass: 'bank', name: 'Line' }, geometry: { type: 'LineString', coordinates: [[1, 2], [3, 4]] } },
      { layer: 'poi', properties: { class: 'bank', subclass: 'bank', name: 'NaN' }, geometry: { type: 'Point', coordinates: ['a', 'b'] } },
    ]);
    expect(pois).toHaveLength(1);
  });

  it('caps a dense tile', () => {
    const many = Array.from({ length: MAX_POIS_PER_TILE + 50 }, (_, i) =>
      poi({ class: 'cafe', subclass: 'cafe', name: `Cafe ${i}`, rank: i + 1 }, 19.8 + i * 0.0001));
    const pois = tileFeaturesToPois(many);
    expect(pois).toHaveLength(MAX_POIS_PER_TILE);
    expect(pois[0].name).toBe('Cafe 0');
  });
});

describe('getTilePois and the controller', () => {
  const answer = (data: unknown) => Promise.resolve({ data } as AxiosResponse);
  const tileJson = { tiles: ['https://tiles.openfreemap.org/planet/20260101/{z}/{x}/{y}.pbf'] };
  let get: jest.SpyInstance;

  const respond = async (params: Record<string, string>) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), set: jest.fn() };
    await getPoiTile({ params } as unknown as Request, res as unknown as Response);
    return res;
  };

  beforeEach(() => {
    clearTileCaches();
    clearPoiCache();
    get = jest.spyOn(axios, 'get');
  });
  afterEach(() => get.mockRestore());

  it('answers an empty tile (open sea) with no places, and asks the tile host once', async () => {
    get.mockImplementation((url: string) => answer(url.endsWith('/planet') ? tileJson : new ArrayBuffer(0)));
    const tile = { z: 14, x: 9093, y: 6122 };
    await expect(getTilePois(tile)).resolves.toEqual([]);
    await expect(getTilePois(tile)).resolves.toEqual([]);
    expect(get.mock.calls.filter(([url]) => String(url).endsWith('.pbf'))).toHaveLength(1);
  });

  it('rejects with PoisUnavailableError when the tile host is down', async () => {
    get.mockRejectedValue(new Error('ECONNRESET'));
    await expect(getTilePois({ z: 14, x: 9093, y: 6122 })).rejects.toBeInstanceOf(PoisUnavailableError);
  });

  it('answers 200 with the places and a cache header', async () => {
    get.mockImplementation((url: string) => answer(url.endsWith('/planet') ? tileJson : new ArrayBuffer(0)));
    const res = await respond(TIRANA);
    expect(res.json).toHaveBeenCalledWith({ pois: [] });
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=3600');
  });

  it('answers 400 for a bad tile without calling the tile host', async () => {
    const res = await respond({ x: 'DROP', y: '1' });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('answers 503 with Retry-After when the tile host is down', async () => {
    get.mockRejectedValue(new Error('ETIMEDOUT'));
    const res = await respond(TIRANA);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.set).toHaveBeenCalledWith('Retry-After', '30');
  });
});
