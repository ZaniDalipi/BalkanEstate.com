import { apiRequest, uploadRequest } from '@/src/shared/api';
import type {
  Hotel,
  HotelFilters,
  HotelsResponse,
  CreateHotelData,
  HotelListingCode,
} from '@/src/shared/types/hotel.types';

export const getHotels = async (filters?: HotelFilters): Promise<HotelsResponse> => {
  const params = new URLSearchParams();
  if (filters?.propertyType) params.append('propertyType', filters.propertyType);
  if (filters?.city) params.append('city', filters.city);
  if (filters?.country) params.append('country', filters.country);
  if (filters?.amenities?.length) params.append('amenities', filters.amenities.join(','));
  if (filters?.minPrice != null) params.append('minPrice', String(filters.minPrice));
  if (filters?.maxPrice != null) params.append('maxPrice', String(filters.maxPrice));
  if (filters?.guests != null) params.append('guests', String(filters.guests));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.sort) params.append('sort', filters.sort);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  return apiRequest<HotelsResponse>(`/hotels?${params.toString()}`);
};

export const getHotel = async (id: string): Promise<{ hotel: Hotel }> => {
  return apiRequest<{ hotel: Hotel }>(`/hotels/${id}`);
};

export const getMyHotels = async (): Promise<{ hotels: Hotel[] }> => {
  return apiRequest<{ hotels: Hotel[] }>('/hotels/my-listings', { requiresAuth: true });
};

export const createHotel = async (
  data: CreateHotelData
): Promise<{ hotel: Hotel; message: string }> => {
  return apiRequest('/hotels', { method: 'POST', body: data, requiresAuth: true });
};

export const updateHotel = async (
  id: string,
  data: Partial<CreateHotelData & { isActive: boolean }>
): Promise<{ hotel: Hotel; message: string }> => {
  return apiRequest(`/hotels/${id}`, { method: 'PUT', body: data, requiresAuth: true });
};

export const deleteHotel = async (id: string): Promise<{ message: string }> => {
  return apiRequest(`/hotels/${id}`, { method: 'DELETE', requiresAuth: true });
};

export const uploadHotelCover = async (
  id: string,
  file: File
): Promise<{ coverImageUrl: string; message: string }> => {
  const formData = new FormData();
  formData.append('cover', file);
  return uploadRequest<{ coverImageUrl: string; message: string }>(
    `/hotels/${id}/upload-cover`,
    formData
  );
};

export const uploadHotelPhotos = async (
  id: string,
  files: File[]
): Promise<{ hotel: Hotel; message: string }> => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));
  return uploadRequest<{ hotel: Hotel; message: string }>(
    `/hotels/${id}/upload-photos`,
    formData
  );
};

/** Upload a single room photo, returning its hosted URL (used while composing a listing). */
export const uploadRoomImage = async (
  file: File
): Promise<{ url: string; publicId: string }> => {
  const formData = new FormData();
  formData.append('image', file);
  return uploadRequest<{ url: string; publicId: string }>('/hotels/upload-image', formData);
};

// ---- Listing access codes ----

export const validateHotelCode = async (
  code: string
): Promise<{ valid: boolean; message: string }> => {
  return apiRequest('/hotel-codes/validate', { method: 'POST', body: { code } });
};

export const generateHotelCodes = async (
  count: number,
  note?: string,
  expiresAt?: string
): Promise<{ codes: HotelListingCode[]; count: number }> => {
  return apiRequest('/hotel-codes/generate', {
    method: 'POST',
    body: { count, note, expiresAt },
    requiresAuth: true,
  });
};

export const getHotelCodes = async (): Promise<{
  codes: HotelListingCode[];
  total: number;
  stats: { active: number; redeemed: number };
}> => {
  return apiRequest('/hotel-codes', { requiresAuth: true });
};

export const revokeHotelCode = async (id: string): Promise<{ message: string }> => {
  return apiRequest(`/hotel-codes/${id}`, { method: 'DELETE', requiresAuth: true });
};
