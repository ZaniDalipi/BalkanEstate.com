// useUpdateProperty Hook - Update existing property listing
// Uses TanStack Query mutation with optimistic updates

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

/**
 * Hook to update an existing property listing
 *
 * Features:
 * - Optimistic updates for instant UI feedback
 * - Automatic cache invalidation
 * - Rollback on error
 *
 * Usage:
 * ```tsx
 * const { updateProperty, isLoading } = useUpdateProperty();
 *
 * const handleUpdate = async (updatedData) => {
 *   await updateProperty(updatedData);
 * };
 * ```
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (propertyData: Property): Promise<Property> => {
      return await api.updateListing(propertyData);
    },
    onMutate: async (updatedProperty) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: propertyKeys.detail(updatedProperty.id) });

      // Snapshot previous value
      const previousProperty = queryClient.getQueryData(propertyKeys.detail(updatedProperty.id));

      // Optimistically update
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);

      return { previousProperty, propertyId: updatedProperty.id };
    },
    onError: (err, updatedProperty, context) => {
      // Rollback on error
      if (context?.previousProperty) {
        queryClient.setQueryData(
          propertyKeys.detail(context.propertyId),
          context.previousProperty
        );
      }
      console.error('Update property error:', err);
    },
    onSuccess: (updatedProperty) => {
      // Update cache with server response
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);

      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.myListings() });
    },
  });

  return {
    updateProperty: mutation.mutateAsync,
    updatePropertySync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
