import { useQuery } from '@tanstack/react-query';
import { terrainKeys } from '@/src/shared/query/queryKeys';
import { fetchElevationGrid } from '../api/terrainApi';
import type { GridBounds } from '../types';
import { shouldRetryTerrain } from '../utils/terrainPhase';

/** Heights over a box; idle until there is a box. Ground heights never go stale. */
export function useElevationGrid(bounds: GridBounds | null) {
  return useQuery({
    queryKey: bounds ? terrainKeys.grid(bounds) : terrainKeys.all,
    queryFn: () => fetchElevationGrid(bounds as GridBounds),
    enabled: bounds !== null,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetryTerrain,
  });
}
