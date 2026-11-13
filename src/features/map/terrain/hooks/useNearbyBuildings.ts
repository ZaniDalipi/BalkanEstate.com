import { useQuery } from '@tanstack/react-query';
import { terrainKeys } from '@/src/shared/query/queryKeys';
import { fetchBuildings } from '../api/buildingsApi';
import type { GridBounds } from '../types';

/** The buildings in a box, for the 3D view; idle until there is a box. Not retried: the view works without them. */
export function useNearbyBuildings(area: GridBounds | null) {
  return useQuery({
    queryKey: area ? terrainKeys.buildings(area) : terrainKeys.all,
    queryFn: () => fetchBuildings(area as GridBounds),
    enabled: area !== null,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}
