// Property Repository Implementation
// Implements IPropertyRepository using PropertyApiClient

import {
  IPropertyRepository,
  CreatePropertyDTO,
  UpdatePropertyDTO,
} from '../../domain/repositories/IPropertyRepository';
import { Property } from '../../domain/entities/Property';
import { PropertyFilters } from '../../domain/entities/PropertyFilters';
import { propertyApiClient } from '../api/PropertyApiClient';
import { PropertyMapper } from '../mappers/PropertyMapper';

export class PropertyRepository implements IPropertyRepository {
  async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    const filtersDTO = filters?.toDTO();
    const response = await propertyApiClient.getProperties(filtersDTO);

    // Map array of DTOs to domain entities
    return response.properties.map((dto: any) => PropertyMapper.toDomain(dto));
  }

  async getPropertyById(id: string): Promise<Property> {
    const response = await propertyApiClient.getPropertyById(id);
    return PropertyMapper.toDomain(response.property);
  }

  async createProperty(data: CreatePropertyDTO): Promise<Property> {
    const response = await propertyApiClient.createProperty(data);
    return PropertyMapper.toDomain(response.property);
  }

  async updateProperty(id: string, data: UpdatePropertyDTO): Promise<Property> {
    const response = await propertyApiClient.updateProperty(id, data);
    return PropertyMapper.toDomain(response.property);
  }

  async deleteProperty(id: string): Promise<void> {
    await propertyApiClient.deleteProperty(id);
  }

  async getMyListings(userId: string): Promise<Property[]> {
    const response = await propertyApiClient.getMyListings();
    return response.properties.map((dto: any) => PropertyMapper.toDomain(dto));
  }

  async markAsSold(id: string): Promise<Property> {
    const response = await propertyApiClient.markAsSold(id);
    return PropertyMapper.toDomain(response.property);
  }

  async renewListing(id: string): Promise<Property> {
    const response = await propertyApiClient.renewListing(id);
    return PropertyMapper.toDomain(response.property);
  }

  async toggleSavedProperty(userId: string, propertyId: string): Promise<void> {
    await propertyApiClient.toggleSavedProperty(propertyId);
  }

  async getSavedProperties(userId: string): Promise<Property[]> {
    const response = await propertyApiClient.getSavedProperties();
    return response.properties.map((dto: any) => PropertyMapper.toDomain(dto));
  }

  async uploadImages(propertyId: string, images: File[]): Promise<string[]> {
    const response = await propertyApiClient.uploadImages(images, propertyId);
    return response.images.map((img: any) => img.url);
  }

  async deleteImage(propertyId: string, imageUrl: string): Promise<void> {
    await propertyApiClient.deleteImage(propertyId, imageUrl);
  }

  async logPropertyView(propertyId: string): Promise<void> {
    await propertyApiClient.logPropertyView(propertyId);
  }

  async searchWithAI(query: string): Promise<Property[]> {
    const response = await propertyApiClient.searchWithAI(query);
    return response.properties.map((dto: any) => PropertyMapper.toDomain(dto));
  }
}

export const propertyRepository = new PropertyRepository();
