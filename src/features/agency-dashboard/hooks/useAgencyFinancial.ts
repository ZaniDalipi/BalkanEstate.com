import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getDashboardFinancial } from '../api/agencyDashboardApi';
import type { FinancialData } from '../types';

export function useAgencyFinancial(agencyId: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<FinancialData>({
    queryKey: agencyDashboardKeys.financial(agencyId),
    queryFn: () => getDashboardFinancial(agencyId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!agencyId,
  });

  return { financial: data ?? null, isLoading, error, refetch };
}
