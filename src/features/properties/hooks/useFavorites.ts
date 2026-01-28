// useFavorites Hook - Get and toggle favorite properties
// Uses TanStack Query for favorites list and mutation for toggle
// Real-time updates via polling (auto-refresh every 15 seconds)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '../api';
import { getFavorites, toggleSavedHome } from '@/src/features/saved/api';
import type { Property } from '@/types';

/**
 * Hook to get user's favorite properties
 *
 * Features:
 * - Real-time updates via polling (every 15 seconds)
 * - Automatic caching
 * - Auto-refetch on window focus
 *
 * Usage:
 * ```tsx
 * const { favorites, isLoading } = useFavorites();
 * ```
 */
export function useFavorites(options?: { enablePolling?: boolean }) {
  const { enablePolling = true } = options || {};

  const {
    data: favorites = [],
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: propertyKeys.favorites(),
    queryFn: getFavorites,
    staleTime: 5 * 1000, // 5 seconds - consider stale quickly for real-time feel
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    refetchInterval: enablePolling ? 15 * 1000 : false, // Auto-refresh every 15 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: true, // Refresh on component mount
    refetchOnReconnect: true, // Refresh on network reconnect
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    favorites,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
    isEmpty: !isLoading && favorites.length === 0,
    isFavorite: (propertyId: string) => favorites.some(p => p.id === propertyId),
  };
}

/**
 * Hook to toggle property favorite status
 *
 * Features:
 * - Optimistic updates for instant feedback
 * - Automatic cache updates
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const { toggleFavorite, isToggling } = useToggleFavorite();
 *
 * const handleToggle = async (property) => {
 *   await toggleFavorite(property);
 * };
 * ```
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (property: Property): Promise<void> => {
      // Toggle favorite via API
      const isFavorite = (await getFavorites()).some((p) => p.id === property.id);
      await toggleSavedHome(property.id, isFavorite);
    },
    onMutate: async (property) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.favorites() });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(propertyKeys.favorites());

      // Optimistically update
      queryClient.setQueryData(propertyKeys.favorites(), (old: Property[] = []) => {
        const isFavorite = old.some(p => p.id === property.id);
        if (isFavorite) {
          // Remove from favorites
          return old.filter(p => p.id !== property.id);
        } else {
          // Add to favorites
          return [property, ...old];
        }
      });

      return { previousFavorites };
    },
    onError: (err, property, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(propertyKeys.favorites(), context.previousFavorites);
      }
      console.error('Toggle favorite error:', err);
    },
    onSuccess: () => {
      // Invalidate and immediately refetch to ensure server state is correct
      queryClient.invalidateQueries({
        queryKey: propertyKeys.favorites(),
        refetchType: 'active',
      });
    },
  });

  return {
    toggleFavorite: mutation.mutateAsync,
    toggleFavoriteSync: mutation.mutate,
    isToggling: mutation.isPending,
    error: mutation.error,
  };
}
