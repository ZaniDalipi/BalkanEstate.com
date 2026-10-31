/**
 * Carrying the regions of one picture of a building over to another picture of
 * it (front → left, left → right mirrored, …). The pictures differ in
 * perspective, so the copy is only a head start: it can be mirrored, resized
 * about its own centre and moved, then the owner fine-tunes it. Pure geometry on
 * the normalised 0–1 coordinates.
 */
import type { Hotspot } from '../types';
import { polygonBounds, type Point } from './polygonGeometry';

export interface TransferOptions {
  /** Mirror left ↔ right across the picture (the opposite side of a symmetrical building). */
  mirror: boolean;
  /** Size of the group, 100 = unchanged. */
  sizePct: number;
  /** Move to the right (+) or left (−), % of the picture width. */
  moveXPct: number;
  /** Move down (+) or up (−), % of the picture height. */
  moveYPct: number;
}

export const MIN_SIZE_PCT = 10;
export const MAX_SIZE_PCT = 300;
export const MAX_MOVE_PCT = 100;

export type TransferFieldProblem = 'size' | 'moveX' | 'moveY';

const num = (raw: string): number => (raw.trim() === '' ? Number.NaN : Number(raw.trim().replace(',', '.')));

/** The three numeric fields of the form; names the first one that is wrong. */
export function validateTransferFields(size: string, moveX: string, moveY: string):
  | { ok: true; sizePct: number; moveXPct: number; moveYPct: number }
  | { ok: false; problem: TransferFieldProblem } {
  const s = num(size);
  if (!Number.isFinite(s) || s < MIN_SIZE_PCT || s > MAX_SIZE_PCT) return { ok: false, problem: 'size' };
  const x = num(moveX);
  if (!Number.isFinite(x) || Math.abs(x) > MAX_MOVE_PCT) return { ok: false, problem: 'moveX' };
  const y = num(moveY);
  if (!Number.isFinite(y) || Math.abs(y) > MAX_MOVE_PCT) return { ok: false, problem: 'moveY' };
  return { ok: true, sizePct: s, moveXPct: x, moveYPct: y };
}

const EPS = 1e-9;

/** A rect stores two opposite corners as (min, max); keep that after mirroring or resizing. */
const orderRect = (pts: Point[]): Point[] => {
  const [[x0, y0], [x1, y1]] = pts;
  return [[Math.min(x0, x1), Math.min(y0, y1)], [Math.max(x0, x1), Math.max(y0, y1)]];
};

/**
 * Copies of `source` for another picture, with `ids` as their new ids (one per
 * region, in order). `keepLinks` false clears what each region links to. Fails
 * with `outside` when the transformed group would leave the picture (nothing is
 * squashed against the edge).
 */
export function transferHotspots(
  source: Hotspot[],
  opts: TransferOptions,
  keepLinks: boolean,
  ids: string[]
): { ok: true; hotspots: Hotspot[] } | { ok: false; problem: 'outside' } {
  const all = source.flatMap((h) => h.points as Point[]);
  if (all.length === 0) return { ok: true, hotspots: [] };

  const flipped = (p: Point): Point => (opts.mirror ? [1 - p[0], p[1]] : p);
  const b = polygonBounds(all.map(flipped));
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const k = opts.sizePct / 100;
  const dx = opts.moveXPct / 100;
  const dy = opts.moveYPct / 100;
  const place = (p: Point): Point => {
    const [fx, fy] = flipped(p);
    return [cx + (fx - cx) * k + dx, cy + (fy - cy) * k + dy];
  };

  const hotspots: Hotspot[] = [];
  for (let i = 0; i < source.length; i += 1) {
    const h = source[i];
    let points = (h.points as Point[]).map(place);
    if (h.shape === 'rect') points = orderRect(points);
    else if (opts.mirror) points = [...points].reverse(); // a mirrored outline runs the other way round
    if (points.some(([x, y]) => x < -EPS || x > 1 + EPS || y < -EPS || y > 1 + EPS)) return { ok: false, problem: 'outside' };
    hotspots.push({ ...h, id: ids[i], points, ...(keepLinks ? {} : { linkId: '' }) });
  }
  return { ok: true, hotspots };
}
