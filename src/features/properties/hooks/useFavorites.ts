// useFavorites Hook - Get and toggle favorite properties
// Uses TanStack Query for favorites list and mutation for toggle

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

/**
 * Hook to get user's favorite properties
 *
 * Usage:
 * ```tsx
 * const { favorites, isLoading } = useFavorites();
 * ```
 */
export function useFavorites() {
  const {
    data: favorites = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: propertyKeys.favorites(),
    queryFn: async () => {
      return await api.getFavorites();
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    favorites,
    isLoading,
    error,
    refetch,
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
      await api.toggleSavedHome(property);
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
      // Invalidate to ensure server state is correct
      queryClient.invalidateQueries({ queryKey: propertyKeys.favorites() });
    },
  });

  return {
    toggleFavorite: mutation.mutateAsync,
    toggleFavoriteSync: mutation.mutate,
    isToggling: mutation.isPending,
    error: mutation.error,
  };
}
