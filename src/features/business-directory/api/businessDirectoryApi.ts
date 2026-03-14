import { apiRequest, uploadRequest } from '@/src/shared/api';
import type {
  BusinessListingFilters,
  BusinessListingsResponse,
  BusinessListing,
  CreateBusinessListingData,
} from '@/src/shared/types/businessListing.types';

export const getBusinessListings = async (
  filters?: BusinessListingFilters
): Promise<BusinessListingsResponse> => {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.city) params.append('city', filters.city);
  if (filters?.country) params.append('country', filters.country);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  return apiRequest<BusinessListingsResponse>(`/business-listings?${params.toString()}`);
};

export const getBusinessListing = async (
  id: string
): Promise<{ listing: BusinessListing }> => {
  return apiRequest<{ listing: BusinessListing }>(`/business-listings/${id}`);
};

export const getMyBusinessListings = async (): Promise<{ listings: BusinessListing[] }> => {
  return apiRequest<{ listings: BusinessListing[] }>('/business-listings/my-listings', {
    requiresAuth: true,
  });
};

export const createBusinessListing = async (
  data: CreateBusinessListingData
): Promise<{ listing: BusinessListing; message: string }> => {
  return apiRequest('/business-listings', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
};

export const updateBusinessListing = async (
  id: string,
  data: Partial<CreateBusinessListingData & { isActive: boolean }>
): Promise<{ listing: BusinessListing; message: string }> => {
  return apiRequest(`/business-listings/${id}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
  });
};

export const deleteBusinessListing = async (
  id: string
): Promise<{ message: string }> => {
  return apiRequest(`/business-listings/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const uploadBusinessLogo = async (
  id: string,
  file: File
): Promise<{ logoUrl: string; message: string }> => {
  const formData = new FormData();
  formData.append('logo', file);

  return uploadRequest<{ logoUrl: string; message: string }>(
    `/business-listings/${id}/upload-logo`,
    formData
  );
};
