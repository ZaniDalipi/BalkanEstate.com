import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import type { GridBounds } from '../types';
import { tileBuildings, tilesCovering, type Building, type TileFeature } from '../utils/buildingFootprints';
import { buildingsWithin } from '../utils/buildingsMesh';

/** OpenFreeMap's tile index: it names the current tile set's URLs. */
const TILE_INDEX = 'https://tiles.openfreemap.org/planet';
const TIMEOUT_MS = 15000;
/** Polygon, in vector-tile geometry types. */
const POLYGON = 3;

async function get(url: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response;
}

/**
 * The buildings wholly inside a box, from OpenStreetMap vector tiles, with
 * their heights. Rejects if the index or any tile can't be read, so the view
 * shows no buildings rather than some.
 */
export async function fetchBuildings(area: GridBounds): Promise<Building[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const index = (await (await get(TILE_INDEX, controller.signal)).json()) as { tiles?: unknown };
    const template = Array.isArray(index.tiles) && typeof index.tiles[0] === 'string' ? index.tiles[0] : null;
    if (!template) throw new Error('No tile URL in the index');
    const perTile = await Promise.all(tilesCovering(area).map(async (tile) => {
      const url = template.replace('{z}', String(tile.z)).replace('{x}', String(tile.x)).replace('{y}', String(tile.y));
      const data = await (await get(url, controller.signal)).arrayBuffer();
      const layer = new VectorTile(new Pbf(data)).layers.building;
      if (!layer) return [];
      const features: TileFeature[] = [];
      for (let i = 0; i < layer.length; i++) {
        const f = layer.feature(i);
        if (f.type === POLYGON) features.push({ rings: f.loadGeometry(), properties: f.properties });
      }
      return tileBuildings(tile, layer.extent, features);
    }));
    return buildingsWithin(perTile.flat(), area);
  } finally {
    clearTimeout(timer);
  }
}
