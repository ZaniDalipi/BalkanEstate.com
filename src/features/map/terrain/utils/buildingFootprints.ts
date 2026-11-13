/**
 * Buildings round the plot, from OpenStreetMap vector tiles (the OpenFreeMap
 * tiles the 3D location map already uses): which tiles cover an area, and
 * each building's outline and height from a tile's features. Pure: decoding
 * the tiles happens in the API layer.
 */
import type { GridBounds, TerrainPoint } from '../types';

/** Buildings come at this tile zoom, the most detailed the tiles have. */
export const BUILDING_ZOOM = 14;
/** OpenMapTiles' default when a building has no height: one storey and a roof. */
export const DEFAULT_HEIGHT_M = 5;
const MIN_HEIGHT_M = 2.5;

export interface Building {
  /** Outline, open ring (first point not repeated). */
  ring: TerrainPoint[];
  /** Height of the roof above the ground, metres. */
  heightM: number;
  /** Whether the height came from the map data rather than the default. */
  measured: boolean;
}

/** A feature as a decoded tile gives it: rings in tile units (y down), and its properties. */
export interface TileFeature {
  rings: Array<Array<{ x: number; y: number }>>;
  properties: Record<string, unknown>;
}

export interface TileId { z: number; x: number; y: number }

const tileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const tileY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z;
};
const lngOf = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const latOf = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
};

/** The tiles that cover a box. */
export function tilesCovering(b: GridBounds, z = BUILDING_ZOOM): TileId[] {
  const tiles: TileId[] = [];
  for (let y = Math.floor(tileY(b.north, z)); y <= Math.floor(tileY(b.south, z)); y++) {
    for (let x = Math.floor(tileX(b.west, z)); x <= Math.floor(tileX(b.east, z)); x++) tiles.push({ z, x, y });
  }
  return tiles;
}

type XY = { x: number; y: number };

/** Cut a ring to the tile's own square, so a building split across tiles is drawn once, in pieces that meet. */
export function clipToTile(ring: XY[], extent: number): XY[] {
  let out = ring;
  const edges: Array<[(p: XY) => boolean, (a: XY, b: XY) => XY]> = [
    [(p) => p.x >= 0, (a, b) => ({ x: 0, y: a.y + ((b.y - a.y) * (0 - a.x)) / (b.x - a.x) })],
    [(p) => p.x <= extent, (a, b) => ({ x: extent, y: a.y + ((b.y - a.y) * (extent - a.x)) / (b.x - a.x) })],
    [(p) => p.y >= 0, (a, b) => ({ x: a.x + ((b.x - a.x) * (0 - a.y)) / (b.y - a.y), y: 0 })],
    [(p) => p.y <= extent, (a, b) => ({ x: a.x + ((b.x - a.x) * (extent - a.y)) / (b.y - a.y), y: extent })],
  ];
  for (const [inside, cross] of edges) {
    const next: XY[] = [];
    out.forEach((p, i) => {
      const prev = out[(i + out.length - 1) % out.length];
      if (inside(p)) {
        if (!inside(prev)) next.push(cross(prev, p));
        next.push(p);
      } else if (inside(prev)) {
        next.push(cross(prev, p));
      }
    });
    out = next;
    if (out.length < 3) return [];
  }
  return out;
}

const signedArea = (ring: XY[]) => ring.reduce((s, p, i) => {
  const q = ring[(i + 1) % ring.length];
  return s + p.x * q.y - q.x * p.y;
}, 0) / 2;

/** A building's height from the tile's `render_height` (metres; 0 or missing means unknown). */
export function buildingHeight(properties: Record<string, unknown>): { heightM: number; measured: boolean } {
  const h = Number(properties.render_height);
  return Number.isFinite(h) && h >= MIN_HEIGHT_M ? { heightM: h, measured: true } : { heightM: DEFAULT_HEIGHT_M, measured: false };
}

/** The buildings in one tile's features: outer rings only (courtyards are rare and hidden by the roof anyway). */
export function tileBuildings(tile: TileId, extent: number, features: TileFeature[]): Building[] {
  const toPoint = (p: XY): TerrainPoint => ({ lng: lngOf(tile.x + p.x / extent, tile.z), lat: latOf(tile.y + p.y / extent, tile.z) });
  const out: Building[] = [];
  for (const f of features) {
    const height = buildingHeight(f.properties);
    if (f.rings.length === 0) continue;
    // The first ring is always an outer one; rings wound the other way are its holes.
    const outer = Math.sign(signedArea(f.rings[0]));
    for (const raw of f.rings) {
      if (Math.sign(signedArea(raw)) !== outer) continue;
      const open = raw.length > 1 && raw[0].x === raw[raw.length - 1].x && raw[0].y === raw[raw.length - 1].y ? raw.slice(0, -1) : raw;
      const ring = clipToTile(open, extent);
      if (ring.length >= 3 && Math.abs(signedArea(ring)) > 0) out.push({ ring: ring.map(toPoint), ...height });
    }
  }
  return out;
}
