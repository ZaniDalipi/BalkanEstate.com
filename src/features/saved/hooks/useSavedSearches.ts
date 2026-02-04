import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  savedKeys,
  getSavedSearches,
  addSavedSearch,
  deleteSavedSearch,
  updateSavedSearchAccessTime,
  updateSavedSearch,
} from '../api';
import type { SavedSearch } from '@/types';

/**
 * Hook to get user's saved searches
 *
 * Usage:
 * ```tsx
 * const { savedSearches, isLoading } = useSavedSearches();
 * ```
 */
export function useSavedSearches() {
  const {
    data: savedSearches = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: savedKeys.searches(),
    queryFn: async () => getSavedSearches(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 401) return false;
      return failureCount < 3;
    },
  });

  return {
    savedSearches,
    isLoading,
    error,
    refetch,
    isEmpty: !isLoading && savedSearches.length === 0,
  };
}

/**
 * Hook to add saved search
 *
 * Usage:
 * ```tsx
 * const { addSearch, isLoading } = useAddSavedSearch();
 * await addSearch(searchData);
 * ```
 */
export function useAddSavedSearch() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (search: SavedSearch): Promise<SavedSearch> => {
      return addSavedSearch(search);
    },
    onSuccess: (newSearch) => {
      // Add to cache immediately
      queryClient.setQueryData(savedKeys.searches(), (old: SavedSearch[] = []) => {
        return [newSearch, ...old];
      });
    },
  });

  return {
    addSearch: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to delete saved search
 *
 * Usage:
 * ```tsx
 * const { deleteSearch, isDeleting } = useDeleteSavedSearch();
 * await deleteSearch(searchId);
 * ```
 */
export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (searchId: string): Promise<void> => {
      deleteSavedSearch(searchId);
    },
    onMutate: async (searchId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: savedKeys.searches() });

      // Snapshot previous value
      const previousSearches = queryClient.getQueryData(savedKeys.searches());

      // Optimistically remove
      queryClient.setQueryData(savedKeys.searches(), (old: SavedSearch[] = []) => {
        return old.filter(s => s.id !== searchId);
      });

      return { previousSearches };
    },
    onError: (err, searchId, context) => {
      // Rollback on error
      if (context?.previousSearches) {
        queryClient.setQueryData(savedKeys.searches(), context.previousSearches);
      }
      // Error removed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedKeys.searches() });
    },
  });

  return {
    deleteSearch: mutation.mutateAsync,
    isDeleting: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to update saved search access time
 *
 * Usage:
 * ```tsx
 * const { updateAccessTime } = useUpdateSavedSearchAccessTime();
 * await updateAccessTime(searchId);
 * ```
 */
export function useUpdateSavedSearchAccessTime() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (searchId: string): Promise<{ success: true }> => {
      return updateSavedSearchAccessTime(searchId);
    },
    onSuccess: (_, searchId) => {
      // Update access time in cache
      queryClient.setQueryData(savedKeys.searches(), (old: SavedSearch[] = []) => {
        return old.map(s =>
          s.id === searchId ? { ...s, lastAccessedAt: Date.now() } : s
        );
      });
    },
  });

  return {
    updateAccessTime: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

/**
 * Hook to update saved search name
 *
 * Usage:
 * ```tsx
 * const { updateSearch, isUpdating } = useUpdateSavedSearch();
 * await updateSearch(searchId, newName);
 * ```
 */
export function useUpdateSavedSearch() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ searchId, name }: { searchId: string; name: string }): Promise<SavedSearch> => {
      return updateSavedSearch(searchId, name);
    },
    onSuccess: (updatedSearch) => {
      // Update in cache
      queryClient.setQueryData(savedKeys.searches(), (old: SavedSearch[] = []) => {
        return old.map(s =>
          s.id === updatedSearch.id ? updatedSearch : s
        );
      });
    },
  });

  return {
    updateSearch: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
