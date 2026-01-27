// Domain Entity: Measurement
// Represents a saved measurement (distance or area) on the map

export interface MeasurementPoint {
  lat: number;
  lng: number;
}

export type MeasurementType = 'distance' | 'area';

/**
 * Measurement entity representing a saved map measurement
 */
export class Measurement {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly points: MeasurementPoint[],
    public readonly type: MeasurementType,
    public readonly distance: number, // Total distance in meters
    public readonly area: number, // Area in square meters (0 for distance type)
    public readonly perimeter: number, // Perimeter in meters (0 for distance type)
    public readonly address: string | null,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date | null
  ) {}

  /**
   * Check if measurement is valid (has minimum required points)
   */
  isValid(): boolean {
    if (this.type === 'distance') {
      return this.points.length >= 2;
    }
    return this.points.length >= 3;
  }

  /**
   * Format distance for display
   */
  formatDistance(): string {
    if (this.distance < 1000) {
      return `${this.distance.toFixed(1)} m`;
    }
    return `${(this.distance / 1000).toFixed(2)} km`;
  }

  /**
   * Format area for display
   */
  formatArea(): string {
    if (this.area < 10000) {
      return `${this.area.toFixed(1)} m²`;
    }
    const hectares = this.area / 10000;
    if (hectares < 100) {
      return `${hectares.toFixed(2)} ha`;
    }
    return `${(this.area / 1000000).toFixed(2)} km²`;
  }

  /**
   * Get display value based on type
   */
  getDisplayValue(): string {
    return this.type === 'area' ? this.formatArea() : this.formatDistance();
  }
}

/**
 * Measurement limits configuration
 */
export const MEASUREMENT_LIMITS = {
  FREE_MAX: 5,
  PRO_MAX: 100,
} as const;
