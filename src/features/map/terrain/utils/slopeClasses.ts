/**
 * The five slope bands used across the terrain tool, from easy ground to
 * ground that is hard to build on. Thresholds follow common site-planning
 * practice: under 3 % is effectively flat, 8 % is about the limit for an
 * ordinary driveway and slab, 15 % needs split levels or terraces, and past
 * 25 % retaining walls and special foundations dominate the cost.
 */
import type { SlopeClassId } from '../types';

export interface SlopeClass {
  id: SlopeClassId;
  /** Lower bound, percent (inclusive). */
  min: number;
  /** Upper bound, percent (exclusive); Infinity for the last band. */
  max: number;
  /** Legend colour; the map uses the finer shades in slopeBands. */
  color: string;
}

export const SLOPE_CLASSES: readonly SlopeClass[] = [
  { id: 'flat', min: 0, max: 3, color: '#2fbf71' },
  { id: 'gentle', min: 3, max: 8, color: '#a3d638' },
  { id: 'moderate', min: 8, max: 15, color: '#f4c22e' },
  { id: 'steep', min: 15, max: 25, color: '#f2882f' },
  { id: 'verySteep', min: 25, max: Infinity, color: '#d63b2c' },
];

/** Ground up to this slope counts as easy to build on. */
export const EASY_BUILD_MAX_SLOPE = 8;
/** Ground up to this slope can be built on with some earthworks. */
export const WORKABLE_BUILD_MAX_SLOPE = 15;
/** Below this the ground has no meaningful downhill direction. */
export const FLAT_SLOPE = 3;

/** Index into SLOPE_CLASSES for a slope in percent. */
export function slopeClassIndex(slopePct: number): number {
  const i = SLOPE_CLASSES.findIndex((c) => slopePct < c.max);
  return i === -1 ? SLOPE_CLASSES.length - 1 : i;
}

export function classifySlope(slopePct: number): SlopeClassId {
  return SLOPE_CLASSES[slopeClassIndex(slopePct)].id;
}

/** "3–8%", "25%+" — the band's range for labels. */
export function slopeRangeLabel(c: SlopeClass): string {
  return Number.isFinite(c.max) ? `${c.min}–${c.max}%` : `${c.min}%+`;
}
