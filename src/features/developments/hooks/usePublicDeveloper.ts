import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { getPublicDeveloper } from '../api/developmentsApi';

/**
 * The company behind a residence and its other residences. Only asked for when
 * the residence names a builder (`enabled`); "no builder" (404) is an answer,
 * not something to retry.
 */
export function usePublicDeveloper(slug: string | undefined, enabled = true) {
  const query = useQuery({
    queryKey: developmentKeys.publicDeveloper(slug ?? ''),
    queryFn: () => getPublicDeveloper(slug as string),
    enabled: enabled && !!slug,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    residences: query.data?.residences ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
