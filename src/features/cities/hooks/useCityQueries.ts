/**
 * Cities React Query Hooks
 * Following architecture guidelines: Use TanStack Query for ALL server state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFeaturedCities,
  getCitiesByCountry,
  getCityMarketData,
  triggerMarketDataUpdate,
} from '../api/cityApi';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const cityKeys = {
  all: ['cities'] as const,
  featured: (limit?: number) => [...cityKeys.all, 'featured', { limit }] as const,
  byCountry: (country: string) => [...cityKeys.all, 'country', country] as const,
  marketData: (city: string, country: string) =>
    [...cityKeys.all, 'marketData', city, country] as const,
};

// ============================================================================
// CITY HOOKS
// ============================================================================

/**
 * Fetch featured cities with automatic real-time updates
 */
export function useFeaturedCities(limit: number = 12) {
  return useQuery({
    queryKey: cityKeys.featured(limit),
    queryFn: () => getFeaturedCities(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes - city data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: true,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
}

/**
 * Fetch cities by country
 */
export function useCitiesByCountry(country: string | undefined) {
  return useQuery({
    queryKey: cityKeys.byCountry(country!),
    queryFn: () => getCitiesByCountry(country!),
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch detailed market data for a specific city
 */
export function useCityMarketData(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: cityKeys.marketData(city!, country!),
    queryFn: () => getCityMarketData(city!, country!),
    enabled: !!city && !!country,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: true,
  });
}

/**
 * Admin: Trigger market data update
 */
export function useTriggerMarketDataUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => triggerMarketDataUpdate(),
    onSuccess: () => {
      // Invalidate all city queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: cityKeys.all });
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Prefetch featured cities (useful for navigation optimization)
 */
export function usePrefetchFeaturedCities() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: cityKeys.featured(12),
      queryFn: () => getFeaturedCities(12),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Invalidate all city queries
 */
export function useInvalidateCityQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: cityKeys.all });
    },
    invalidateFeatured: () => {
      queryClient.invalidateQueries({ queryKey: cityKeys.featured() });
    },
  };
}
