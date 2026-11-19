/**
 * The colours of the buildings round the plot: plastered walls in the
 * whites, creams and pale ochres of Balkan towns, terracotta tile roofs,
 * concrete on flat roofs. Each building keeps its own colour every time it
 * is drawn (chosen from its outline). Pure.
 */
import type { TerrainPoint } from '../types';

export const WALL_COLOURS = ['#f1ece3', '#ebe0cc', '#f4f1ea', '#e8d6c0', '#ddd8cf', '#efe3cb', '#e6d9c8', '#f0e6dc'] as const;
export const TILE_COLOURS = ['#b4563a', '#a54d32', '#c0673f', '#94493a', '#b8603f', '#8c4630'] as const;
export const FLAT_ROOF_COLOURS = ['#9a968f', '#a8a39b', '#8e8b86'] as const;

/** A steady whole number from an outline: the same building always gets the same colours. */
export function buildingSeed(ring: TerrainPoint[]): number {
  let h = 2166136261;
  for (const p of ring) {
    for (const v of [p.lat, p.lng]) {
      h ^= Math.round(v * 1e6);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
}

const pick = <T,>(list: readonly T[], seed: number): T => list[seed % list.length];

export const wallColour = (seed: number): string => pick(WALL_COLOURS, seed);
export const roofColour = (seed: number, flat: boolean): string =>
  flat ? pick(FLAT_ROOF_COLOURS, seed >>> 8) : pick(TILE_COLOURS, seed >>> 8);
