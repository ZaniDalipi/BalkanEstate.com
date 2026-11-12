/**
 * The slope classes as shapes on the ground: for each class, the outline of
 * the cells that fall in it (with holes where another class sits inside),
 * smoothed so the zones read as soft regions rather than grid steps. Drawn
 * on the photorealistic 3D view, which takes shapes, not pictures.
 */
import type { SlopeClassId, TerrainAnalysis, TerrainPoint } from '../types';
import { SLOPE_CLASSES, slopeClassIndex } from './slopeClasses';

export interface SlopeZone {
  classId: SlopeClassId;
  color: string;
  outer: TerrainPoint[];
  holes: TerrainPoint[][];
}

/** Grid corners: [row, col], row 0 along the north edge. */
type Corner = [number, number];

/** Rings smaller than this many cells are left out: specks, not zones. */
const MIN_RING_CELLS = 3;
const SMOOTHING_PASSES = 2;

/**
 * The closed outlines of the cells where `inZone` holds. Outer outlines run
 * clockwise on screen (north up), holes anticlockwise.
 */
export function traceRings(rows: number, cols: number, inZone: (r: number, c: number) => boolean): Corner[][] {
  const at = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols && inZone(r, c);
  const key = ([r, c]: Corner) => r * (cols + 1) + c;
  const from = new Map<number, Corner[]>();
  const add = (a: Corner, b: Corner) => {
    const list = from.get(key(a)) ?? [];
    list.push(b);
    from.set(key(a), list);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!at(r, c)) continue;
      if (!at(r - 1, c)) add([r, c], [r, c + 1]);
      if (!at(r, c + 1)) add([r, c + 1], [r + 1, c + 1]);
      if (!at(r + 1, c)) add([r + 1, c + 1], [r + 1, c]);
      if (!at(r, c - 1)) add([r + 1, c], [r, c]);
    }
  }
  const rings: Corner[][] = [];
  for (const [startKey, ends] of from) {
    while (ends.length) {
      const start: Corner = [Math.floor(startKey / (cols + 1)), startKey % (cols + 1)];
      const ring: Corner[] = [start];
      let next = ends.pop() as Corner;
      while (key(next) !== startKey) {
        ring.push(next);
        const onward = from.get(key(next));
        if (!onward?.length) break;
        next = onward.pop() as Corner;
      }
      rings.push(ring);
    }
  }
  return rings;
}

/** Twice the signed area of a ring of corners (positive = clockwise on screen). */
export function ringArea(ring: Corner[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [r1, c1] = ring[i];
    const [r2, c2] = ring[(i + 1) % ring.length];
    sum += c1 * r2 - c2 * r1;
  }
  return sum;
}

/** Drop corners that lie on a straight run, keeping only where the outline turns. */
function turnsOnly(ring: Corner[]): Corner[] {
  return ring.filter((p, i) => {
    const a = ring[(i - 1 + ring.length) % ring.length];
    const b = ring[(i + 1) % ring.length];
    return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
  });
}

/** Chaikin corner-cutting on a closed ring: rounds the grid's stair-steps into soft curves. */
export function smoothRing(ring: Array<[number, number]>, passes = SMOOTHING_PASSES): Array<[number, number]> {
  let pts = ring;
  for (let k = 0; k < passes; k++) {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      out.push([0.75 * ax + 0.25 * bx, 0.75 * ay + 0.25 * by], [0.25 * ax + 0.75 * bx, 0.25 * ay + 0.75 * by]);
    }
    pts = out;
  }
  return pts;
}

/** Whether point (r, c) lies inside a ring (ray casting). */
function inside([r, c]: [number, number], ring: Array<[number, number]>): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ri, ci] = ring[i];
    const [rj, cj] = ring[j];
    if (ri > r !== rj > r && c < ((cj - ci) * (r - ri)) / (rj - ri) + ci) hit = !hit;
  }
  return hit;
}

export function slopeZones(analysis: TerrainAnalysis): SlopeZone[] {
  const { grid, inside: mask, field } = analysis;
  const latStep = (grid.north - grid.south) / grid.rows;
  const lngStep = (grid.east - grid.west) / grid.cols;
  const toPoint = ([r, c]: [number, number]): TerrainPoint => ({ lat: grid.north - r * latStep, lng: grid.west + c * lngStep });
  const zones: SlopeZone[] = [];

  SLOPE_CLASSES.forEach((cls, k) => {
    const rings = traceRings(grid.rows, grid.cols, (r, c) => {
      const i = r * grid.cols + c;
      return mask[i] === 1 && !Number.isNaN(field.slope[i]) && slopeClassIndex(field.slope[i]) === k;
    }).filter((ring) => Math.abs(ringArea(ring)) / 2 >= MIN_RING_CELLS);

    const smooth = (ring: Corner[]) => smoothRing(turnsOnly(ring));
    const outers = rings.filter((ring) => ringArea(ring) > 0).map(smooth);
    const holes = rings.filter((ring) => ringArea(ring) < 0).map(smooth);
    outers.forEach((outer) => {
      zones.push({
        classId: cls.id,
        color: cls.color,
        outer: outer.map(toPoint),
        holes: holes.filter((hole) => inside(hole[0], outer)).map((hole) => hole.map(toPoint)),
      });
    });
  });
  return zones;
}
