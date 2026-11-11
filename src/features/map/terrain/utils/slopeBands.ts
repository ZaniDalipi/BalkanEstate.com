/**
 * The finer shades the slope map is painted in: two or three per slope class,
 * so the ground reads as a relief from green to red instead of five flat
 * blocks, and slopes that differ by a couple of percent still show apart.
 * Edges are whole percents and line up with the class edges, so every band
 * belongs to exactly one class.
 */
import type { SlopeClassId } from '../types';

export interface SlopeBand {
  /** Lower bound, percent (inclusive). */
  min: number;
  /** Upper bound, percent (exclusive); Infinity for the last band. */
  max: number;
  color: string;
  classId: SlopeClassId;
}

export const SLOPE_BANDS: readonly SlopeBand[] = [
  { min: 0, max: 3, color: '#2fbf71', classId: 'flat' },
  { min: 3, max: 5, color: '#86d33b', classId: 'gentle' },
  { min: 5, max: 8, color: '#bcd935', classId: 'gentle' },
  { min: 8, max: 11, color: '#f2d02f', classId: 'moderate' },
  { min: 11, max: 15, color: '#f5b52c', classId: 'moderate' },
  { min: 15, max: 20, color: '#f59532', classId: 'steep' },
  { min: 20, max: 25, color: '#ef7a2d', classId: 'steep' },
  { min: 25, max: 30, color: '#e8562f', classId: 'verySteep' },
  { min: 30, max: 40, color: '#d63b2c', classId: 'verySteep' },
  { min: 40, max: Infinity, color: '#ad2329', classId: 'verySteep' },
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
