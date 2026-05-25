/**
 * Suburb React Query Hooks
 * Follows the same pattern as useCityQueries.ts
 */

import { useQuery } from '@tanstack/react-query';
import { getSuburbData } from '../api/suburbApi';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const suburbKeys = {
  all: ['suburbs'] as const,
  byCity: (city: string, country: string) =>
    [...suburbKeys.all, 'city', city, country] as const,
};

// ============================================================================
// SUBURB HOOKS
// ============================================================================

/**
 * Fetch suburb data for a specific city.
 * Data is stale after 30 minutes; cached for 2 hours.
 */
export function useSuburbData(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: suburbKeys.byCity(city!, country!),
    queryFn: () => getSuburbData(city!, country!),
    enabled: !!city && !!country,
    staleTime: 30 * 60 * 1000, // 30 minutes — suburb data changes infrequently
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
  });
}
