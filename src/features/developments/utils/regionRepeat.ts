/**
 * Repeating a region across a facade (one apartment outline copied down every
 * floor, or along a row). Pure geometry on the normalised 0–1 picture
 * coordinates, so the editor, its form and the tests share one set of rules.
 */
import { polygonBounds, type Point } from './polygonGeometry';

export type RepeatDirection = 'down' | 'up' | 'right' | 'left';

export const MAX_REPEAT_COPIES = 40;
/** Spacing limits, as a percentage of the picture's height (down/up) or width (left/right). */
export const MIN_REPEAT_STEP_PCT = 0.5;
export const MAX_REPEAT_STEP_PCT = 90;

export const isVertical = (d: RepeatDirection): boolean => d === 'down' || d === 'up';

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * A sensible first spacing: the region's own height (or width) plus the slab or
 * gap between neighbours. The owner then adjusts it to the real floor height.
 */
export function defaultStepPct(points: Point[], direction: RepeatDirection): number {
  const b = polygonBounds(points);
  const size = isVertical(direction) ? b.maxY - b.minY : b.maxX - b.minX;
  const pct = size * 100 * (isVertical(direction) ? 1.25 : 1.15);
  return Math.min(MAX_REPEAT_STEP_PCT, Math.max(MIN_REPEAT_STEP_PCT, round1(pct)));
}

export type RepeatProblem = 'count' | 'step';

/** Whole number of copies in 1…MAX and a spacing in range; otherwise which field is wrong. */
export function validateRepeat(count: string, stepPct: string): { ok: true; count: number; stepPct: number } | { ok: false; problem: RepeatProblem } {
  const n = Number(count.trim());
  if (count.trim() === '' || !Number.isInteger(n) || n < 1 || n > MAX_REPEAT_COPIES) return { ok: false, problem: 'count' };
  const step = Number(stepPct.trim().replace(',', '.'));
  if (stepPct.trim() === '' || !Number.isFinite(step) || step < MIN_REPEAT_STEP_PCT || step > MAX_REPEAT_STEP_PCT) return { ok: false, problem: 'step' };
  return { ok: true, count: n, stepPct: step };
}

/** Offset (normalised) between one copy and the next. */
export function stepVector(direction: RepeatDirection, stepPct: number): [number, number] {
  const s = stepPct / 100;
  return direction === 'down' ? [0, s] : direction === 'up' ? [0, -s] : direction === 'right' ? [s, 0] : [-s, 0];
}

const EPS = 1e-9;

/**
 * The copies that fit: copy k is the region moved by k steps, and the walk stops
 * at the first one that would leave the picture (nothing is squashed against the
 * edge). `wanted - copies.length` is how many were left out.
 */
export function repeatPoints(points: Point[], direction: RepeatDirection, stepPct: number, wanted: number): Point[][] {
  const [dx, dy] = stepVector(direction, stepPct);
  const b = polygonBounds(points);
  const copies: Point[][] = [];
  for (let k = 1; k <= wanted; k += 1) {
    const mx = dx * k;
    const my = dy * k;
    const inside = b.minX + mx >= -EPS && b.maxX + mx <= 1 + EPS && b.minY + my >= -EPS && b.maxY + my <= 1 + EPS;
    if (!inside) break;
    copies.push(points.map(([x, y]) => [x + mx, y + my] as Point));
  }
  return copies;
}
