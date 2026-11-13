/**
 * The headline numbers for a drawn area: size, height range, average and
 * steepest slope, and how the ground splits across the slope bands.
 */
import type { ElevationGrid, SlopeClassId, SlopeField, TerrainStats } from '../types';
import { SLOPE_CLASSES, slopeClassIndex } from './slopeClasses';

/** null when no cell inside the area has a height (all water or no data). */
export function computeTerrainStats(
  grid: ElevationGrid,
  inside: Uint8Array,
  field: SlopeField,
  areaM2: number,
): TerrainStats | null {
  const counts = SLOPE_CLASSES.map(() => 0);
  let measured = 0;
  let slopeSum = 0;
  let maxSlope = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let i = 0; i < inside.length; i++) {
    const h = grid.elevations[i];
    const s = field.slope[i];
    if (!inside[i] || h === null || Number.isNaN(s)) continue;
    measured++;
    slopeSum += s;
    if (s > maxSlope) maxSlope = s;
    if (h < minElevation) minElevation = h;
    if (h > maxElevation) maxElevation = h;
    counts[slopeClassIndex(s)]++;
  }
  if (measured === 0) return null;

  const classShares = Object.fromEntries(
    SLOPE_CLASSES.map((c, k) => [c.id, counts[k] / measured]),
  ) as Record<SlopeClassId, number>;

  return {
    areaM2,
    minElevation,
    maxElevation,
    meanSlope: slopeSum / measured,
    maxSlope,
    classShares,
  };
}
