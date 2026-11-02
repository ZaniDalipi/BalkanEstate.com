// useSavedNeighborhoodInsight — the insight the signed-in user already generated
// for a listing. Server-side it is scoped to the caller, and the user id is part
// of the cache key, so another account never sees it.

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../shared/api';
import { neighborhoodInsightKeys } from '@/src/shared/query/queryKeys';

interface SavedInsightResponse {
  insights: string | null;
}

export function useSavedNeighborhoodInsight(listingId?: string, userId?: string) {
  return useQuery<string | null>({
    queryKey: neighborhoodInsightKeys.saved(userId ?? '', listingId ?? ''),
    queryFn: async () => {
      const data = await apiRequest<SavedInsightResponse>(
        `/neighborhood-insights/saved/${encodeURIComponent(listingId as string)}`,
        { requiresAuth: true }
      );
      return data.insights;
    },
    enabled: Boolean(listingId && userId),
    staleTime: Infinity, // a saved insight never changes
    refetchOnWindowFocus: false,
    retry: false,
  });
}
