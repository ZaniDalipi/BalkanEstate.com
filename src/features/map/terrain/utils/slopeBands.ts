/**
 * Finer slope ranges than the five classes, two or three per class, used to
 * label the map ("3–5%", "30–40%"). Edges are whole percents and line up with
 * the class edges, so every band belongs to exactly one class. Each band's
 * colour is the colour scale at the middle of its range.
 */
import type { SlopeClassId } from '../types';
import { rampHex } from './slopeRamp';

export interface SlopeBand {
  /** Lower bound, percent (inclusive). */
  min: number;
  /** Upper bound, percent (exclusive); Infinity for the last band. */
  max: number;
  color: string;
  classId: SlopeClassId;
}

const band = (min: number, max: number, classId: SlopeClassId): SlopeBand => ({
  min,
  max,
  classId,
  color: rampHex(Number.isFinite(max) ? (min + max) / 2 : min + 10),
});

export const SLOPE_BANDS: readonly SlopeBand[] = [
  band(0, 3, 'flat'),
  band(3, 5, 'gentle'),
  band(5, 8, 'gentle'),
  band(8, 11, 'moderate'),
  band(11, 15, 'moderate'),
  band(15, 20, 'steep'),
  band(20, 25, 'steep'),
  band(25, 30, 'verySteep'),
  band(30, 40, 'verySteep'),
  band(40, Infinity, 'verySteep'),
];

/** Index into SLOPE_BANDS for a slope in percent. */
export function slopeBandIndex(slopePct: number): number {
  const i = SLOPE_BANDS.findIndex((b) => slopePct < b.max);
  return i === -1 ? SLOPE_BANDS.length - 1 : i;
}

/** "3–5%", "40%+". */
export function bandLabel(band: SlopeBand): string {
  return Number.isFinite(band.max) ? `${band.min}–${band.max}%` : `${band.min}%+`;
}
