import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedKeys } from '../api/savedKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

/**
 * Hook to get user's saved homes (favorites)
 *
 * Note: This is similar to useFavorites in properties feature
 * but specifically for saved homes list page
 *
 * Usage:
 * ```tsx
 * const { savedHomes, isLoading } = useSavedHomes();
 * ```
 */
export function useSavedHomes() {
  const {
    data: savedHomes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: savedKeys.homes(),
    queryFn: async () => await api.getFavorites(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    savedHomes,
    isLoading,
    error,
    refetch,
    isEmpty: !isLoading && savedHomes.length === 0,
    isSaved: (propertyId: string) => savedHomes.some(p => p.id === propertyId),
  };
}

/**
 * Hook to toggle saved home
 *
 * Usage:
 * ```tsx
 * const { toggleSaved, isToggling } = useToggleSavedHome();
 * await toggleSaved({ propertyId, isSaved });
 * ```
 */
export function useToggleSavedHome() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ propertyId, isSaved }: { propertyId: string; isSaved: boolean }) => {
      return await api.toggleSavedHome(propertyId, isSaved);
    },
    onMutate: async ({ propertyId, isSaved }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: savedKeys.homes() });

      // Snapshot previous value
      const previousHomes = queryClient.getQueryData(savedKeys.homes());

      // Optimistically update
      queryClient.setQueryData(savedKeys.homes(), (old: Property[] = []) => {
        if (isSaved) {
          // Remove from saved
          return old.filter(p => p.id !== propertyId);
        } else {
          // This case is handled by fetching the property first
          return old;
        }
      });

      return { previousHomes };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousHomes) {
        queryClient.setQueryData(savedKeys.homes(), context.previousHomes);
      }
      console.error('Toggle saved home error:', err);
    },
    onSuccess: () => {
      // Invalidate to ensure server state is correct
      queryClient.invalidateQueries({ queryKey: savedKeys.homes() });
    },
  });

  return {
    toggleSaved: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error,
  };
}
