// usePropertyActions Hook - Additional property actions
// Mark as sold, promote, renew, etc.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyKeys } from '../api/propertyKeys';
import * as api from '../../../services/apiService';
import { Property } from '../../../types';

/**
 * Hook to mark property as sold
 *
 * Usage:
 * ```tsx
 * const { markAsSold, isLoading } = useMarkPropertyAsSold();
 * await markAsSold(propertyId);
 * ```
 */
export function useMarkPropertyAsSold() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (propertyId: string): Promise<Property> => {
      return await api.markPropertyAsSold(propertyId);
    },
    onSuccess: (updatedProperty) => {
      // Update cache
      queryClient.setQueryData(propertyKeys.detail(updatedProperty.id), updatedProperty);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: propertyKeys.myListings() });
    },
  });

  return {
    markAsSold: mutation.mutateAsync,
    markAsSoldSync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to promote property
 *
 * Usage:
 * ```tsx
 * const { promoteProperty, isLoading } = usePromoteProperty();
 * await promoteProperty(propertyId);
 * ```
 */
export function usePromoteProperty() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (propertyId: string): Promise<any> => {
      return await api.promoteProperty(propertyId);
    },
    onSuccess: (_, propertyId) => {
      // Invalidate property to refetch with updated promotion status
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.myListings() });
    },
  });

  return {
    promoteProperty: mutation.mutateAsync,
    promotePropertySync: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to upload property images
 *
 * Usage:
 * ```tsx
 * const { uploadImages, isUploading } = useUploadPropertyImages();
 * const urls = await uploadImages(propertyId, files);
 * ```
 */
export function useUploadPropertyImages() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ propertyId, images }: { propertyId: string; images: File[] }): Promise<string[]> => {
      return await api.uploadPropertyImages(propertyId, images);
    },
    onSuccess: (_, { propertyId }) => {
      // Invalidate property to refetch with new images
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(propertyId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.myListings() });
    },
  });

  return {
    uploadImages: mutation.mutateAsync,
    uploadImagesSync: mutation.mutate,
    isUploading: mutation.isPending,
    error: mutation.error,
    progress: mutation.variables, // Can be used to show upload progress
  };
}
