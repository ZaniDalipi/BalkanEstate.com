/**
 * The plot's slope colours as flat shapes to lay on a 3D map: each row of the
 * grid split into runs of one slope band, each run cut to the drawn outline,
 * runs that repeat row after row joined into one. Pure.
 */
import type { GridBounds, TerrainAnalysis, TerrainPoint } from '../types';
import { SLOPE_BANDS, slopeBandIndex } from './slopeBands';

export interface SlopePatch {
  path: TerrainPoint[];
  color: string;
}

/** More shapes than this slow the 3D map down: the bands are then joined into the five classes. */
export const MAX_PATCHES = 600;

const CLASS_COLOR = new Map(SLOPE_BANDS.map((b) => [b.classId, b.color] as const));
type Edge = { inside: (p: TerrainPoint) => boolean; cut: (a: TerrainPoint, b: TerrainPoint) => TerrainPoint };

const atLat = (lat: number) => (a: TerrainPoint, b: TerrainPoint): TerrainPoint =>
  ({ lat, lng: a.lng + ((b.lng - a.lng) * (lat - a.lat)) / (b.lat - a.lat) });
const atLng = (lng: number) => (a: TerrainPoint, b: TerrainPoint): TerrainPoint =>
  ({ lng, lat: a.lat + ((b.lat - a.lat) * (lng - a.lng)) / (b.lng - a.lng) });

/** The part of `polygon` inside `box` (Sutherland–Hodgman: any outline against a rectangle). */
export function clipToBox(polygon: TerrainPoint[], box: GridBounds): TerrainPoint[] {
  const edges: Edge[] = [
    { inside: (p) => p.lat <= box.north, cut: atLat(box.north) },
    { inside: (p) => p.lat >= box.south, cut: atLat(box.south) },
    { inside: (p) => p.lng >= box.west, cut: atLng(box.west) },
    { inside: (p) => p.lng <= box.east, cut: atLng(box.east) },
  ];
  let out = polygon;
  for (const edge of edges) {
    const input = out;
    out = [];
    input.forEach((cur, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      if (edge.inside(cur)) {
        if (!edge.inside(prev)) out.push(edge.cut(prev, cur));
        out.push(cur);
      } else if (edge.inside(prev)) {
        out.push(edge.cut(prev, cur));
      }
    });
    if (!out.length) return out;
  }
  return out;
}

interface Run { from: number; to: number; key: number; rowFrom: number; rowTo: number }

/** Runs of one key along each row, joined down the rows where they line up exactly. */
function runs(analysis: TerrainAnalysis, keyOf: (slope: number) => number): Run[] {
  const { grid, inside, field } = analysis;
  const done: Run[] = [];
  let open: Run[] = [];
  for (let r = 0; r < grid.rows; r++) {
    const row: Run[] = [];
    for (let c = 0; c < grid.cols; c++) {
      const i = r * grid.cols + c;
      const slope = field.slope[i];
      if (!inside[i] || Number.isNaN(slope)) continue;
      const key = keyOf(slope);
      const last = row[row.length - 1];
      if (last && last.key === key && last.to === c - 1) last.to = c;
      else row.push({ from: c, to: c, key, rowFrom: r, rowTo: r });
    }
    const next: Run[] = [];
    for (const run of row) {
      const above = open.find((o) => o.from === run.from && o.to === run.to && o.key === run.key);
      if (above) { above.rowTo = r; next.push(above); } else next.push(run);
    }
    done.push(...open.filter((o) => !next.includes(o)));
    open = next;
  }
  return [...done, ...open];
}

export function slopePatches(analysis: TerrainAnalysis, polygon: TerrainPoint[]): SlopePatch[] {
  const { grid } = analysis;
  let found = runs(analysis, slopeBandIndex);
  let colorOf = (key: number) => SLOPE_BANDS[key].color;
  if (found.length > MAX_PATCHES) {
    const classes = [...new Set(SLOPE_BANDS.map((b) => b.classId))];
    found = runs(analysis, (s) => classes.indexOf(SLOPE_BANDS[slopeBandIndex(s)].classId));
    colorOf = (key) => CLASS_COLOR.get(classes[key]) ?? SLOPE_BANDS[0].color;
  }
  const dLat = (grid.north - grid.south) / grid.rows;
  const dLng = (grid.east - grid.west) / grid.cols;
  return found
    .map((run) => ({
      color: colorOf(run.key),
      path: clipToBox(polygon, {
        north: grid.north - run.rowFrom * dLat,
        south: grid.north - (run.rowTo + 1) * dLat,
        west: grid.west + run.from * dLng,
        east: grid.west + (run.to + 1) * dLng,
      }),
    }))
    .filter((p) => p.path.length >= 3);
}
