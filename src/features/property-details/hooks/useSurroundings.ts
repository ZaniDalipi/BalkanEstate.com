import { useQuery } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { getSurroundings } from '../api/surroundingsApi';
import { isObjectId } from './isObjectId';

export function useSurroundings(propertyId: string | null | undefined) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: propertyKeys.surroundings(propertyId ?? ''),
    queryFn: () => getSurroundings(propertyId!),
    enabled: !!propertyId && isObjectId(propertyId),
    // Roads and railways rarely change
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (count, err: unknown) => {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) return false;
      return count < 1;
    },
  });

  return { data: data ?? null, isLoading, error, refetch, isFetching };
}
