/**
 * One map tile's worth of places: which tiles may be asked for, and how the
 * tile's features become the short list the map shows. Pure.
 */

import { tileFor, type TileId } from '../surroundings/tileMath';
import type { TileFeature } from '../surroundings/tileSources';
import { poiCategoryOf, type PoiCategory } from './poiCategories';

/** OpenMapTiles only carries the full `poi` layer from zoom 14. */
export const POI_ZOOM = 14;

/** Most places kept per tile, best ranked first. */
export const MAX_POIS_PER_TILE = 150;

const MAX_NAME_LENGTH = 120;

/** The region the site covers; tiles outside it are refused. */
export const POI_REGION = { north: 49, south: 34, east: 31, west: 13 } as const;

export interface Poi {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  /** Importance inside its tile: 1 is the most prominent. */
  rank: number;
}

export type PoiTileResult = { ok: true; value: TileId } | { ok: false; error: string };

const wholeNumber = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d{1,6}$/.test(value)) return null;
  return Number(value);
};

/** Reads `x` and `y` from the URL and checks the tile lies inside the region. */
export const parsePoiTile = (x: unknown, y: unknown): PoiTileResult => {
  const tx = wholeNumber(x);
  const ty = wholeNumber(y);
  if (tx === null || ty === null) {
    return { ok: false, error: 'Tile x and y must be whole numbers' };
  }
  const nw = tileFor(POI_REGION.north, POI_REGION.west, POI_ZOOM);
  const se = tileFor(POI_REGION.south, POI_REGION.east, POI_ZOOM);
  if (tx < nw.x || tx > se.x || ty < nw.y || ty > se.y) {
    return { ok: false, error: 'Tile is outside the area covered' };
  }
  return { ok: true, value: { z: POI_ZOOM, x: tx, y: ty } };
};

const cleanName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const name = value.replace(/\s+/g, ' ').trim();
  return name ? name.slice(0, MAX_NAME_LENGTH) : null;
};

const pointOf = (geometry: TileFeature['geometry']): { lat: number; lng: number } | null => {
  if (geometry.type !== 'Point' || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as unknown[];
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/** Named places of a known category, de-duplicated, most prominent first. */
export const tileFeaturesToPois = (features: TileFeature[]): Poi[] => {
  const seen = new Set<string>();
  const pois: Poi[] = [];
  for (const feature of features) {
    if (feature.layer !== 'poi') continue;
    const category = poiCategoryOf(feature.properties);
    const name = cleanName(feature.properties.name);
    const point = pointOf(feature.geometry);
    if (!category || !name || !point) continue;

    // One shop mapped twice (node + building) appears twice in the tile.
    const key = `${category}|${name.toLowerCase()}|${point.lat.toFixed(3)}|${point.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const rank = typeof feature.properties.rank === 'number' && feature.properties.rank > 0 ? feature.properties.rank : 999;
    pois.push({
      id: `${category}:${point.lat.toFixed(5)},${point.lng.toFixed(5)}:${name}`,
      name,
      category,
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
      rank,
    });
  }
  return pois.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)).slice(0, MAX_POIS_PER_TILE);
};
