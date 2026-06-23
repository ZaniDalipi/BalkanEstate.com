import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { getPropertyPriceHistory } from '../api/priceHistoryApi';

export function usePriceHistory(propertyId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.priceHistory(propertyId ?? ''),
    queryFn: () => getPropertyPriceHistory(propertyId!),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (count, err: any) => err?.response?.status !== 404 && count < 2,
  });

  return { data: data ?? null, isLoading, error };
}
