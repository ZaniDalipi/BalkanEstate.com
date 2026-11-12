/**
 * The ground of a heights grid as a smooth 3D surface (heights stretched so
 * its shape shows). Pure geometry (plain arrays, three.js `y` up): the scene
 * puts it on screen.
 *
 * Model space: x runs east, z runs south, y up; the ground is centred on the
 * origin and its longer side is MODEL_SIZE units long.
 */
import type { ElevationGrid, TerrainPoint } from '../types';
import { cellSpacingM } from './gridGeometry';
import { fillGaps, resampleSmooth, soften } from './resample';

/** Length of the model's longer side, in scene units. */
export const MODEL_SIZE = 10;
/** Most vertices along the longer side of the surface. */
const MAX_SEGMENTS = 256;

export interface PlotTerrain {
  /** Ground size, metres. */
  widthM: number;
  depthM: number;
  /** Scene units per metre (the same across and up, before stretching). */
  scale: number;
  /** Vertices across (east) and down (south) the surface. */
  cols: number;
  rows: number;
  /** Height above the lowest point, metres, at each vertex (row-major, row 0 north). */
  heights: Float32Array;
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
  return { widthM, depthM, scale: MODEL_SIZE / longest, cols, rows, heights };
}

/** Scene `y` of the surface at a vertex, for a stretch. */
export const surfaceY = (t: PlotTerrain, i: number, exaggeration: number): number =>
  t.heights[i] * t.scale * exaggeration;

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
  return h * t.scale * exaggeration;
}

export interface MeshData {
  positions: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/** The surface: one vertex per height, two triangles per square, texture laid across the whole box. */
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

/**
 * A sheet laid over part of the surface (a box in model space), following the
 * ground just above it: carries the plot's own sharp picture. `lift` is in
 * scene units.
 */
export function drapeMesh(
  t: PlotTerrain,
  box: { x0: number; z0: number; x1: number; z1: number },
  segments: number,
  exaggeration: number,
  lift: number,
): MeshData {
  const n = segments + 1;
  const positions = new Float32Array(n * n * 3);
  const uvs = new Float32Array(n * n * 2);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const x = box.x0 + ((box.x1 - box.x0) * c) / segments;
      const z = box.z0 + ((box.z1 - box.z0) * r) / segments;
      positions.set([x, surfaceAt(t, x, z, exaggeration) + lift, z], i * 3);
      uvs.set([c / segments, 1 - r / segments], i * 2);
    }
  }
  const indices = new Uint32Array(segments * segments * 6);
  let k = 0;
  for (let r = 0; r < segments; r++) {
    for (let c = 0; c < segments; c++) {
      const a = r * n + c;
      indices.set([a, a + n, a + 1, a + 1, a + n, a + n + 1], k);
      k += 6;
    }
  }
  return { positions, uvs, indices };
}
