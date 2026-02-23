import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getAgencyOverview } from '../api/agencyDashboardApi';
import type { OverviewData } from '../types';

export function useAgencyOverview(agencyId: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<OverviewData>({
    queryKey: agencyDashboardKeys.overview(agencyId),
    queryFn: () => getAgencyOverview(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!agencyId,
  });

  return { overview: data ?? null, isLoading, error, refetch };
}
