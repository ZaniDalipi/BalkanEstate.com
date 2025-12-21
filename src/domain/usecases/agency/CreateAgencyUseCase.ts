// Use Case: Create Agency
// Single responsibility: Create a new agency

import { Agency } from '../../entities/Agency';
import { IAgencyRepository, CreateAgencyDTO } from '../../repositories/IAgencyRepository';

export class CreateAgencyUseCase {
  constructor(private agencyRepository: IAgencyRepository) {}

  async execute(data: CreateAgencyDTO): Promise<Agency> {
    // Business logic validation
    if (!data.name || data.name.length < 3) {
      throw new Error('Agency name must be at least 3 characters');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email is required');
    }

    if (!data.phone || data.phone.length < 10) {
      throw new Error('Valid phone number is required');
    }

    if (data.description && data.description.length < 20) {
      throw new Error('Description must be at least 20 characters if provided');
    }

    if (data.yearsInBusiness !== undefined && data.yearsInBusiness < 0) {
      throw new Error('Years in business cannot be negative');
    }

    // Delegate to repository
    return await this.agencyRepository.createAgency(data);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
