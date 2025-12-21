// Use Case: Delete Property
// Single responsibility: Delete a property listing

import { IPropertyRepository } from '../../repositories/IPropertyRepository';

export class DeletePropertyUseCase {
  constructor(private propertyRepository: IPropertyRepository) {}

  async execute(propertyId: string): Promise<void> {
    if (!propertyId) {
      throw new Error('Property ID is required');
    }

    // Delegate to repository
    await this.propertyRepository.deleteProperty(propertyId);
  }
}
