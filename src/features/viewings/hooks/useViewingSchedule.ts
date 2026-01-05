// useViewingSchedule Hook - Manage viewing schedule settings
// Uses TanStack Query for automatic caching and refetching

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { viewingKeys } from '../api/viewingKeys';
import * as viewingApi from '../api/viewingApi';
import type { ViewingScheduleUpdate } from '../types';

/**
 * Hook to get and manage viewing schedule settings
 *
 * Usage:
 * ```tsx
 * const {
 *   schedule,
 *   isLoading,
 *   updateSchedule,
 *   addBlockedDate,
 *   removeBlockedDate,
 * } = useViewingSchedule();
 *
 * // Update schedule settings
 * updateSchedule({ viewingDuration: 45 });
 *
 * // Block a date
 * addBlockedDate('2024-12-25', 'Christmas');
 * ```
 */
export function useViewingSchedule() {
  const queryClient = useQueryClient();

  // Get schedule
  const {
    data: schedule,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: viewingKeys.schedule(),
    queryFn: viewingApi.getSchedule,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update schedule mutation
  const updateScheduleMutation = useMutation({
    mutationFn: (updates: ViewingScheduleUpdate) => viewingApi.updateSchedule(updates),
    onSuccess: (newSchedule) => {
      queryClient.setQueryData(viewingKeys.schedule(), newSchedule);
    },
  });

  // Add blocked date mutation
  const addBlockedDateMutation = useMutation({
    mutationFn: ({ date, reason }: { date: string; reason?: string }) =>
      viewingApi.addBlockedDate(date, reason),
    onSuccess: (newSchedule) => {
      queryClient.setQueryData(viewingKeys.schedule(), newSchedule);
    },
  });

  // Remove blocked date mutation
  const removeBlockedDateMutation = useMutation({
    mutationFn: (date: string) => viewingApi.removeBlockedDate(date),
    onSuccess: (newSchedule) => {
      queryClient.setQueryData(viewingKeys.schedule(), newSchedule);
    },
  });

  return {
    schedule: schedule ?? null,
    isLoading,
    error,
    refetch,
    updateSchedule: updateScheduleMutation.mutate,
    isUpdating: updateScheduleMutation.isPending,
    addBlockedDate: (date: string, reason?: string) =>
      addBlockedDateMutation.mutate({ date, reason }),
    isAddingBlockedDate: addBlockedDateMutation.isPending,
    removeBlockedDate: removeBlockedDateMutation.mutate,
    isRemovingBlockedDate: removeBlockedDateMutation.isPending,
  };
}
