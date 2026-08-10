import { apiRequest } from '@/src/shared/api';
import type { HotelReview, HotelReviewsResponse, CreateReviewData } from '@/src/shared/types/hotel.types';

export const getHotelReviews = async (
  hotelId: string,
  page = 1
): Promise<HotelReviewsResponse> => {
  return apiRequest(`/hotel-reviews/hotel/${hotelId}?page=${page}`);
};

export const createReview = async (
  data: CreateReviewData
): Promise<{ review: HotelReview; message: string }> => {
  return apiRequest('/hotel-reviews', { method: 'POST', body: data, requiresAuth: true });
};

export const deleteReview = async (id: string): Promise<{ message: string }> => {
  return apiRequest(`/hotel-reviews/${id}`, { method: 'DELETE', requiresAuth: true });
};
