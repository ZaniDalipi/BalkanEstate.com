// Measurement API Client
// Handles all measurement-related API requests

import { httpClient } from './httpClient';

// API DTOs
export interface MeasurementPointDTO {
  lat: number;
  lng: number;
}

export interface MeasurementDTO {
  id: string;
  name: string;
  points: MeasurementPointDTO[];
  type: 'distance' | 'area';
  distance?: number;
  area?: number;
  perimeter?: number;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeasurementsResponseDTO {
  success: boolean;
  measurements: MeasurementDTO[];
  count: number;
  maxAllowed: number;
  isPro: boolean;
}

export interface SaveMeasurementResponseDTO {
  success: boolean;
  measurement: MeasurementDTO;
  count: number;
  maxAllowed: number;
}

export interface UpdateMeasurementResponseDTO {
  success: boolean;
  measurement: MeasurementDTO;
}

export interface DeleteMeasurementResponseDTO {
  success: boolean;
  count: number;
}

export interface GetMeasurementResponseDTO {
  success: boolean;
  measurement: MeasurementDTO;
}

export interface CreateMeasurementRequestDTO {
  name: string;
  points: MeasurementPointDTO[];
  type: 'distance' | 'area';
  distance?: number;
  area?: number;
  perimeter?: number;
  address?: string;
  notes?: string;
}

export interface UpdateMeasurementRequestDTO {
  name?: string;
  address?: string;
  notes?: string;
}

/**
 * API Client for measurement operations
 */
export class MeasurementApiClient {
  private static instance: MeasurementApiClient;

  private constructor() {}

  static getInstance(): MeasurementApiClient {
    if (!MeasurementApiClient.instance) {
      MeasurementApiClient.instance = new MeasurementApiClient();
    }
    return MeasurementApiClient.instance;
  }

  /**
   * Get all measurements for the current user
   */
  async getMeasurements(): Promise<MeasurementsResponseDTO> {
    return httpClient.get<MeasurementsResponseDTO>('/measurements', true);
  }

  /**
   * Get a single measurement by ID
   */
  async getMeasurementById(id: string): Promise<GetMeasurementResponseDTO> {
    return httpClient.get<GetMeasurementResponseDTO>(`/measurements/${id}`, true);
  }

  /**
   * Save a new measurement
   */
  async saveMeasurement(data: CreateMeasurementRequestDTO): Promise<SaveMeasurementResponseDTO> {
    return httpClient.post<SaveMeasurementResponseDTO>('/measurements', data, true);
  }

  /**
   * Update a measurement
   */
  async updateMeasurement(id: string, data: UpdateMeasurementRequestDTO): Promise<UpdateMeasurementResponseDTO> {
    return httpClient.put<UpdateMeasurementResponseDTO>(`/measurements/${id}`, data, true);
  }

  /**
   * Delete a measurement
   */
  async deleteMeasurement(id: string): Promise<DeleteMeasurementResponseDTO> {
    return httpClient.delete<DeleteMeasurementResponseDTO>(`/measurements/${id}`, true);
  }
}

// Export singleton instance
export const measurementApiClient = MeasurementApiClient.getInstance();
