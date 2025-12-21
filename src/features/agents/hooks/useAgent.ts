import { useQuery } from '@tanstack/react-query';
import { agentKeys } from '../api/agentKeys';
import { getAgentDetails } from '../../../../services/apiService';
import { Agent } from '../../../../types';

interface UseAgentOptions {
  enabled?: boolean;
}

export function useAgent(agentId: string | null | undefined, options: UseAgentOptions = {}) {
  const { enabled = true } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: agentKeys.detail(agentId || ''),
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required');
      return await getAgentDetails(agentId);
    },
    enabled: !!agentId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
  });

  return {
    agent: data?.agent as Agent | null,
    properties: data?.properties || { forSale: [], forRent: [], sold: [] },
    stats: data?.stats || null,
    isLoading,
    error,
    refetch,
    isNotFound: error?.response?.status === 404,
  };
}
