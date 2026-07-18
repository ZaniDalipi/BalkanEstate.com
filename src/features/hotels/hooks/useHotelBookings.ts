import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking, getHostBookings, updateBookingStatus, uploadRoomImage } from '../api';
import type { CreateBookingData, BookingStatus } from '@/src/shared/types/hotel.types';

const HOST_BOOKINGS_KEY = ['hotel-bookings', 'host'] as const;

/** Guest submits a booking request. */
export function useCreateBooking() {
  const mutation = useMutation({
    mutationFn: (data: CreateBookingData) => createBooking(data),
  });
  return {
    createBooking: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/** Host lists booking requests for their properties. */
export function useHostBookings(enabled: boolean, status?: BookingStatus) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...HOST_BOOKINGS_KEY, status ?? 'all'],
    queryFn: () => getHostBookings(status),
    enabled,
    staleTime: 60 * 1000,
  });
  return {
    bookings: data?.bookings || [],
    pendingCount: data?.pendingCount || 0,
    isLoading,
    error,
    refetch,
  };
}

/** Host confirms / declines / cancels a booking. */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) => updateBookingStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOST_BOOKINGS_KEY });
    },
  });
  return {
    updateStatus: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/** Upload a single room photo, returning its hosted URL + publicId. */
export function useUploadRoomImage() {
  const mutation = useMutation({
    mutationFn: (file: File) => uploadRoomImage(file),
  });
  return {
    uploadRoomImage: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
