// useDeleteProperty Hook - Delete property listing
// Uses TanStack Query mutation with optimistic updates

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import { authKeys } from '../../auth/api/authKeys';
import * as api from '../../../services/apiService';

/**
 * Hook to delete a property listing
 *
 * Features:
 * - Optimistic removal from lists
 * - Automatic cache cleanup
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const { deleteProperty, isLoading } = useDeleteProperty();
 *
 * const handleDelete = async (propertyId) => {
 *   if (confirm('Are you sure?')) {
 *     await deleteProperty(propertyId);
 *   }
 * };
 * ```
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return await api.deleteProperty(propertyId);
    },
    onMutate: async (propertyId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.lists() });
      await queryClient.cancelQueries({ queryKey: propertyKeys.myListings() });

      // Snapshot previous values
      const previousLists = queryClient.getQueriesData({ queryKey: propertyKeys.lists() });
      const previousMyListings = queryClient.getQueryData(propertyKeys.myListings());

      // Optimistically remove from all lists
      queryClient.setQueriesData({ queryKey: propertyKeys.lists() }, (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((property: any) => property.id !== propertyId);
        }
        return old;
      });

      queryClient.setQueryData(propertyKeys.myListings(), (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((property: any) => property.id !== propertyId);
        }
        return old;
      });

      return { previousLists, previousMyListings, propertyId };
    },
    onError: (err, propertyId, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousMyListings) {
        queryClient.setQueryData(propertyKeys.myListings(), context.previousMyListings);
      }
      console.error('Delete property error:', err);
    },
    onSuccess: (result, propertyId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: propertyKeys.detail(propertyId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.myListings() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.favorites() });

      // Invalidate user data to refresh subscription counts
      if (result?.updatedSubscription) {
        queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      }
    },
  });

  return {
    deleteProperty: mutation.mutateAsync,
    deletePropertySync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
