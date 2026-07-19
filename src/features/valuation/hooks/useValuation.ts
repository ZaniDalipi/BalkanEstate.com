import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createValuation, getValuation, getValuationHistory, getCityValuationStats } from '../api';
import { valuationKeys } from '../api/valuationKeys';
import type { ValuationInput, PropertyValuation } from '../types';

/**
 * Hook for creating a new property valuation
 */
export function useCreateValuation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ValuationInput) => createValuation(input),
    onSuccess: () => {
      // Invalidate valuation history
      queryClient.invalidateQueries({ queryKey: valuationKeys.history() });
    },
  });
}

/**
 * Hook for fetching a valuation by ID
 */
export function useValuation(id: string | undefined) {
  return useQuery({
    queryKey: valuationKeys.detail(id || ''),
    queryFn: () => getValuation(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching user's valuation history
 */
export function useValuationHistory(limit = 10, enabled = true) {
  return useQuery({
    queryKey: valuationKeys.history(),
    queryFn: () => getValuationHistory(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled, // only fetch when signed in — the endpoint requires auth
    retry: false,
  });
}

/**
 * Hook for fetching city valuation statistics
 */
export function useCityValuationStats(city: string, country: string) {
  return useQuery({
    queryKey: valuationKeys.stats(city, country),
    queryFn: () => getCityValuationStats(city, country),
    enabled: !!city && !!country,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
