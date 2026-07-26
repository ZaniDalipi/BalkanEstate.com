// useRoomStylerUsage — current user's AI Room Styler monthly quota.
// Uses TanStack Query; the resolved limit reflects the user's real account
// status (agency/pro/buyer/free), so the meter and upgrade prompt are accurate.

import { useQuery } from '@tanstack/react-query';
import { roomStylerKeys } from '@/src/shared/query/queryKeys';
import { getRoomStyleUsage, type RoomStyleUsage } from '../../../../services/geminiService';

/**
 * Fetch the current user's room-styler usage.
 * @param enabled Only run when the user is authenticated (avoids 401 spam).
 */
export function useRoomStylerUsage(enabled: boolean = true) {
  const {
    data: usage,
    isLoading,
    error,
    refetch,
  } = useQuery<RoomStyleUsage>({
    queryKey: roomStylerKeys.usage(),
    queryFn: () => getRoomStyleUsage(),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, err: any) => {
      // Don't retry on auth errors.
      if (err?.statusCode === 401 || err?.response?.status === 401) return false;
      return failureCount < 2;
    },
  });

  return { usage, isLoading, error, refetch };
}
