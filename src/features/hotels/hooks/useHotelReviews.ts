import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHotelReviews, createReview, deleteReview } from '../api';
import type { CreateReviewData } from '@/src/shared/types/hotel.types';

const reviewsKey = (hotelId: string, page: number) => ['hotel-reviews', hotelId, page] as const;

export function useHotelReviews(hotelId: string | null, page = 1) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: reviewsKey(hotelId || '', page),
    queryFn: () => getHotelReviews(hotelId as string, page),
    enabled: !!hotelId,
    staleTime: 60 * 1000,
  });
  return {
    reviews: data?.reviews || [],
    summary: data?.summary,
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    refetch,
  };
}

export function useCreateReview(hotelId: string | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: CreateReviewData) => createReview(data),
    onSuccess: () => {
      if (hotelId) queryClient.invalidateQueries({ queryKey: ['hotel-reviews', hotelId] });
      queryClient.invalidateQueries({ queryKey: ['hotel', hotelId] });
    },
  });
  return { createReview: mutation.mutateAsync, isLoading: mutation.isPending, error: mutation.error };
}

export function useDeleteReview(hotelId: string | null) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (id: string) => deleteReview(id),
    onSuccess: () => {
      if (hotelId) queryClient.invalidateQueries({ queryKey: ['hotel-reviews', hotelId] });
    },
  });
  return { deleteReview: mutation.mutateAsync, isLoading: mutation.isPending };
}
