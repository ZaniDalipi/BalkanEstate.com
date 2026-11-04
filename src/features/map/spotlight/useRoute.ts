import { useQuery } from '@tanstack/react-query';
import { spotlightKeys } from '@/src/shared/query/queryKeys';
import { fetchRoute, type RouteResult } from './fetchRoute';
import type { LatLng, TravelMode } from './spotlightUtils';

/** The route from `origin` (null: none chosen yet) to the listing. Cached per trip and mode. */
export function useRoute(origin: LatLng | null, destination: LatLng, mode: TravelMode) {
  return useQuery<RouteResult>({
    queryKey: origin ? spotlightKeys.route(origin, destination, mode) : spotlightKeys.all,
    queryFn: () => fetchRoute(origin as LatLng, destination, mode),
    enabled: !!origin,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}
