import { useQuery } from '@tanstack/react-query';
import { businessDirectoryKeys } from '../api/businessDirectoryKeys';
import { getTravelRoute } from '../api/businessExtrasApi';
import { roundPoint, type LatLng, type TravelMode } from '../utils/travel';

/**
 * The route from the visitor to the business for a travel mode. Not fetched
 * until both points are known. "No route" and "router down" are both normal
 * answers here (the page falls back to straight-line distance), so no retries.
 */
export function useTravelRoute(from: LatLng | null, to: LatLng | null, mode: TravelMode) {
  const a = from && roundPoint(from);
  const b = to && roundPoint(to);
  return useQuery({
    queryKey: a && b ? businessDirectoryKeys.route(a, b, mode) : [...businessDirectoryKeys.all, 'route', 'none'],
    queryFn: () => getTravelRoute(a!, b!, mode),
    enabled: !!a && !!b,
    retry: false,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}
