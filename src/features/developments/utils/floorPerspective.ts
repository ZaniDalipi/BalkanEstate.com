/**
 * How each apartment column moves from one floor to the next in a photo taken
 * at an angle. A region on the top drawn floor is paired with the same column
 * on another drawn floor (same apartment number ending, else the region that
 * overlaps it most horizontally); the pair gives its own step up, sideways
 * drift and shrink per floor. Columns without a pair use the measured steps of
 * the others scaled by their own height, else their height plus the slab.
 * Pure geometry on the normalised 0–1 picture coordinates.
 */
import type { Hotspot } from '../types';
import { polygonBounds, type Point } from './polygonGeometry';
import { unitPosition, type LevelGroup } from './floorLevels';

/** One floor up from the region's own floor: move the centre by (dx, dy) and scale about it by (sx, sy); each further step is scaled the same way. */
export interface FloorMotion { dx: number; dy: number; sx: number; sy: number }
export type PlacementQuality = 'measured' | 'partial' | 'estimated';

/** Height of a floor relative to the region on it, when nothing was measured (a slab and a little wall). */
export const FALLBACK_PITCH = 1.25;
const MIN_SCALE = 0.7;
const MAX_SCALE = 1.3;

const box = (h: Hotspot) => polygonBounds(h.points as Point[]);
const centre = (pts: Point[]): Point => { const b = polygonBounds(pts); return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2]; };
const clampScale = (s: number) => (Number.isFinite(s) && s > 0 ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)) : 1);
const xOverlap = (a: Hotspot, b: Hotspot) => {
  const p = box(a), q = box(b);
  const inter = Math.min(p.maxX, q.maxX) - Math.max(p.minX, q.minX);
  return inter / Math.max(1e-9, Math.min(p.maxX - p.minX, q.maxX - q.minX));
};

/** The region of `others` in the same column as `h`: same number ending, else the best horizontal overlap (≥ half). */
export function columnPartner(h: Hotspot, others: Hotspot[], numberOf: ReadonlyMap<string, string>): Hotspot | undefined {
  if (h.linkType === 'floor') return others.find((o) => o.linkType === 'floor');
  const pos = h.linkType === 'unit' ? unitPosition(numberOf.get(h.linkId) ?? '') : null;
  if (pos !== null) {
    const same = others.find((o) => o.linkType === 'unit' && unitPosition(numberOf.get(o.linkId) ?? '') === pos);
    if (same) return same;
  }
  const best = others.filter((o) => o.linkType !== 'floor').map((o) => ({ o, f: xOverlap(h, o) })).sort((a, b) => b.f - a.f)[0];
  return best && best.f >= 0.5 ? best.o : undefined;
}

/**
 * The motion of `from`'s column from `from`'s floor one floor up, measured
 * against the same column on another floor (`to`, any other level). Floors
 * further from the camera look smaller and closer together, so above the
 * measured pair the step keeps shrinking by the same factor.
 */
export function measureMotion(from: Hotspot, fromLevel: number, to: Hotspot, toLevel: number): FloorMotion {
  const [lo, hi, n] = fromLevel < toLevel ? [from, to, toLevel - fromLevel] : [to, from, fromLevel - toLevel];
  const l = box(lo), u = box(hi);
  const sx = clampScale(((u.maxX - u.minX) / (l.maxX - l.minX)) ** (1 / n));
  const sy = clampScale(((u.maxY - u.minY) / (l.maxY - l.minY)) ** (1 / n));
  const dx = ((u.minX + u.maxX) / 2 - (l.minX + l.maxX) / 2) / n;
  const dy = ((u.minY + u.maxY) / 2 - (l.minY + l.maxY) / 2) / n;
  // Measured from the upper one: its next step up is one perspective step smaller.
  return fromLevel > toLevel ? { dx: dx * sx, dy: dy * sy, sx, sy } : { dx, dy, sx, sy };
}

/**
 * Each region's motion on the floors that can be copied (level ≥ 1; the ground
 * floor is shaped differently and never measured), and how much of it was
 * measured rather than guessed.
 */
export function columnMotions(groups: LevelGroup[], numberOf: ReadonlyMap<string, string>): { motions: Map<string, FloorMotion>; quality: PlacementQuality } {
  const upper = groups.filter((g) => g.level >= 1);
  const motions = new Map<string, FloorMotion>();
  let measured = 0, total = 0;
  for (const g of upper) {
    const neighbour = upper.filter((o) => o !== g).sort((a, b) => Math.abs(a.level - g.level) - Math.abs(b.level - g.level) || a.level - b.level)[0];
    const own = new Map<string, FloorMotion>();
    for (const h of g.regions) {
      const p = neighbour && columnPartner(h, neighbour.regions, numberOf);
      if (p && neighbour) own.set(h.id, measureMotion(h, g.level, p, neighbour.level));
    }
    // Unpaired regions: the paired ones' step, scaled by the region's own height.
    const paired = g.regions.filter((h) => own.has(h.id));
    const meanH = paired.reduce((s, h) => s + (box(h).maxY - box(h).minY), 0) / Math.max(1, paired.length);
    const meanDy = paired.reduce((s, h) => s + (own.get(h.id) as FloorMotion).dy, 0) / Math.max(1, paired.length);
    for (const h of g.regions) {
      total += 1;
      if (own.has(h.id)) { measured += 1; motions.set(h.id, own.get(h.id) as FloorMotion); continue; }
      const height = box(h).maxY - box(h).minY;
      const dy = paired.length > 0 ? meanDy * (height / meanH) : -height * FALLBACK_PITCH;
      motions.set(h.id, { dx: 0, dy, sx: 1, sy: 1 });
    }
  }
  const quality: PlacementQuality = total > 0 && measured === total ? 'measured' : measured > 0 ? 'partial' : 'estimated';
  return { motions, quality };
}

/** `points` moved `floors` floors up (negative: down) by `m`, with every step `spacing` times as long. */
export function moveByFloors(points: Point[], m: FloorMotion, floors: number, spacing = 1): Point[] {
  let pts = points;
  let d: Point = [m.dx * spacing, m.dy * spacing];
  const up = floors > 0;
  if (!up) d = [d[0] / m.sx, d[1] / m.sy];
  for (let i = 0; i < Math.abs(floors); i += 1) {
    const [cx, cy] = centre(pts);
    const [kx, ky] = up ? [m.sx, m.sy] : [1 / m.sx, 1 / m.sy];
    const [tx, ty] = up ? d : [-d[0], -d[1]];
    pts = pts.map(([x, y]) => [cx + (x - cx) * kx + tx, cy + (y - cy) * ky + ty] as Point);
    d = up ? [d[0] * m.sx, d[1] * m.sy] : [d[0] / m.sx, d[1] / m.sy];
  }
  return pts;
}

/** Outline of a whole floor around its regions: the convex hull, so an angled corner view gets a band, not a box. */
export function floorHull(points: Point[]): Point[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const h: Point[] = [];
    for (const p of list) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...half(pts), ...half([...pts].reverse())];
}
