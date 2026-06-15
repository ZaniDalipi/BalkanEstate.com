import { useQuery } from '@tanstack/react-query';
import { agencyKeys, getAgency } from '../api';

export function useAgency(agencyId: string | null | undefined) {
  const {
    data: agency,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: agencyKeys.detail(agencyId || ''),
    queryFn: () => {
      if (!agencyId) throw new Error('Agency ID is required');
      return getAgency(agencyId);
    },
    enabled: !!agencyId,
    // Distinct-entity detail view — opt out of the global keepPreviousData
    // default so switching agencies shows a loading state, not the prior one.
    placeholderData: undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  return {
    agency: agency ?? null,
    isLoading,
    error,
    refetch,
    isNotFound: error?.response?.status === 404,
  };
}
