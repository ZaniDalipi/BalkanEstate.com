import { useQuery } from '@tanstack/react-query';
import { listingEventKeys } from '@/src/shared/query/queryKeys';
import { fetchOpenHousesThisWeek } from '../api/eventFeedApi';
import { thisWeekRange } from '../utils/thisWeekRange';
import { openHousesThisWeek } from '../utils/weekOpenHouses';

/**
 * Open houses this week for the home page (empty is a fine answer). The key
 * carries the week's end, so a new week fetches a new list.
 */
export function useOpenHousesThisWeek(country: string | undefined, limit = 8) {
  const weekEnd = thisWeekRange(new Date()).to.toISOString();
  return useQuery({
    queryKey: listingEventKeys.feed(country ?? 'any', limit, weekEnd),
    queryFn: async () => openHousesThisWeek(await fetchOpenHousesThisWeek(limit, country, new Date()), new Date()),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
