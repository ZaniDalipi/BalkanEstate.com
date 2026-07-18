import { apiRequest } from '@/src/shared/api';
import type { HotelBooking, CreateBookingData, BookingStatus } from '@/src/shared/types/hotel.types';

/** Guest → host booking request. Auth is optional (attached when signed in). */
export const createBooking = async (
  data: CreateBookingData
): Promise<{ booking: HotelBooking; message: string }> => {
  return apiRequest('/hotel-bookings', { method: 'POST', body: data });
};

/** Booking requests for the signed-in host's properties. */
export const getHostBookings = async (
  status?: BookingStatus
): Promise<{ bookings: HotelBooking[]; pendingCount: number }> => {
  const qs = status ? `?status=${status}` : '';
  return apiRequest(`/hotel-bookings/host${qs}`, { requiresAuth: true });
};

export const updateBookingStatus = async (
  id: string,
  status: BookingStatus
): Promise<{ booking: HotelBooking; message: string }> => {
  return apiRequest(`/hotel-bookings/${id}/status`, {
    method: 'PATCH',
    body: { status },
    requiresAuth: true,
  });
};
