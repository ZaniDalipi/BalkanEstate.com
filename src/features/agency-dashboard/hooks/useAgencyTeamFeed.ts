import { useQuery } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import { getTeamFeed } from '../api/agencyDashboardApi';
import type { TeamFeedItem } from '../types';

export function useAgencyTeamFeed(agencyId: string) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TeamFeedItem[]>({
    queryKey: agencyDashboardKeys.teamFeed(agencyId),
    queryFn: () => getTeamFeed(agencyId),
    staleTime: 1 * 60 * 1000, // 1 minute - feed should be fresh
    enabled: !!agencyId,
  });

  return { feed: data ?? [], isLoading, error, refetch };
}
