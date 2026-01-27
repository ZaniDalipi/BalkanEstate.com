// Domain Repository Interface: IMeasurementRepository
// Defines measurement data operations contract

import { Measurement, MeasurementPoint, MeasurementType } from '../entities/Measurement';

/**
 * DTO for creating a new measurement
 */
export interface CreateMeasurementDTO {
  name: string;
  points: MeasurementPoint[];
  type: MeasurementType;
  distance?: number;
  area?: number;
  perimeter?: number;
  address?: string;
  notes?: string;
}

/**
 * DTO for updating a measurement
 */
export interface UpdateMeasurementDTO {
  name?: string;
  address?: string;
  notes?: string;
}

/**
 * Response containing measurements with limit info
 */
export interface MeasurementsListResponse {
  measurements: Measurement[];
  count: number;
  maxAllowed: number;
  isPro: boolean;
}

/**
 * Response for single measurement operations
 */
export interface MeasurementResponse {
  measurement: Measurement;
  count: number;
  maxAllowed: number;
}

/**
 * Custom error for measurement limit exceeded
 */
export class MeasurementLimitExceededError extends Error {
  constructor(
    public readonly currentCount: number,
    public readonly maxAllowed: number,
    public readonly isPro: boolean
  ) {
    super(
      isPro
        ? `You have reached the maximum limit of ${maxAllowed} measurements.`
        : `Free users can save up to ${maxAllowed} measurements. Upgrade to Pro for more.`
    );
    this.name = 'MeasurementLimitExceededError';
  }
}

/**
 * Custom error for measurement not found
 */
export class MeasurementNotFoundError extends Error {
  constructor(id: string) {
    super(`Measurement with ID "${id}" not found.`);
    this.name = 'MeasurementNotFoundError';
  }
}

/**
 * Custom error for invalid measurement data
 */
export class InvalidMeasurementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMeasurementError';
  }
}

/**
 * Repository interface for measurement operations
 */
export interface IMeasurementRepository {
  /**
   * Get all saved measurements for the current user
   */
  getMeasurements(): Promise<MeasurementsListResponse>;

  /**
   * Get a single measurement by ID
   */
  getMeasurementById(id: string): Promise<Measurement>;

  /**
   * Save a new measurement
   * @throws MeasurementLimitExceededError if limit is reached
   */
  saveMeasurement(data: CreateMeasurementDTO): Promise<MeasurementResponse>;

  /**
   * Update an existing measurement
   * @throws MeasurementNotFoundError if measurement doesn't exist
   */
  updateMeasurement(id: string, data: UpdateMeasurementDTO): Promise<Measurement>;

  /**
   * Delete a measurement
   * @throws MeasurementNotFoundError if measurement doesn't exist
   */
  deleteMeasurement(id: string): Promise<{ count: number }>;

  /**
   * Check if user can save more measurements
   */
  canSaveMeasurement(): Promise<{ canSave: boolean; count: number; maxAllowed: number; isPro: boolean }>;
}
