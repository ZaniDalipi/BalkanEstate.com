/**
 * How far the plot falls: its highest and lowest ground, how much lower the
 * one is, over how far, and the average grade between them. Shown on the 3D
 * map so a steep plot reads as steep. Pure.
 */
import type { TerrainAnalysis, TerrainPoint } from '../types';
import { cellCenter, metresBetween } from './gridGeometry';

/** A fall smaller than this is level ground: nothing to show. */
export const MIN_FALL_M = 1;

export interface SpotHeight extends TerrainPoint {
  elevation: number;
}

export interface SlopeFall {
  high: SpotHeight;
  low: SpotHeight;
  /** Metres from the highest ground down to the lowest. */
  dropM: number;
  /** Metres between them across the ground. */
  runM: number;
  /** Average grade between them, percent (0 when they coincide). */
  gradePct: number;
}

/** null when the plot has no heights inside it. */
export function slopeFall(analysis: TerrainAnalysis): SlopeFall | null {
  const { grid, inside } = analysis;
  let hi = -1;
  let lo = -1;
  grid.elevations.forEach((e, i) => {
    if (!inside[i] || e === null) return;
    if (hi < 0 || e > (grid.elevations[hi] as number)) hi = i;
    if (lo < 0 || e < (grid.elevations[lo] as number)) lo = i;
  });
  if (hi < 0 || lo < 0) return null;
  const high = { ...cellCenter(grid, hi), elevation: grid.elevations[hi] as number };
  const low = { ...cellCenter(grid, lo), elevation: grid.elevations[lo] as number };
  const dropM = high.elevation - low.elevation;
  const runM = metresBetween(high, low);
  return { high, low, dropM, runM, gradePct: runM > 0 ? (dropM / runM) * 100 : 0 };
}

/** Points along the straight line from `a` to `b`, so a line laid on the ground follows it. */
export function pointsBetween(a: TerrainPoint, b: TerrainPoint, steps: number): TerrainPoint[] {
  return Array.from({ length: steps + 1 }, (_, i) => ({
    lat: a.lat + ((b.lat - a.lat) * i) / steps,
    lng: a.lng + ((b.lng - a.lng) * i) / steps,
  }));
}
