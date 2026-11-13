/**
 * The five slope bands used across the terrain tool, from easy ground to
 * ground that is hard to build on. Thresholds follow common site-planning
 * practice: under 3 % is effectively flat, 8 % is about the limit for an
 * ordinary driveway and slab, 15 % needs split levels or terraces, and past
 * 25 % retaining walls and special foundations dominate the cost.
 */
import type { SlopeClassId } from '../types';
import { rampHex } from './slopeRamp';

export interface SlopeClass {
  id: SlopeClassId;
  /** Lower bound, percent (inclusive). */
  min: number;
  /** Upper bound, percent (exclusive); Infinity for the last band. */
  max: number;
  /** The class's colour in the legend: the colour scale at a typical slope of the class. */
  color: string;
}

export const SLOPE_CLASSES: readonly SlopeClass[] = [
  { id: 'flat', min: 0, max: 3, color: rampHex(1.5) },
  { id: 'gentle', min: 3, max: 8, color: rampHex(5.5) },
  { id: 'moderate', min: 8, max: 15, color: rampHex(11.5) },
  { id: 'steep', min: 15, max: 25, color: rampHex(20) },
  { id: 'verySteep', min: 25, max: Infinity, color: rampHex(33) },
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
