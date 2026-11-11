/**
 * Everything the terrain tool shows for a drawn area, from the heights grid:
 * slope of each cell, headline numbers, downhill arrows, slope labels and the
 * best place to build.
 */
import { calculatePolygonArea } from '../../hooks/useMeasurement';
import type { ElevationGrid, TerrainAnalysisResult, TerrainPoint } from '../types';
import { findBuildSpot } from './buildSpot';
import { insideMask } from './gridGeometry';
import { slopeArrows } from './slopeArrows';
import { slopeLabels } from './slopeLabels';
import { computeSlopeField } from './slopeField';
import { computeTerrainStats } from './terrainStats';

export function analyzeTerrain(grid: ElevationGrid, polygon: TerrainPoint[]): TerrainAnalysisResult {
  const inside = insideMask(grid, polygon);
  const field = computeSlopeField(grid);
  const stats = computeTerrainStats(grid, inside, field, calculatePolygonArea(polygon));
  if (!stats) return { ok: false, error: 'noData' };
  return {
    ok: true,
    value: {
      grid,
      inside,
      field,
      stats,
      arrows: slopeArrows(grid, inside, field),
      labels: slopeLabels(grid, inside, field),
      buildSpot: findBuildSpot(grid, inside, field),
    },
  };
}
