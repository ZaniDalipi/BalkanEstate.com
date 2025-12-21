import { useQuery } from '@tanstack/react-query';
import { agentKeys } from '../api/agentKeys';
import { getAgencyAgents } from '../../../../services/apiService';
import { Agent } from '../../../../types';

interface UseAgentTeamOptions {
  enabled?: boolean;
}

export function useAgentTeam(agencyId: string | null | undefined, options: UseAgentTeamOptions = {}) {
  const { enabled = true } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: agentKeys.teamMembers(agencyId || ''),
    queryFn: async () => {
      if (!agencyId) throw new Error('Agency ID is required');
      return await getAgencyAgents(agencyId);
    },
    enabled: !!agencyId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    teamMembers: (data?.agents || []) as Agent[],
    isLoading,
    error,
    refetch,
  };
}
