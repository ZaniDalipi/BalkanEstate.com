// Use Case: Save Measurement
// Single responsibility: Save a new measurement with limit validation

import { Measurement } from '../../entities/Measurement';
import {
  IMeasurementRepository,
  CreateMeasurementDTO,
  MeasurementLimitExceededError,
  InvalidMeasurementError,
} from '../../repositories/IMeasurementRepository';

export interface SaveMeasurementResult {
  measurement: Measurement;
  count: number;
  maxAllowed: number;
  remainingSlots: number;
}

export class SaveMeasurementUseCase {
  constructor(private measurementRepository: IMeasurementRepository) {}

  async execute(data: CreateMeasurementDTO): Promise<SaveMeasurementResult> {
    // Step 1: Validate measurement data
    this.validateMeasurementData(data);

    // Step 2: Check if user can save more measurements
    const { canSave, count, maxAllowed, isPro } = await this.measurementRepository.canSaveMeasurement();

    if (!canSave) {
      throw new MeasurementLimitExceededError(count, maxAllowed, isPro);
    }

    // Step 3: Save the measurement
    const response = await this.measurementRepository.saveMeasurement(data);

    return {
      measurement: response.measurement,
      count: response.count,
      maxAllowed: response.maxAllowed,
      remainingSlots: response.maxAllowed - response.count,
    };
  }

  private validateMeasurementData(data: CreateMeasurementDTO): void {
    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new InvalidMeasurementError('Measurement name is required');
    }

    if (data.name.length > 100) {
      throw new InvalidMeasurementError('Measurement name must be less than 100 characters');
    }

    // Validate points
    if (!data.points || data.points.length === 0) {
      throw new InvalidMeasurementError('Measurement must have at least one point');
    }

    // Validate minimum points based on type
    if (data.type === 'distance' && data.points.length < 2) {
      throw new InvalidMeasurementError('Distance measurement requires at least 2 points');
    }

    if (data.type === 'area' && data.points.length < 3) {
      throw new InvalidMeasurementError('Area measurement requires at least 3 points');
    }

    // Validate each point
    for (const point of data.points) {
      if (point.lat < -90 || point.lat > 90) {
        throw new InvalidMeasurementError('Invalid latitude value');
      }
      if (point.lng < -180 || point.lng > 180) {
        throw new InvalidMeasurementError('Invalid longitude value');
      }
    }

    // Validate type
    if (data.type !== 'distance' && data.type !== 'area') {
      throw new InvalidMeasurementError('Measurement type must be "distance" or "area"');
    }

    // Validate distance (if provided)
    if (data.distance !== undefined && data.distance < 0) {
      throw new InvalidMeasurementError('Distance cannot be negative');
    }

    // Validate area (if provided)
    if (data.area !== undefined && data.area < 0) {
      throw new InvalidMeasurementError('Area cannot be negative');
    }

    // Validate address length
    if (data.address && data.address.length > 200) {
      throw new InvalidMeasurementError('Address must be less than 200 characters');
    }

    // Validate notes length
    if (data.notes && data.notes.length > 500) {
      throw new InvalidMeasurementError('Notes must be less than 500 characters');
    }
  }
}
