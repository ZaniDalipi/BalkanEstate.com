/**
 * Reads OpenStreetMap features around a home from OpenFreeMap's vector tiles:
 * pre-built, CDN-served, free and without a key (commercial use allowed).
 * A tile answers in ~0.2 s where a public Overpass query took 17–30 s.
 *   https://openfreemap.org — data © OpenStreetMap contributors, OpenMapTiles
 *
 * Roads, rail and nightlife come from zoom-14 tiles (~1.8 km wide in the
 * Balkans, so 1–4 tiles cover 500 m), airports from zoom-10 tiles.
 * OPENFREEMAP_TILEJSON can point at another OpenMapTiles TileJSON.
 */

import axios from 'axios';
import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';
import { createPromiseCache } from '../../utils/promiseCache';
import { describeHttpError } from '../../utils/describeHttpError';
import { apiLogger } from '../../utils/logger';
import { tilesCovering, type TileId } from './tileMath';
import { TILE_RADII, type TileFeature } from './tileSources';

const DEFAULT_TILEJSON = 'https://tiles.openfreemap.org/planet';
const REQUEST_TIMEOUT_MS = 6_000;
const STREET_ZOOM = 14;
const AIRPORT_ZOOM = 10;
const LAYERS_AT: Record<number, readonly string[]> = {
  [STREET_ZOOM]: ['transportation', 'transportation_name', 'poi'],
  [AIRPORT_ZOOM]: ['aerodrome_label'],
};

export class TilesUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TilesUnavailableError';
  }
}

const headers = { 'User-Agent': 'BalkanEstate Surroundings/1.0' };

/** The tile URL template; it names the weekly data release, so it is re-read every few hours. */
const templateCache = createPromiseCache<string>(6 * 60 * 60 * 1000, 1);
const tileTemplate = (): Promise<string> =>
  templateCache.get('template', async () => {
    const url = process.env.OPENFREEMAP_TILEJSON?.trim() || DEFAULT_TILEJSON;
    const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS, headers });
    const template = (data as { tiles?: unknown } | null)?.tiles;
    if (!Array.isArray(template) || typeof template[0] !== 'string' || !/\{z\}.*\{x\}.*\{y\}/.test(template[0])) {
      throw new TilesUnavailableError('TileJSON has no tile URL');
    }
    return template[0];
  });

/** Raw tiles, shared by neighbouring homes for a day. */
const tileCache = createPromiseCache<Buffer>(24 * 60 * 60 * 1000, 64);
const fetchTile = (template: string, t: TileId): Promise<Buffer> => {
  const url = template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y));
  return tileCache.get(url, async () => {
    const { data } = await axios.get<ArrayBuffer>(url, { timeout: REQUEST_TIMEOUT_MS, headers, responseType: 'arraybuffer' });
    return Buffer.from(data);
  });
};

/** The features of the wanted layers in one tile, as GeoJSON (lon/lat). */
export const decodeTile = (buffer: Buffer, t: TileId): TileFeature[] => {
  if (buffer.length === 0) return []; // an empty tile (open sea) has nothing
  const tile = new VectorTile(new Pbf(buffer));
  const out: TileFeature[] = [];
  for (const layerName of LAYERS_AT[t.z] ?? []) {
    const layer = tile.layers[layerName];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i++) {
      const geo = layer.feature(i).toGeoJSON(t.x, t.y, t.z);
      out.push({
        layer: layerName,
        properties: geo.properties as Record<string, unknown>,
        geometry: geo.geometry as TileFeature['geometry'],
      });
    }
  }
  return out;
};

/** Every relevant feature around a point; rejects with TilesUnavailableError when the tiles cannot be read. */
export const featuresAround = async (lat: number, lng: number): Promise<TileFeature[]> => {
  try {
    const template = await tileTemplate();
    const tiles = [
      ...tilesCovering(lat, lng, TILE_RADII.roads, STREET_ZOOM),
      ...tilesCovering(lat, lng, TILE_RADII.airports, AIRPORT_ZOOM),
    ];
    const decoded = await Promise.all(tiles.map(async (t) => decodeTile(await fetchTile(template, t), t)));
    return decoded.flat();
  } catch (err) {
    apiLogger.warn(`Vector tiles failed for ${lat},${lng}: ${describeHttpError(err)}`);
    throw err instanceof TilesUnavailableError ? err : new TilesUnavailableError('Map tiles unavailable');
  }
};

/** For tests. */
export const clearTileCaches = (): void => {
  templateCache.clear();
  tileCache.clear();
};
