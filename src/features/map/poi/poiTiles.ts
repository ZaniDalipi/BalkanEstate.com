/** Web Mercator tile maths for the POI layer (mirrors backend tileMath.ts). Pure. */

import { MAX_POI_TILES, POI_ZOOM } from './poiTypes';

export interface ViewBounds { north: number; south: number; east: number; west: number }
export interface PoiTileId { x: number; y: number }

const clampLat = (lat: number) => Math.max(-85.0511, Math.min(85.0511, lat));

const tileX = (lng: number, z: number) => Math.floor(((lng + 180) / 360) * 2 ** z);
const tileY = (lat: number, z: number) => {
  const rad = (clampLat(lat) * Math.PI) / 180;
  return Math.floor(((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2) * 2 ** z);
};

const isUsable = (b: ViewBounds | null): b is ViewBounds =>
  !!b && [b.north, b.south, b.east, b.west].every(Number.isFinite) && b.north > b.south && b.east > b.west;

/** The zoom-14 tiles a view touches, the ones nearest its centre first, at most `max`. */
export const tilesInBounds = (bounds: ViewBounds | null, max = MAX_POI_TILES): PoiTileId[] => {
  if (!isUsable(bounds)) return [];
  const x0 = tileX(bounds.west, POI_ZOOM), x1 = tileX(bounds.east, POI_ZOOM);
  const y0 = tileY(bounds.north, POI_ZOOM), y1 = tileY(bounds.south, POI_ZOOM);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const tiles: PoiTileId[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) tiles.push({ x, y });
  return tiles
    .sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))
    .slice(0, max);
};
