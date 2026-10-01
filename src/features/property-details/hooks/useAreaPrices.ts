import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { getAreaPrices } from '../api/areaPricesApi';

/** The API validates :id as a Mongo ObjectId and rejects anything else with 400. */
const isObjectId = (value: string): boolean => /^[a-f\d]{24}$/i.test(value);

export function useAreaPrices(propertyId: string | null | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: propertyKeys.areaPrices(propertyId ?? ''),
    queryFn: () => getAreaPrices(propertyId!),
    enabled: !!propertyId && isObjectId(propertyId),
    // Neighbourhood prices move slowly
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (count, err: unknown) => {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) return false;
      return count < 2;
    },
  });

  return { data: data ?? null, isLoading, error };
}
