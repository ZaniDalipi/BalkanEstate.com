/**
 * The plot as a table model: the land inside the grid's box, cut out as a
 * solid block — a smooth top surface following the ground (heights stretched
 * so its shape shows), earth sides, a flat base. Pure geometry (plain arrays,
 * three.js `y` up): the scene puts it on screen.
 *
 * Model space: x runs east, z runs south, y up; the block is centred on the
 * origin and its longer side is MODEL_SIZE units long.
 */
import type { ElevationGrid, TerrainPoint } from '../types';
import { cellSpacingM } from './gridGeometry';
import { fillGaps, resampleSmooth, soften } from './resample';

/** Length of the model's longer side, in scene units. */
export const MODEL_SIZE = 10;
/** Thickness of the block under its lowest ground, as a share of MODEL_SIZE. */
const BASE_SHARE = 0.07;
/** Most vertices along the longer side of the top surface. */
const MAX_SEGMENTS = 160;
/** Depth of the dark topsoil band along the top of the sides, scene units. */
export const TOPSOIL = 0.14;

export interface PlotTerrain {
  /** Ground size of the block, metres. */
  widthM: number;
  depthM: number;
  /** Scene units per metre (the same across and up, before stretching). */
  scale: number;
  /** Vertices across (east) and down (south) the top surface. */
  cols: number;
  rows: number;
  /** Height above the lowest point of the block, metres, at each vertex (row-major, row 0 north). */
  heights: Float32Array;
  /** Height of the block's base under its lowest ground, scene units. */
  base: number;
}

/** The ground of a heights grid as a smooth surface fine enough to look continuous. */
export function plotTerrain(grid: ElevationGrid): PlotTerrain {
  const { dx, dy } = cellSpacingM(grid);
  const widthM = dx * grid.cols;
  const depthM = dy * grid.rows;
  const longest = Math.max(widthM, depthM);
  const segments = Math.min(MAX_SEGMENTS, Math.max(grid.cols, grid.rows) * 6);
  const cols = Math.max(2, Math.round((segments * widthM) / longest) + 1);
  const rows = Math.max(2, Math.round((segments * depthM) / longest) + 1);
  const filled = fillGaps(grid.elevations, grid.rows, grid.cols);
  // The survey is ~30 m: soften its grid pattern on fine grids before enlarging.
  const source = grid.cellSizeM < 15 ? soften(filled, grid.rows, grid.cols, 1) : filled;
  const heights = resampleSmooth(source, grid.rows, grid.cols, rows, cols);
  let min = Infinity;
  for (const h of heights) if (h < min) min = h;
  for (let i = 0; i < heights.length; i++) heights[i] -= min;
  return { widthM, depthM, scale: MODEL_SIZE / longest, cols, rows, heights, base: MODEL_SIZE * BASE_SHARE };
}

/** Scene `y` of the surface at a vertex, for a stretch. */
export const surfaceY = (t: PlotTerrain, i: number, exaggeration: number): number =>
  t.base + t.heights[i] * t.scale * exaggeration;

/** Where a point on the ground sits in model space (x east, z south), from the grid's box. */
export function toModel(t: PlotTerrain, grid: ElevationGrid, p: TerrainPoint): { x: number; z: number } {
  const u = (p.lng - grid.west) / (grid.east - grid.west);
  const v = (grid.north - p.lat) / (grid.north - grid.south);
  return { x: (u - 0.5) * t.widthM * t.scale, z: (v - 0.5) * t.depthM * t.scale };
}

/** Height of the surface (scene `y`) at a model-space point, by bilinear interpolation. */
export function surfaceAt(t: PlotTerrain, x: number, z: number, exaggeration: number): number {
  const c = Math.min(t.cols - 1, Math.max(0, (x / (t.widthM * t.scale) + 0.5) * (t.cols - 1)));
  const r = Math.min(t.rows - 1, Math.max(0, (z / (t.depthM * t.scale) + 0.5) * (t.rows - 1)));
  const c0 = Math.min(t.cols - 2, Math.floor(c));
  const r0 = Math.min(t.rows - 2, Math.floor(r));
  const fc = c - c0;
  const fr = r - r0;
  const at = (rr: number, cc: number) => t.heights[rr * t.cols + cc];
  const h = (at(r0, c0) * (1 - fc) + at(r0, c0 + 1) * fc) * (1 - fr) + (at(r0 + 1, c0) * (1 - fc) + at(r0 + 1, c0 + 1) * fc) * fr;
  return t.base + h * t.scale * exaggeration;
}

export interface MeshData {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/** The top surface: one vertex per height, two triangles per square, texture laid across the whole box. */
export function surfaceMesh(t: PlotTerrain, exaggeration: number): MeshData {
  const { cols, rows } = t;
  const w = t.widthM * t.scale;
  const d = t.depthM * t.scale;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      positions.set([(c / (cols - 1) - 0.5) * w, surfaceY(t, i, exaggeration), (r / (rows - 1) - 0.5) * d], i * 3);
      uvs.set([c / (cols - 1), 1 - r / (rows - 1)], i * 2);
    }
  }
  const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const e = a + cols;
      const f = e + 1;
      indices.set([a, e, b, b, e, f], k);
      k += 6;
    }
  }
  return { positions, uvs, indices };
}

/** Vertex indices round the edge of the top surface, clockwise from the north-west corner seen from above. */
export function rimIndices(t: PlotTerrain): number[] {
  const { cols, rows } = t;
  const rim: number[] = [];
  for (let c = 0; c < cols; c++) rim.push(c); // north edge, west → east
  for (let r = 1; r < rows; r++) rim.push(r * cols + cols - 1); // east edge, north → south
  for (let c = cols - 2; c >= 0; c--) rim.push((rows - 1) * cols + c); // south edge, east → west
  for (let r = rows - 2; r > 0; r--) rim.push(r * cols); // west edge, south → north
  return rim;
}

export interface SideData {
  positions: Float32Array;
  /** 1 at the top of the topsoil band and below, 0 at the base: how the side is coloured. */
  depth: Float32Array;
  indices: Uint32Array;
}

/**
 * The block's sides: from the ground's edge down to the base, with a band of
 * topsoil along the top, as on a cut-away model. Facing outward.
 */
export function sideMesh(t: PlotTerrain, exaggeration: number): SideData {
  const rim = rimIndices(t);
  const w = t.widthM * t.scale;
  const d = t.depthM * t.scale;
  const n = rim.length;
  // Three rows per rim point: the ground edge, the bottom of the topsoil, the base.
  const positions = new Float32Array(n * 3 * 3);
  const depth = new Float32Array(n * 3);
  rim.forEach((i, k) => {
    const x = ((i % t.cols) / (t.cols - 1) - 0.5) * w;
    const z = (Math.floor(i / t.cols) / (t.rows - 1) - 0.5) * d;
    const top = surfaceY(t, i, exaggeration);
    const soil = Math.max(0, top - TOPSOIL);
    positions.set([x, top, z, x, soil, z, x, 0, z], k * 9);
    depth.set([2, 1, 0], k * 3);
  });
  const indices = new Uint32Array(n * 12);
  for (let k = 0; k < n; k++) {
    const next = (k + 1) % n;
    for (let band = 0; band < 2; band++) {
      const a = k * 3 + band;
      const b = next * 3 + band;
      // Rim runs clockwise seen from above, so (a, b, a↓) faces outward.
      indices.set([a, b, a + 1, b, b + 1, a + 1], k * 12 + band * 6);
    }
  }
  return { positions, depth, indices };
}
