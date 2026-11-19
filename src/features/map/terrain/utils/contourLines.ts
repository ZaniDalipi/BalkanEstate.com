/**
 * Contour lines as lines on the map: ground of equal height, every
 * `interval` metres, inside the drawn outline only (marching squares over the
 * cell centres, the pieces joined into lines). Laid on a 3D map they show
 * steepness at a glance: the closer the lines, the steeper. Pure.
 */
import { pointInPolygon, type Point } from '@/src/features/developments/utils/polygonGeometry';
import type { ElevationGrid, TerrainPoint } from '../types';
import { cellCenter } from './gridGeometry';
import { fillGaps } from './resample';

export interface ContourLine {
  /** Height of the line, metres. */
  elevation: number;
  points: TerrainPoint[];
  /** Every INDEX_EVERY-th line, drawn stronger. */
  index: boolean;
}

const key = (p: TerrainPoint) => `${p.lat.toFixed(9)},${p.lng.toFixed(9)}`;

/** Join pieces that share ends into as few lines as possible. */
export function joinSegments(segments: Array<[TerrainPoint, TerrainPoint]>): TerrainPoint[][] {
  const ends = new Map<string, number[]>();
  segments.forEach(([a, b], i) => {
    for (const p of [a, b]) ends.set(key(p), [...(ends.get(key(p)) ?? []), i]);
  });
  const used = new Uint8Array(segments.length);
  const lines: TerrainPoint[][] = [];
  const grow = (line: TerrainPoint[]) => {
    for (;;) {
      const tail = line[line.length - 1];
      const next = (ends.get(key(tail)) ?? []).find((i) => !used[i]);
      if (next === undefined) return;
      used[next] = 1;
      const [a, b] = segments[next];
      line.push(key(a) === key(tail) ? b : a);
    }
  };
  segments.forEach(([a, b], i) => {
    if (used[i]) return;
    used[i] = 1;
    const line = [a, b];
    grow(line);
    line.reverse();
    grow(line);
    lines.push(line);
  });
  return lines;
}

export function contourLines(
  grid: ElevationGrid,
  polygon: TerrainPoint[],
  interval: number,
  indexEvery: number,
): ContourLine[] {
  const { rows, cols } = grid;
  if (rows < 2 || cols < 2 || !(interval > 0)) return [];
  const h = fillGaps(grid.elevations, rows, cols);
  const ring: Point[] = polygon.map((p) => [p.lng, p.lat]);
  const at = (r: number, c: number) => cellCenter(grid, r * cols + c);
  let min = Infinity;
  let max = -Infinity;
  h.forEach((v) => { min = Math.min(min, v); max = Math.max(max, v); });
  const out: ContourLine[] = [];
  for (let level = Math.ceil(min / interval) * interval; level <= max; level += interval) {
    const segments: Array<[TerrainPoint, TerrainPoint]> = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // Corners going round: top-left, top-right, bottom-right, bottom-left.
        const corners: Array<[number, number]> = [[r, c], [r, c + 1], [r + 1, c + 1], [r + 1, c]];
        const crossings: TerrainPoint[] = [];
        corners.forEach(([ra, ca], i) => {
          const [rb, cb] = corners[(i + 1) % 4];
          const va = h[ra * cols + ca];
          const vb = h[rb * cols + cb];
          if ((va < level) === (vb < level) || va === vb) return;
          const t = (level - va) / (vb - va);
          const a = at(ra, ca);
          const b = at(rb, cb);
          crossings.push({ lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t });
        });
        for (let k = 0; k + 1 < crossings.length; k += 2) {
          const [a, b] = [crossings[k], crossings[k + 1]];
          if (pointInPolygon([(a.lng + b.lng) / 2, (a.lat + b.lat) / 2], ring)) segments.push([a, b]);
        }
      }
    }
    const index = Math.round(level / interval) % indexEvery === 0;
    for (const points of joinSegments(segments)) out.push({ elevation: level, points, index });
  }
  return out;
}
