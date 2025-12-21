// Use Case: Get Properties
// Single responsibility: Retrieve properties with filters

import { Property } from '../../entities/Property';
import { PropertyFilters } from '../../entities/PropertyFilters';
import { IPropertyRepository } from '../../repositories/IPropertyRepository';

export class GetPropertiesUseCase {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(filters?: PropertyFilters): Promise<Property[]> {
    // Business logic - apply default filters if none provided
    const appliedFilters = filters || PropertyFilters.getDefault();

    // Validate filters
    if (appliedFilters.minPrice && appliedFilters.maxPrice) {
      if (appliedFilters.minPrice > appliedFilters.maxPrice) {
        throw new Error('Minimum price cannot be greater than maximum price');
      }
    }

    if (appliedFilters.minSqft && appliedFilters.maxSqft) {
      if (appliedFilters.minSqft > appliedFilters.maxSqft) {
        throw new Error('Minimum sqft cannot be greater than maximum sqft');
      }
    }

    // Delegate to repository
    const properties = await this.propertyRepository.getProperties(appliedFilters);

    // Business logic - filter out draft properties for non-owners
    return properties.filter(property => property.status !== 'draft');
  }
}
