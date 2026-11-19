import { useMemo } from 'react';
import type { ElevationGrid, TerrainAnalysis } from '../types';
import type { Building } from '../utils/buildingFootprints';
import { buildingsArea, surroundingsBounds } from '../utils/surroundings';
import { useElevationGrid } from './useElevationGrid';
import { useNearbyBuildings } from './useNearbyBuildings';

export interface Surroundings {
  /** Heights of the land round the plot; null while they load. If they can't be had, the plot's own grid. */
  ground: ElevationGrid | null;
  /** The buildings near the plot; null while they load or if they can't be had. */
  buildings: Building[] | null;
}

/** The land and buildings round a plot, for the 3D view. */
export function useSurroundings(analysis: TerrainAnalysis): Surroundings {
  const bounds = useMemo(() => surroundingsBounds(analysis.grid), [analysis.grid]);
  const heights = useElevationGrid(bounds);
  const ground = heights.data ? heights.data.grid : heights.isError ? analysis.grid : null;
  const area = useMemo(() => (ground ? buildingsArea(analysis.grid, ground) : null), [ground, analysis.grid]);
  const buildings = useNearbyBuildings(area);
  return { ground, buildings: buildings.data ?? null };
}
