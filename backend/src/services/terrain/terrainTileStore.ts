/**
 * Downloads and decodes elevation tiles, keeping the most recent ones in
 * memory. Heights never change, so a tile fetched once serves every later
 * analysis that touches it; concurrent requests for the same tile share one
 * download.
 */
import sharp from 'sharp';
import { TILE_SIZE, decodeTerrarium, tileUrl } from './terrainMath';

const DEFAULT_TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const FETCH_TIMEOUT_MS = 8000;
/** 64 decoded tiles × 256 KB ≈ 16 MB of memory at most. */
const MAX_CACHED_TILES = 64;

export class TerrainUnavailableError extends Error {}

export type TileFetcher = typeof fetch;

/** Heights in metres, row-major, TILE_SIZE × TILE_SIZE. */
export type ElevationTile = Float32Array;

const cache = new Map<string, Promise<ElevationTile>>();

const remember = (key: string, tile: Promise<ElevationTile>): void => {
  if (cache.size >= MAX_CACHED_TILES) cache.delete(cache.keys().next().value as string);
  cache.set(key, tile);
};

/** Turn a Terrarium PNG into heights. */
export async function decodeTilePng(png: Buffer): Promise<ElevationTile> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== TILE_SIZE || info.height !== TILE_SIZE) {
    throw new TerrainUnavailableError(`Unexpected tile size ${info.width}×${info.height}`);
  }
  return decodeTerrarium(data, info.channels);
}

async function downloadTile(z: number, x: number, y: number, fetchImpl: TileFetcher): Promise<ElevationTile> {
  const url = tileUrl(process.env.TERRAIN_TILES_URL || DEFAULT_TILE_URL, z, x, y);
  try {
    const res = await fetchImpl(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'BalkanEstate/1.0 (+https://balkanestateai.com)', Accept: 'image/png' },
    });
    if (!res.ok) throw new TerrainUnavailableError(`Elevation tile answered ${res.status}`);
    return await decodeTilePng(Buffer.from(await res.arrayBuffer()));
  } catch (error) {
    if (error instanceof TerrainUnavailableError) throw error;
    throw new TerrainUnavailableError(error instanceof Error ? error.message : 'Elevation tiles unreachable');
  }
}

/** One tile's heights, from memory when we have it. A failed download is not kept. */
export function getElevationTile(z: number, x: number, y: number, fetchImpl: TileFetcher = fetch): Promise<ElevationTile> {
  const key = `${z}/${x}/${y}`;
  const hit = cache.get(key);
  if (hit) {
    // Re-insert so the most recently used tiles are the last to be dropped.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const tile = downloadTile(z, x, y, fetchImpl);
  remember(key, tile);
  tile.catch(() => { if (cache.get(key) === tile) cache.delete(key); });
  return tile;
}

/** Test hook. */
export const clearElevationTileCache = (): void => cache.clear();
