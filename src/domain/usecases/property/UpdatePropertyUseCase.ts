// Use Case: Update Property
// Single responsibility: Update an existing property listing

import { Property } from '../../entities/Property';
import { IPropertyRepository, UpdatePropertyDTO } from '../../repositories/IPropertyRepository';

export class UpdatePropertyUseCase {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(propertyId: string, data: UpdatePropertyDTO): Promise<Property> {
    // Business logic validation
    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    if (data.price !== undefined && data.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (data.sqft !== undefined && data.sqft <= 0) {
      throw new Error('Square footage must be greater than 0');
    }

    if (data.yearBuilt !== undefined) {
      if (data.yearBuilt < 1800 || data.yearBuilt > new Date().getFullYear() + 2) {
        throw new Error('Invalid year built');
      }
    }

    // Delegate to repository
    return await this.propertyRepository.updateProperty(propertyId, data);
  }
}
