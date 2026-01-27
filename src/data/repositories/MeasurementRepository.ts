// Measurement Repository Implementation
// Implements IMeasurementRepository interface from domain layer

import { Measurement } from '@/src/domain/entities/Measurement';
import {
  IMeasurementRepository,
  CreateMeasurementDTO,
  UpdateMeasurementDTO,
  MeasurementsListResponse,
  MeasurementResponse,
  MeasurementLimitExceededError,
  MeasurementNotFoundError,
} from '@/src/domain/repositories/IMeasurementRepository';
import { measurementApiClient } from '../api/MeasurementApiClient';
import { MeasurementMapper } from '../mappers/MeasurementMapper';

/**
 * Repository implementation for measurement operations
 */
export class MeasurementRepository implements IMeasurementRepository {
  private static instance: MeasurementRepository;

  private constructor() {}

  static getInstance(): MeasurementRepository {
    if (!MeasurementRepository.instance) {
      MeasurementRepository.instance = new MeasurementRepository();
    }
    return MeasurementRepository.instance;
  }

  /**
   * Get all saved measurements for the current user
   */
  async getMeasurements(): Promise<MeasurementsListResponse> {
    try {
      const response = await measurementApiClient.getMeasurements();

      return {
        measurements: MeasurementMapper.toDomainList(response.measurements),
        count: response.count,
        maxAllowed: response.maxAllowed,
        isPro: response.isPro,
      };
    } catch (error: any) {
      console.error('[MeasurementRepository] getMeasurements error:', error);
      throw error;
    }
  }

  /**
   * Get a single measurement by ID
   */
  async getMeasurementById(id: string): Promise<Measurement> {
    try {
      const response = await measurementApiClient.getMeasurementById(id);

      if (!response.success || !response.measurement) {
        throw new MeasurementNotFoundError(id);
      }

      return MeasurementMapper.toDomain(response.measurement);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new MeasurementNotFoundError(id);
      }
      console.error('[MeasurementRepository] getMeasurementById error:', error);
      throw error;
    }
  }

  /**
   * Save a new measurement
   */
  async saveMeasurement(data: CreateMeasurementDTO): Promise<MeasurementResponse> {
    try {
      // First check if user can save more
      const { canSave, count, maxAllowed, isPro } = await this.canSaveMeasurement();

      if (!canSave) {
        throw new MeasurementLimitExceededError(count, maxAllowed, isPro);
      }

      const response = await measurementApiClient.saveMeasurement({
        name: data.name,
        points: data.points,
        type: data.type,
        distance: data.distance,
        area: data.area,
        perimeter: data.perimeter,
        address: data.address,
        notes: data.notes,
      });

      if (!response.success) {
        throw new Error('Failed to save measurement');
      }

      return {
        measurement: MeasurementMapper.toDomain(response.measurement),
        count: response.count,
        maxAllowed: response.maxAllowed,
      };
    } catch (error: any) {
      // Check if it's a limit error from the API
      if (error.message?.toLowerCase().includes('limit') ||
          error.message?.toLowerCase().includes('maximum')) {
        const listResponse = await this.getMeasurements();
        throw new MeasurementLimitExceededError(
          listResponse.count,
          listResponse.maxAllowed,
          listResponse.isPro
        );
      }
      console.error('[MeasurementRepository] saveMeasurement error:', error);
      throw error;
    }
  }

  /**
   * Update an existing measurement
   */
  async updateMeasurement(id: string, data: UpdateMeasurementDTO): Promise<Measurement> {
    try {
      const response = await measurementApiClient.updateMeasurement(id, {
        name: data.name,
        address: data.address,
        notes: data.notes,
      });

      if (!response.success || !response.measurement) {
        throw new MeasurementNotFoundError(id);
      }

      return MeasurementMapper.toDomain(response.measurement);
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new MeasurementNotFoundError(id);
      }
      console.error('[MeasurementRepository] updateMeasurement error:', error);
      throw error;
    }
  }

  /**
   * Delete a measurement
   */
  async deleteMeasurement(id: string): Promise<{ count: number }> {
    try {
      const response = await measurementApiClient.deleteMeasurement(id);

      if (!response.success) {
        throw new MeasurementNotFoundError(id);
      }

      return { count: response.count };
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new MeasurementNotFoundError(id);
      }
      console.error('[MeasurementRepository] deleteMeasurement error:', error);
      throw error;
    }
  }

  /**
   * Check if user can save more measurements
   */
  async canSaveMeasurement(): Promise<{ canSave: boolean; count: number; maxAllowed: number; isPro: boolean }> {
    try {
      const response = await this.getMeasurements();

      return {
        canSave: response.count < response.maxAllowed,
        count: response.count,
        maxAllowed: response.maxAllowed,
        isPro: response.isPro,
      };
    } catch (error) {
      console.error('[MeasurementRepository] canSaveMeasurement error:', error);
      // Default to allowing save if we can't check (will be validated server-side)
      return { canSave: true, count: 0, maxAllowed: 5, isPro: false };
    }
  }
}

// Export singleton instance
export const measurementRepository = MeasurementRepository.getInstance();
