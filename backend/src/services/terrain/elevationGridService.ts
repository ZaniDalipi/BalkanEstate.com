/**
 * Heights on a regular grid over a box on the map — the raw material for the
 * map's terrain (slope) tool. The client draws an area, asks for the grid over
 * its bounding box, and works out slope, direction and the flattest spots
 * itself.
 *
 * Cells are roughly square on the ground. Small areas get fine cells (down to
 * MIN_CELL_M); large ones are capped at MAX_CELLS so the answer stays small.
 */
import {
  METERS_PER_DEG_LAT,
  METERS_PER_DEG_LNG,
  SOURCE_RESOLUTION_M,
  TILE_SIZE,
  chooseTileZoom,
  latToPixelY,
  lngToPixelX,
} from './terrainMath';
import { getElevationTile, type ElevationTile, type TileFetcher } from './terrainTileStore';

export interface GridBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ElevationGrid extends GridBounds {
  rows: number;
  cols: number;
  /** Approximate cell edge on the ground, in metres. */
  cellSizeM: number;
  /** Row-major heights in metres at each cell centre, row 0 at the north. null = water / no data. */
  elevations: Array<number | null>;
}

export interface ElevationGridResult {
  grid: ElevationGrid;
  source: { name: string; resolutionM: number };
}

export type Validation<T> = { isValid: true; value: T } | { isValid: false; error: string };

export const MAX_SIDE_M = 8000;
export const MIN_SIDE_M = 5;
export const MAX_CELLS = 10000;
export const MIN_CELL_M = 8;
const MAX_TILES = 16;
/** Heights below this are sea floor in the source data, not land. */
const SEA_LEVEL_M = 0;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Ground width and height of a box, in metres. */
export function boundsSizeM(b: GridBounds): { widthM: number; heightM: number } {
  const midLat = (b.north + b.south) / 2;
  return {
    widthM: (b.east - b.west) * METERS_PER_DEG_LNG * Math.cos(toRad(midLat)),
    heightM: (b.north - b.south) * METERS_PER_DEG_LAT,
  };
}

const readNumber = (raw: unknown): number | null => {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 24) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Check `?south=&west=&north=&east=`. */
export function validateGridQuery(query: Record<string, unknown>): Validation<GridBounds> {
  const [south, west, north, east] = ['south', 'west', 'north', 'east'].map((k) => readNumber(query[k]));
  if (south === null || west === null || north === null || east === null) {
    return { isValid: false, error: 'south, west, north and east must be numbers' };
  }
  if (south < -85 || north > 85 || west < -180 || east > 180) {
    return { isValid: false, error: 'Coordinates are out of range' };
  }
  if (south >= north || west >= east) {
    return { isValid: false, error: 'south must be below north and west left of east' };
  }
  const bounds = { south, west, north, east };
  const { widthM, heightM } = boundsSizeM(bounds);
  if (widthM > MAX_SIDE_M || heightM > MAX_SIDE_M) {
    return { isValid: false, error: `The area is too large: keep each side under ${MAX_SIDE_M / 1000} km` };
  }
  if (widthM < MIN_SIDE_M || heightM < MIN_SIDE_M) {
    return { isValid: false, error: 'The area is too small to measure' };
  }
  return { isValid: true, value: bounds };
}

export interface GridPlan {
  rows: number;
  cols: number;
  cellSizeM: number;
  zoom: number;
}

/** How many cells, how big, and which tile zoom to read them from. */
export function planGrid(b: GridBounds): GridPlan {
  const { widthM, heightM } = boundsSizeM(b);
  const cellSizeM = Math.max(MIN_CELL_M, Math.sqrt((widthM * heightM) / MAX_CELLS));
  const cols = Math.max(3, Math.round(widthM / cellSizeM));
  const rows = Math.max(3, Math.round(heightM / cellSizeM));
  const zoom = chooseTileZoom(cellSizeM, (b.north + b.south) / 2);
  return { rows, cols, cellSizeM: Math.round(cellSizeM * 10) / 10, zoom };
}

/** Every tile a bilinear read of this box touches at the zoom. */
export function tilesFor(b: GridBounds, zoom: number): Array<{ x: number; y: number }> {
  const last = 2 ** zoom - 1;
  const clampTile = (t: number) => Math.min(last, Math.max(0, t));
  const x0 = clampTile(Math.floor((lngToPixelX(b.west, zoom) - 0.5) / TILE_SIZE));
  const x1 = clampTile(Math.floor((lngToPixelX(b.east, zoom) + 0.5) / TILE_SIZE));
  const y0 = clampTile(Math.floor((latToPixelY(b.north, zoom) - 0.5) / TILE_SIZE));
  const y1 = clampTile(Math.floor((latToPixelY(b.south, zoom) + 0.5) / TILE_SIZE));
  const tiles: Array<{ x: number; y: number }> = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) tiles.push({ x, y });
  return tiles;
}

type TileLookup = Map<string, ElevationTile>;

/** Height of one global pixel (clamped to the tiles we hold). */
function pixelHeight(tiles: TileLookup, zoom: number, px: number, py: number): number {
  const max = TILE_SIZE * 2 ** zoom - 1;
  const x = Math.min(max, Math.max(0, px));
  const y = Math.min(max, Math.max(0, py));
  const tile = tiles.get(`${Math.floor(x / TILE_SIZE)}/${Math.floor(y / TILE_SIZE)}`);
  if (!tile) return Number.NaN;
  return tile[(y % TILE_SIZE) * TILE_SIZE + (x % TILE_SIZE)];
}

/** Bilinear height at a point, from pixel centres. */
export function sampleHeight(tiles: TileLookup, zoom: number, lat: number, lng: number): number {
  const fx = lngToPixelX(lng, zoom) - 0.5;
  const fy = latToPixelY(lat, zoom) - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const top = pixelHeight(tiles, zoom, x0, y0) * (1 - tx) + pixelHeight(tiles, zoom, x0 + 1, y0) * tx;
  const bottom = pixelHeight(tiles, zoom, x0, y0 + 1) * (1 - tx) + pixelHeight(tiles, zoom, x0 + 1, y0 + 1) * tx;
  return top * (1 - ty) + bottom * ty;
}

/** Heights at every cell centre of a planned grid. */
export function sampleGrid(b: GridBounds, plan: GridPlan, tiles: TileLookup): Array<number | null> {
  const latStep = (b.north - b.south) / plan.rows;
  const lngStep = (b.east - b.west) / plan.cols;
  const out: Array<number | null> = new Array(plan.rows * plan.cols);
  for (let r = 0; r < plan.rows; r++) {
    const lat = b.north - (r + 0.5) * latStep;
    for (let c = 0; c < plan.cols; c++) {
      const h = sampleHeight(tiles, plan.zoom, lat, b.west + (c + 0.5) * lngStep);
      out[r * plan.cols + c] = Number.isFinite(h) && h >= SEA_LEVEL_M ? Math.round(h * 10) / 10 : null;
    }
  }
  return out;
}

/** Fetch what's needed and build the grid. Throws TerrainUnavailableError when tiles can't be read. */
export async function getElevationGrid(b: GridBounds, fetchImpl?: TileFetcher): Promise<ElevationGridResult> {
  const plan = planGrid(b);
  const needed = tilesFor(b, plan.zoom);
  if (needed.length > MAX_TILES) throw new RangeError(`Grid needs ${needed.length} tiles`);
  const loaded = await Promise.all(needed.map(({ x, y }) => getElevationTile(plan.zoom, x, y, fetchImpl)));
  const tiles: TileLookup = new Map(needed.map(({ x, y }, i) => [`${x}/${y}`, loaded[i]]));
  return {
    grid: { ...b, rows: plan.rows, cols: plan.cols, cellSizeM: plan.cellSizeM, elevations: sampleGrid(b, plan, tiles) },
    source: { name: 'Terrain Tiles (AWS Open Data)', resolutionM: SOURCE_RESOLUTION_M },
  };
}
