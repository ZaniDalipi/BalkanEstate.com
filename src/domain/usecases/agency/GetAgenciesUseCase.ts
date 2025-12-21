// Use Case: Get Agencies
// Single responsibility: Retrieve all agencies

import { Agency } from '../../entities/Agency';
import { IAgencyRepository } from '../../repositories/IAgencyRepository';

export class GetAgenciesUseCase {
  constructor(private agencyRepository: IAgencyRepository) {}

  async execute(): Promise<Agency[]> {
    const agencies = await this.agencyRepository.getAgencies();

    // Business logic - sort by featured first, then by score
    return agencies.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.agencyScore - a.agencyScore;
    });
  }
}
