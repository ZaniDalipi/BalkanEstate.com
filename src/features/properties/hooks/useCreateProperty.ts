// useCreateProperty Hook - Create new property listing
// Uses TanStack Query mutation

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys, createProperty } from '../api';
import { authKeys } from '@/src/features/auth/api';
import type { Property } from '@/types';

/**
 * Hook to create a new property listing
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates support
 * - Success/error callbacks
 *
 * Usage:
 * ```tsx
 * const { createProperty, isLoading, error } = useCreateProperty();
 *
 * const handleCreate = async (propertyData) => {
 *   try {
 *     const newProperty = await createProperty(propertyData);
 *     console.log('Created:', newProperty);
 *   } catch (err) {
 *     console.error('Failed:', err);
 *   }
 * };
 * ```
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (propertyData: Property) => createProperty(propertyData),
    onSuccess: (result) => {
      // Invalidate and IMMEDIATELY refetch property lists
      // This ensures the new listing appears right away
      queryClient.invalidateQueries({
        queryKey: propertyKeys.lists(),
        refetchType: 'active', // Refetch immediately, not just mark stale
      });
      queryClient.invalidateQueries({
        queryKey: propertyKeys.myListings(),
        refetchType: 'active',
      });

      // Add to cache immediately for instant access
      queryClient.setQueryData(propertyKeys.detail(result.property.id), result.property);

      // Invalidate user data to refresh subscription counts
      if (result.updatedSubscription) {
        queryClient.invalidateQueries({ queryKey: authKeys.currentUser() });
      }
    },
    onError: (error: any) => {
      console.error('Create property error:', error);
    },
  });

  return {
    createProperty: mutation.mutateAsync,
    createPropertySync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
