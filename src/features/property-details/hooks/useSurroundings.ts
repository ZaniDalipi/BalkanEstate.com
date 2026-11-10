import { useQuery, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '@/src/shared/query/queryKeys';
import { getSurroundings } from '../api/surroundingsApi';
import { isPropertyId } from './isPropertyId';

/** While the server is still looking a home up, ask again this often… */
export const PENDING_POLL_MS = 5_000;
/** …but no more than this many times (a few minutes), then offer a retry. */
export const MAX_PENDING_POLLS = 24;

export function useSurroundings(propertyId: string | null | undefined) {
  const queryClient = useQueryClient();
  const queryKey = propertyKeys.surroundings(propertyId ?? '');
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => getSurroundings(propertyId!),
    enabled: !!propertyId && isPropertyId(propertyId),
    // Roads and railways rarely change
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    // The first lookup of a home can take the public map servers a while;
    // the server answers "pending" meanwhile and we ask again.
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' && query.state.dataUpdateCount < MAX_PENDING_POLLS ? PENDING_POLL_MS : false,
    retry: (count, err: unknown) => {
      const status = (err as { statusCode?: number } | null)?.statusCode;
      if (typeof status === 'number' && status >= 400 && status < 500) return false;
      return count < 1;
    },
  });

  const pending = data?.status === 'pending';
  // Re-read on every render; each poll's answer re-renders the card.
  const polls = queryClient.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  const gaveUp = pending && !error && polls >= MAX_PENDING_POLLS && !isFetching;
  return {
    data: data ?? null,
    /** Loading, or the server is still looking the home up. */
    isWaiting: isLoading || (pending && !error && !gaveUp),
    /** Still pending after every poll: offer a retry instead of waiting on. */
    gaveUp,
    error,
    refetch,
    isFetching,
  };
}
