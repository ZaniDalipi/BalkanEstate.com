import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hotelsKeys,
  getHotels,
  getHotel,
  getMyHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  uploadHotelCover,
  uploadHotelPhotos,
} from '../api';
import type { HotelFilters, CreateHotelData } from '@/src/shared/types/hotel.types';

export function useHotels(filters?: HotelFilters) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: hotelsKeys.list(filters),
    queryFn: () => getHotels(filters),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    hotels: data?.hotels || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refetch,
  };
}

export function useHotel(id: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: hotelsKeys.detail(id || ''),
    queryFn: () => getHotel(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return { hotel: data?.hotel || null, isLoading, error };
}

export function useMyHotels(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: hotelsKeys.myListings(),
    queryFn: getMyHotels,
    staleTime: 1 * 60 * 1000,
    enabled,
  });

  return { hotels: data?.hotels || [], isLoading, error, refetch };
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateHotelData) => createHotel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.myListings() });
    },
  });
  return {
    createHotel: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUpdateHotel() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateHotelData & { isActive: boolean }> }) =>
      updateHotel(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: hotelsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.myListings() });
    },
  });
  return {
    updateHotel: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteHotel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.myListings() });
    },
  });
  return {
    deleteHotel: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUploadHotelCover() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => uploadHotelCover(id, file),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: hotelsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.myListings() });
    },
  });
  return {
    uploadCover: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useUploadHotelPhotos() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, files }: { id: string; files: File[] }) => uploadHotelPhotos(id, files),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: hotelsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: hotelsKeys.myListings() });
    },
  });
  return {
    uploadPhotos: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
