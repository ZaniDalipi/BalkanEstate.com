// Use Case: Get Measurements
// Single responsibility: Retrieve all measurements for the current user

import { Measurement } from '../../entities/Measurement';
import { IMeasurementRepository } from '../../repositories/IMeasurementRepository';

export interface GetMeasurementsResult {
  measurements: Measurement[];
  count: number;
  maxAllowed: number;
  isPro: boolean;
  remainingSlots: number;
  isAtLimit: boolean;
}

export class GetMeasurementsUseCase {
  constructor(private measurementRepository: IMeasurementRepository) {}

  async execute(): Promise<GetMeasurementsResult> {
    const response = await this.measurementRepository.getMeasurements();

    return {
      measurements: response.measurements,
      count: response.count,
      maxAllowed: response.maxAllowed,
      isPro: response.isPro,
      remainingSlots: response.maxAllowed - response.count,
      isAtLimit: response.count >= response.maxAllowed,
    };
  }
}
