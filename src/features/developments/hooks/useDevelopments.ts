import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  listMyDevelopments,
  listPublicDevelopments,
  type PublicListFilters,
} from '../api/developmentsApi';

/** Developments the signed-in user owns or belongs to (dashboard list). */
export function useMyDevelopments(filters: { status?: string; limit?: number; skip?: number } = {}) {
  const query = useQuery({
    queryKey: developmentKeys.mineList(filters),
    queryFn: () => listMyDevelopments(filters),
    staleTime: 60_000,
  });
  return {
    developments: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Published developments for public discovery. */
export function usePublicDevelopments(filters: PublicListFilters = {}) {
  const query = useQuery({
    queryKey: developmentKeys.publicList(filters),
    queryFn: () => listPublicDevelopments(filters),
    staleTime: 5 * 60_000,
  });
  return {
    developments: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  };
}
