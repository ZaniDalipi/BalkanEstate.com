import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getDashboardProperties } from '../api/agencyDashboardApi';
import type { DashboardProperty, PaginatedResponse, PropertyFilters } from '../types';

export function useAgencyProperties(agencyId: string, filters?: PropertyFilters) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<DashboardProperty>>({
    queryKey: agencyDashboardKeys.properties(agencyId, filters),
    queryFn: () => getDashboardProperties(agencyId, filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!agencyId,
  });

  return {
    properties: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
}
