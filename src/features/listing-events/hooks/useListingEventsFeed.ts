import { useQuery } from '@tanstack/react-query';
import { listingEventKeys } from '@/src/shared/query/queryKeys';
import { fetchUpcomingEventListings } from '../api/eventFeedApi';

/** Upcoming open houses and auctions for the home page (empty is a fine answer). */
export function useListingEventsFeed(country: string | undefined, limit = 8) {
  return useQuery({
    queryKey: listingEventKeys.feed(country ?? 'any', limit),
    queryFn: () => fetchUpcomingEventListings(limit, country),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
