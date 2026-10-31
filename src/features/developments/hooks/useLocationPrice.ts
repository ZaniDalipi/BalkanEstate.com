import { useQuery } from '@tanstack/react-query';
import { getCityMarketData } from '@/src/features/cities/api/cityApi';

/**
 * The city's average for-sale price per m² (the same figure the city pages
 * show), used to tell buyers when an apartment is a bargain for the location.
 * Many towns have no market data (404): that is an answer, not an error, so it
 * is not retried and the caller falls back to the residence's own average.
 */
export function useLocationPrice(city?: string, country?: string) {
  const q = useQuery({
    queryKey: ['developments', 'locationPrice', city, country],
    queryFn: async () => (await getCityMarketData(city as string, country as string)).avgPricePerSqm,
    enabled: !!city && !!country,
    staleTime: 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const value = typeof q.data === 'number' && Number.isFinite(q.data) && q.data > 0 ? q.data : null;
  return { pricePerSqm: value, isLoading: q.isLoading && q.fetchStatus !== 'idle' };
}
