import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedKeys, getFavorites, toggleSavedHome } from '../api';
import type { Property } from '@/types';

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
    queryFn: getFavorites,
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
    mutationFn: ({ propertyId, isSaved }: { propertyId: string; isSaved: boolean; property?: Property }) =>
      toggleSavedHome(propertyId, isSaved),
    onMutate: async ({ propertyId, isSaved, property }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: savedKeys.homes() });

      // Snapshot previous value for rollback
      const previousHomes = queryClient.getQueryData(savedKeys.homes());

      // Optimistically update the cache without triggering a re-fetch
      queryClient.setQueryData(savedKeys.homes(), (old: Property[] = []) => {
        if (isSaved) {
          return old.filter(p => p.id !== propertyId);
        } else if (property) {
          return [property, ...old];
        }
        return old;
      });

      return { previousHomes };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousHomes) {
        queryClient.setQueryData(savedKeys.homes(), context.previousHomes);
      }
    },
    // No invalidateQueries — the optimistic update keeps the cache correct
  });

  return {
    toggleSaved: mutation.mutateAsync,
    isToggling: mutation.isPending,
    error: mutation.error,
  };
}
