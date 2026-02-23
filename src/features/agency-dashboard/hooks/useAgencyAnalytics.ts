import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getDashboardAnalytics } from '../api/agencyDashboardApi';
import type { AnalyticsData } from '../types';

export function useAgencyAnalytics(agencyId: string, range: string = '30d') {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: agencyDashboardKeys.analytics(agencyId, range),
    queryFn: () => getDashboardAnalytics(agencyId, range),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!agencyId,
  });

  return { analytics: data ?? null, isLoading, error, refetch };
}
