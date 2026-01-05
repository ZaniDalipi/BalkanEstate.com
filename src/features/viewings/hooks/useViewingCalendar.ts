// useViewingCalendar Hook - Get calendar view with viewings and schedule
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { viewingKeys } from '../api/viewingKeys';
import * as viewingApi from '../api/viewingApi';

interface UseViewingCalendarOptions {
  enabled?: boolean;
}

/**
 * Hook to get agent's calendar view with viewings and blocked dates
 *
 * Usage:
 * ```tsx
 * const { viewings, schedule, isLoading } = useViewingCalendar(
 *   startOfMonth.toISOString(),
 *   endOfMonth.toISOString()
 * );
 * ```
 */
export function useViewingCalendar(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  options: UseViewingCalendarOptions = {}
) {
  const { enabled = true } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: viewingKeys.calendar(startDate || '', endDate || ''),
    queryFn: () => viewingApi.getCalendar(startDate!, endDate!),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!startDate && !!endDate && enabled,
  });

  return {
    viewings: data?.viewings ?? [],
    schedule: data?.schedule ?? null,
    isLoading,
    error,
    refetch,
  };
}
