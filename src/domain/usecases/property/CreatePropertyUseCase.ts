// Use Case: Create Property
// Single responsibility: Create a new property listing

import { Property } from '../../entities/Property';
import { IPropertyRepository, CreatePropertyDTO } from '../../repositories/IPropertyRepository';

export class CreatePropertyUseCase {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(data: CreatePropertyDTO): Promise<Property> {
    // Business logic validation
    this.validatePropertyData(data);

    // Delegate to repository
    return await this.propertyRepository.createProperty(data);
  }

  private validatePropertyData(data: CreatePropertyDTO): void {
    if (data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.sqft <= 0) {
      throw new Error('Square footage must be greater than 0');
    }

    if (data.beds < 0 || data.baths < 0 || data.livingRooms < 0) {
      throw new Error('Rooms cannot be negative');
    }

    if (data.yearBuilt < 1800 || data.yearBuilt > new Date().getFullYear() + 2) {
      throw new Error('Invalid year built');
    }

    if (!data.address || !data.city || !data.country) {
      throw new Error('Address, city, and country are required');
    }

    if (!data.description || data.description.length < 20) {
      throw new Error('Description must be at least 20 characters');
    }

    if (!data.imageUrl) {
      throw new Error('At least one image is required');
    }

    if (data.lat < -90 || data.lat > 90) {
      throw new Error('Invalid latitude');
    }

    if (data.lng < -180 || data.lng > 180) {
      throw new Error('Invalid longitude');
    }
  }
}
