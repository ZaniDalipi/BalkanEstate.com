// useAvailableSlots Hook - Get available time slots for a property
// Uses TanStack Query for automatic caching and refetching

import { useQuery } from '@tanstack/react-query';
import { viewingKeys } from '../api/viewingKeys';
import * as viewingApi from '../api/viewingApi';

interface UseAvailableSlotsOptions {
  enabled?: boolean;
}

/**
 * Hook to get available time slots for a property on a specific date
 *
 * Usage:
 * ```tsx
 * const { slots, isLoading } = useAvailableSlots(propertyId, selectedDate);
 *
 * // With enabled option
 * const { slots } = useAvailableSlots(propertyId, date, { enabled: !!date });
 * ```
 */
export function useAvailableSlots(
  propertyId: string | null | undefined,
  date: string | null | undefined,
  options: UseAvailableSlotsOptions = {}
) {
  const { enabled = true } = options;

  const {
    data: slots,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: viewingKeys.availableSlots(propertyId || '', date || ''),
    queryFn: () => viewingApi.getAvailableSlots(propertyId!, date!),
    staleTime: 1 * 60 * 1000, // 1 minute - slots can change quickly
    gcTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!propertyId && !!date && enabled,
  });

  return {
    slots: slots ?? [],
    isLoading,
    error,
    refetch,
    hasAvailableSlots: (slots?.length ?? 0) > 0,
  };
}
