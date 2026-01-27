// Use Case: Delete Measurement
// Single responsibility: Delete a measurement by ID

import {
  IMeasurementRepository,
  InvalidMeasurementError,
} from '../../repositories/IMeasurementRepository';

export interface DeleteMeasurementResult {
  success: boolean;
  count: number;
}

export class DeleteMeasurementUseCase {
  constructor(private measurementRepository: IMeasurementRepository) {}

  async execute(id: string): Promise<DeleteMeasurementResult> {
    // Validate ID
    if (!id || id.trim().length === 0) {
      throw new InvalidMeasurementError('Measurement ID is required');
    }

    const result = await this.measurementRepository.deleteMeasurement(id);

    return {
      success: true,
      count: result.count,
    };
  }
}
