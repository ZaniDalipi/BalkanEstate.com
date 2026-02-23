import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getDashboardAgents } from '../api/agencyDashboardApi';
import type { DashboardAgent } from '../types';

export function useAgencyAgents(agencyId: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardAgent[]>({
    queryKey: agencyDashboardKeys.agents(agencyId),
    queryFn: () => getDashboardAgents(agencyId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!agencyId,
  });

  return { agents: data ?? [], isLoading, error, refetch };
}
