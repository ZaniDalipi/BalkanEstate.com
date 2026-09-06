import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { getPropertyPriceHistory } from '../api/priceHistoryApi';

/** The API validates :id as a Mongo ObjectId and rejects anything else with 400. */
const isObjectId = (value: string): boolean => /^[a-f\d]{24}$/i.test(value);

export function usePriceHistory(propertyId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.priceHistory(propertyId ?? ''),
    queryFn: () => getPropertyPriceHistory(propertyId!),
    enabled: !!propertyId && isObjectId(propertyId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    // httpClient attaches `statusCode` to its errors; a 4xx will never succeed
    // on retry, so only retry server/network failures.
    retry: (count, err: unknown) => {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });

  return { data: data ?? null, isLoading, error };
}
