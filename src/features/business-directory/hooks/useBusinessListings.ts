import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  businessDirectoryKeys,
  getBusinessListings,
  getBusinessListing,
  getMyBusinessListings,
  createBusinessListing,
  updateBusinessListing,
  deleteBusinessListing,
  uploadBusinessLogo,
  uploadBusinessBanner,
} from '../api';
import type { BusinessListingFilters, CreateBusinessListingData } from '@/src/shared/types/businessListing.types';

export function useBusinessListings(filters?: BusinessListingFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: businessDirectoryKeys.list(filters),
    queryFn: () => getBusinessListings(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    listings: data?.listings || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refetch,
  };
}

export function useBusinessListing(id: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: businessDirectoryKeys.detail(id || ''),
    queryFn: () => getBusinessListing(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return { listing: data?.listing || null, isLoading, error };
}

export function useMyBusinessListings(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: businessDirectoryKeys.myListings(),
    queryFn: getMyBusinessListings,
    staleTime: 1 * 60 * 1000,
    enabled,
  });

  return { listings: data?.listings || [], isLoading, error, refetch };
}

export function useCreateBusinessListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateBusinessListingData) => createBusinessListing(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.myListings() });
    },
  });

  return {
    createListing: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateBusinessListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBusinessListingData & { isActive: boolean; bannerPosition: number }> }) =>
      updateBusinessListing(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.myListings() });
    },
  });

  return {
    updateListing: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteBusinessListing() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => deleteBusinessListing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.myListings() });
    },
  });

  return {
    deleteListing: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUploadBusinessLogo() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadBusinessLogo(id, file),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.myListings() });
    },
  });

  return {
    uploadLogo: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUploadBusinessBanner() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadBusinessBanner(id, file),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessDirectoryKeys.myListings() });
    },
  });

  return {
    uploadBanner: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
