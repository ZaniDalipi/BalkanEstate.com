import { useQuery } from '@tanstack/react-query';
import { agentKeys } from '../api/agentKeys';
import { getAllAgents } from '../api/agentApi';
import type { Agent } from '@/src/shared/types';

interface UseAgentsOptions {
  enabled?: boolean;
}

export function useAgents(options: UseAgentsOptions = {}) {
  const { enabled = true } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      const response = await getAllAgents();
      return response.agents || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    agents: (data || []) as Agent[],
    isLoading,
    error,
    refetch,
  };
}
