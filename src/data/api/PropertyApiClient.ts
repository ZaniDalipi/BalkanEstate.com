// Property API Client
// Handles all property-related API calls

import { httpClient } from './httpClient';

export class PropertyApiClient {
  async getProperties(filters?: any): Promise<any> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.query) params.append('query', filters.query);
      if (filters.minPrice !== null) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice !== null) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.beds !== null) params.append('beds', filters.beds.toString());
      if (filters.baths !== null) params.append('baths', filters.baths.toString());
      if (filters.livingRooms !== null) params.append('livingRooms', filters.livingRooms.toString());
      if (filters.minSqft !== null) params.append('minSqft', filters.minSqft.toString());
      if (filters.maxSqft !== null) params.append('maxSqft', filters.maxSqft.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sellerType && filters.sellerType !== 'any') params.append('sellerType', filters.sellerType);
      if (filters.propertyType && filters.propertyType !== 'any') params.append('propertyType', filters.propertyType);
      if (filters.country && filters.country !== 'any') params.append('country', filters.country);
    }

    const queryString = params.toString();
    const endpoint = `/properties${queryString ? `?${queryString}` : ''}`;

    return await httpClient.get(endpoint);
  }

  async getPropertyById(id: string): Promise<any> {
    return await httpClient.get(`/properties/${id}`);
  }

  async createProperty(data: any): Promise<any> {
    return await httpClient.post('/properties', data, true);
  }

  async updateProperty(id: string, data: any): Promise<any> {
    return await httpClient.put(`/properties/${id}`, data, true);
  }

  async deleteProperty(id: string): Promise<void> {
    await httpClient.delete(`/properties/${id}`, true);
  }

  async getMyListings(): Promise<any> {
    return await httpClient.get('/properties/my/listings', true);
  }

  async markAsSold(id: string): Promise<any> {
    return await httpClient.patch(`/properties/${id}/mark-sold`, undefined, true);
  }

  async renewListing(id: string): Promise<any> {
    return await httpClient.patch(`/properties/${id}/renew`, undefined, true);
  }

  async toggleSavedProperty(propertyId: string): Promise<any> {
    return await httpClient.post(`/properties/${propertyId}/toggle-save`, undefined, true);
  }

  async getSavedProperties(): Promise<any> {
    return await httpClient.get('/properties/saved', true);
  }

  async uploadImages(images: File[], propertyId?: string): Promise<any> {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });

    if (propertyId) {
      formData.append('propertyId', propertyId);
    }

    const endpoint = propertyId
      ? `/properties/${propertyId}/upload-images`
      : `/properties/upload-images`;

    return await httpClient.uploadFile(endpoint, formData, true);
  }

  async deleteImage(propertyId: string, imageUrl: string): Promise<void> {
    await httpClient.post(`/properties/${propertyId}/delete-image`, { imageUrl }, true);
  }

  async logPropertyView(propertyId: string): Promise<void> {
    await httpClient.post(`/properties/${propertyId}/view`, undefined, false);
  }

  async searchWithAI(query: string): Promise<any> {
    return await httpClient.post('/properties/ai-search', { query }, false);
  }
}

export const propertyApiClient = new PropertyApiClient();
