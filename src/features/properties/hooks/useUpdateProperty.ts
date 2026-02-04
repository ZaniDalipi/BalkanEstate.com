// useUpdateProperty Hook - Update existing property listing
// Uses TanStack Query mutation with optimistic updates

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys, updateProperty } from '../api';
import type { Property } from '@/types';

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
    mutationFn: (propertyData: Property): Promise<Property> => updateProperty(propertyData),
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
      // Error removed
    },
    onSuccess: (updatedProperty) => {
      // Update cache with server response
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);

      // Invalidate and immediately refetch lists to ensure consistency
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: propertyKeys.myListings(),
        refetchType: 'active',
      });
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
