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

/** Tiles are ~0.1–1 MB; refuse anything far larger, and never follow redirects. */
const LIMITS = { maxContentLength: 8 * 1024 * 1024, maxRedirects: 0 } as const;

/**
 * The tile URL comes from a remote TileJSON, so it is only trusted on the
 * same https host as that TileJSON: a tampered file cannot send the server to
 * an internal address (SSRF).
 */
export const isTrustedTemplate = (template: unknown, tileJsonUrl: string): template is string => {
  if (typeof template !== 'string' || !/\{z\}.*\{x\}.*\{y\}/.test(template)) return false;
  try {
    const tile = new URL(template.replace('{z}', '0').replace('{x}', '0').replace('{y}', '0'));
    const source = new URL(tileJsonUrl);
    return tile.protocol === 'https:' && tile.host === source.host;
  } catch {
    return false;
  }
};

/** The tile URL template; it names the weekly data release, so it is re-read every few hours. */
const templateCache = createPromiseCache<string>(6 * 60 * 60 * 1000, 1, 30_000);
const tileTemplate = (): Promise<string> =>
  templateCache.get('template', async () => {
    const url = process.env.OPENFREEMAP_TILEJSON?.trim() || DEFAULT_TILEJSON;
    const { data } = await axios.get(url, { timeout: REQUEST_TIMEOUT_MS, headers, ...LIMITS });
    const tiles = (data as { tiles?: unknown } | null)?.tiles;
    const template = Array.isArray(tiles) ? tiles[0] : undefined;
    if (!isTrustedTemplate(template, url)) {
      throw new TilesUnavailableError('TileJSON has no usable tile URL');
    }
    return template;
  });

/** Raw tiles, shared by neighbouring homes for a day. */
const tileCache = createPromiseCache<Buffer>(24 * 60 * 60 * 1000, 64, 30_000);
const fetchTile = (template: string, t: TileId): Promise<Buffer> => {
  const url = template.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y));
  return tileCache.get(url, async () => {
    const { data } = await axios.get<ArrayBuffer>(url, { timeout: REQUEST_TIMEOUT_MS, headers, responseType: 'arraybuffer', ...LIMITS });
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
