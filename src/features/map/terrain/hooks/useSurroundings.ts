import { useMemo } from 'react';
import type { ElevationGrid, TerrainAnalysis } from '../types';
import { surroundingsBounds } from '../utils/surroundings';
import { useElevationGrid } from './useElevationGrid';

/**
 * The heights of the land round a plot, for the 3D view. `null` while they
 * load; if they can't be had, the plot's own grid, so the view still opens.
 */
export function useSurroundings(analysis: TerrainAnalysis): ElevationGrid | null {
  const bounds = useMemo(() => surroundingsBounds(analysis.grid), [analysis.grid]);
  const query = useElevationGrid(bounds);
  if (query.data) return query.data.grid;
  return query.isError ? analysis.grid : null;
}
