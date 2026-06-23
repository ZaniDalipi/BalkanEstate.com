import { useQuery } from '@tanstack/react-query';
import { crmKeys } from '../api/crmKeys';
import { getLeads, getLead, getPipelineSummary } from '../api/crmApi';
import type { LeadFilters } from '../types';

export function useLeads(filters?: LeadFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: crmKeys.leadList(filters),
    queryFn: () => getLeads(filters),
    staleTime: 60_000,
  });

  return {
    leads: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    limit: data?.limit ?? 50,
    isLoading,
    error,
    refetch,
  };
}

export function useLead(leadId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: crmKeys.lead(leadId),
    queryFn: () => getLead(leadId),
    staleTime: 60_000,
    enabled: !!leadId,
  });

  return { lead: data, isLoading, error };
}

export function usePipelineSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: crmKeys.pipeline(),
    queryFn: getPipelineSummary,
    staleTime: 60_000,
  });

  return { summary: data, isLoading, error };
}
