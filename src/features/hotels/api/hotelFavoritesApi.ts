import { apiRequest } from '@/src/shared/api';
import type { Hotel } from '@/src/shared/types/hotel.types';

export const getHotelFavorites = async (): Promise<{ hotels: Hotel[] }> => {
  return apiRequest('/hotel-favorites', { requiresAuth: true });
};

export const toggleHotelFavorite = async (
  hotelId: string
): Promise<{ message: string; isSaved: boolean }> => {
  return apiRequest('/hotel-favorites/toggle', {
    method: 'POST',
    body: { hotelId },
    requiresAuth: true,
  });
};

export const checkHotelFavorite = async (
  hotelId: string
): Promise<{ isSaved: boolean }> => {
  return apiRequest(`/hotel-favorites/check/${hotelId}`, { requiresAuth: true });
};
