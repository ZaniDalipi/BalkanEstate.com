// Use Case: Update Measurement
// Single responsibility: Update measurement details (name, address, notes)

import { Measurement } from '../../entities/Measurement';
import {
  IMeasurementRepository,
  UpdateMeasurementDTO,
  InvalidMeasurementError,
} from '../../repositories/IMeasurementRepository';

export class UpdateMeasurementUseCase {
  constructor(private measurementRepository: IMeasurementRepository) {}

  async execute(id: string, data: UpdateMeasurementDTO): Promise<Measurement> {
    // Validate ID
    if (!id || id.trim().length === 0) {
      throw new InvalidMeasurementError('Measurement ID is required');
    }

    // Validate update data
    this.validateUpdateData(data);

    return await this.measurementRepository.updateMeasurement(id, data);
  }

  private validateUpdateData(data: UpdateMeasurementDTO): void {
    // At least one field must be provided
    if (!data.name && !data.address && data.notes === undefined) {
      throw new InvalidMeasurementError('At least one field must be provided to update');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new InvalidMeasurementError('Measurement name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new InvalidMeasurementError('Measurement name must be less than 100 characters');
      }
    }

    // Validate address if provided
    if (data.address && data.address.length > 200) {
      throw new InvalidMeasurementError('Address must be less than 200 characters');
    }

    // Validate notes if provided
    if (data.notes && data.notes.length > 500) {
      throw new InvalidMeasurementError('Notes must be less than 500 characters');
    }
  }
}
