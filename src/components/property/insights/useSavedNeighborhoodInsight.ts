// useSavedNeighborhoodInsight — the insight the signed-in user already generated
// for a listing. Server-side it is scoped to the caller, and the user id is part
// of the cache key, so another account never sees it.

import { useQuery } from '@tanstack/react-query';
import { neighborhoodInsightKeys } from '@/src/shared/query/queryKeys';
import { fetchSavedNeighborhoodInsight } from './neighborhoodInsightsApi';

export function useSavedNeighborhoodInsight(listingId?: string, userId?: string) {
  return useQuery<string | null>({
    queryKey: neighborhoodInsightKeys.saved(userId ?? '', listingId ?? ''),
    queryFn: () => fetchSavedNeighborhoodInsight(listingId as string),
    enabled: Boolean(listingId && userId),
    staleTime: Infinity, // a saved insight never changes
    refetchOnWindowFocus: false,
    retry: false,
  });
}
