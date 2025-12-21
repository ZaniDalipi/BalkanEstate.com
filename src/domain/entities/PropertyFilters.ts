// Domain Value Object: PropertyFilters
// Pure TypeScript - No framework dependencies

import {
  FurnishingStatus,
  HeatingType,
  PropertyCondition,
  ViewType,
  EnergyRating,
} from './Property';

export type SellerType = 'any' | 'agent' | 'private';
export type PropertyTypeFilter = 'any' | 'house' | 'apartment' | 'villa' | 'other';

export class PropertyFilters {
  constructor(
    public readonly query: string = '',
    public readonly country: string = 'any',
    public readonly minPrice: number | null = null,
    public readonly maxPrice: number | null = null,
    public readonly beds: number | null = null,
    public readonly baths: number | null = null,
    public readonly livingRooms: number | null = null,
    public readonly minSqft: number | null = null,
    public readonly maxSqft: number | null = null,
    public readonly sortBy: string = 'newest',
    public readonly sellerType: SellerType = 'any',
    public readonly propertyType: PropertyTypeFilter = 'any',
    public readonly minYearBuilt: number | null = null,
    public readonly maxYearBuilt: number | null = null,
    public readonly minParking: number | null = null,
    public readonly furnishing: FurnishingStatus = 'any',
    public readonly heatingType: HeatingType = 'any',
    public readonly condition: PropertyCondition = 'any',
    public readonly viewType: ViewType = 'any',
    public readonly energyRating: EnergyRating = 'any',
    public readonly hasBalcony: boolean | null = null,
    public readonly hasGarden: boolean | null = null,
    public readonly hasElevator: boolean | null = null,
    public readonly hasSecurity: boolean | null = null,
    public readonly hasAirConditioning: boolean | null = null,
    public readonly hasPool: boolean | null = null,
    public readonly petsAllowed: boolean | null = null,
    public readonly minFloorNumber: number | null = null,
    public readonly maxFloorNumber: number | null = null,
    public readonly maxDistanceToCenter: number | null = null,
    public readonly maxDistanceToSea: number | null = null,
    public readonly maxDistanceToSchool: number | null = null,
    public readonly maxDistanceToHospital: number | null = null,
    public readonly amenities: string[] = []
  ) {}

  // Business logic methods

  get hasActiveFilters(): boolean {
    return (
      this.query !== '' ||
      this.country !== 'any' ||
      this.minPrice !== null ||
      this.maxPrice !== null ||
      this.beds !== null ||
      this.baths !== null ||
      this.livingRooms !== null ||
      this.minSqft !== null ||
      this.maxSqft !== null ||
      this.sellerType !== 'any' ||
      this.propertyType !== 'any' ||
      this.minYearBuilt !== null ||
      this.maxYearBuilt !== null ||
      this.minParking !== null ||
      this.furnishing !== 'any' ||
      this.heatingType !== 'any' ||
      this.condition !== 'any' ||
      this.viewType !== 'any' ||
      this.energyRating !== 'any' ||
      this.hasBalcony !== null ||
      this.hasGarden !== null ||
      this.hasElevator !== null ||
      this.hasSecurity !== null ||
      this.hasAirConditioning !== null ||
      this.hasPool !== null ||
      this.petsAllowed !== null ||
      this.minFloorNumber !== null ||
      this.maxFloorNumber !== null ||
      this.maxDistanceToCenter !== null ||
      this.maxDistanceToSea !== null ||
      this.maxDistanceToSchool !== null ||
      this.maxDistanceToHospital !== null ||
      this.amenities.length > 0
    );
  }

  get activeFilterCount(): number {
    let count = 0;
    if (this.query !== '') count++;
    if (this.country !== 'any') count++;
    if (this.minPrice !== null) count++;
    if (this.maxPrice !== null) count++;
    if (this.beds !== null) count++;
    if (this.baths !== null) count++;
    if (this.livingRooms !== null) count++;
    if (this.minSqft !== null) count++;
    if (this.maxSqft !== null) count++;
    if (this.sellerType !== 'any') count++;
    if (this.propertyType !== 'any') count++;
    if (this.minYearBuilt !== null) count++;
    if (this.maxYearBuilt !== null) count++;
    if (this.minParking !== null) count++;
    if (this.furnishing !== 'any') count++;
    if (this.heatingType !== 'any') count++;
    if (this.condition !== 'any') count++;
    if (this.viewType !== 'any') count++;
    if (this.energyRating !== 'any') count++;
    if (this.hasBalcony !== null) count++;
    if (this.hasGarden !== null) count++;
    if (this.hasElevator !== null) count++;
    if (this.hasSecurity !== null) count++;
    if (this.hasAirConditioning !== null) count++;
    if (this.hasPool !== null) count++;
    if (this.petsAllowed !== null) count++;
    if (this.minFloorNumber !== null) count++;
    if (this.maxFloorNumber !== null) count++;
    if (this.maxDistanceToCenter !== null) count++;
    if (this.maxDistanceToSea !== null) count++;
    if (this.maxDistanceToSchool !== null) count++;
    if (this.maxDistanceToHospital !== null) count++;
    if (this.amenities.length > 0) count += this.amenities.length;
    return count;
  }

  reset(): PropertyFilters {
    return new PropertyFilters();
  }

  withQuery(query: string): PropertyFilters {
    return new PropertyFilters(
      query,
      this.country,
      this.minPrice,
      this.maxPrice,
      this.beds,
      this.baths,
      this.livingRooms,
      this.minSqft,
      this.maxSqft,
      this.sortBy,
      this.sellerType,
      this.propertyType,
      this.minYearBuilt,
      this.maxYearBuilt,
      this.minParking,
      this.furnishing,
      this.heatingType,
      this.condition,
      this.viewType,
      this.energyRating,
      this.hasBalcony,
      this.hasGarden,
      this.hasElevator,
      this.hasSecurity,
      this.hasAirConditioning,
      this.hasPool,
      this.petsAllowed,
      this.minFloorNumber,
      this.maxFloorNumber,
      this.maxDistanceToCenter,
      this.maxDistanceToSea,
      this.maxDistanceToSchool,
      this.maxDistanceToHospital,
      this.amenities
    );
  }

  withPriceRange(minPrice: number | null, maxPrice: number | null): PropertyFilters {
    return new PropertyFilters(
      this.query,
      this.country,
      minPrice,
      maxPrice,
      this.beds,
      this.baths,
      this.livingRooms,
      this.minSqft,
      this.maxSqft,
      this.sortBy,
      this.sellerType,
      this.propertyType,
      this.minYearBuilt,
      this.maxYearBuilt,
      this.minParking,
      this.furnishing,
      this.heatingType,
      this.condition,
      this.viewType,
      this.energyRating,
      this.hasBalcony,
      this.hasGarden,
      this.hasElevator,
      this.hasSecurity,
      this.hasAirConditioning,
      this.hasPool,
      this.petsAllowed,
      this.minFloorNumber,
      this.maxFloorNumber,
      this.maxDistanceToCenter,
      this.maxDistanceToSea,
      this.maxDistanceToSchool,
      this.maxDistanceToHospital,
      this.amenities
    );
  }

  // Factory method
  static fromDTO(dto: any): PropertyFilters {
    return new PropertyFilters(
      dto.query || '',
      dto.country || 'any',
      dto.minPrice,
      dto.maxPrice,
      dto.beds,
      dto.baths,
      dto.livingRooms,
      dto.minSqft,
      dto.maxSqft,
      dto.sortBy || 'newest',
      dto.sellerType || 'any',
      dto.propertyType || 'any',
      dto.minYearBuilt,
      dto.maxYearBuilt,
      dto.minParking,
      dto.furnishing || 'any',
      dto.heatingType || 'any',
      dto.condition || 'any',
      dto.viewType || 'any',
      dto.energyRating || 'any',
      dto.hasBalcony,
      dto.hasGarden,
      dto.hasElevator,
      dto.hasSecurity,
      dto.hasAirConditioning,
      dto.hasPool,
      dto.petsAllowed,
      dto.minFloorNumber,
      dto.maxFloorNumber,
      dto.maxDistanceToCenter,
      dto.maxDistanceToSea,
      dto.maxDistanceToSchool,
      dto.maxDistanceToHospital,
      dto.amenities || []
    );
  }

  toDTO(): any {
    return {
      query: this.query,
      country: this.country,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      beds: this.beds,
      baths: this.baths,
      livingRooms: this.livingRooms,
      minSqft: this.minSqft,
      maxSqft: this.maxSqft,
      sortBy: this.sortBy,
      sellerType: this.sellerType,
      propertyType: this.propertyType,
      minYearBuilt: this.minYearBuilt,
      maxYearBuilt: this.maxYearBuilt,
      minParking: this.minParking,
      furnishing: this.furnishing,
      heatingType: this.heatingType,
      condition: this.condition,
      viewType: this.viewType,
      energyRating: this.energyRating,
      hasBalcony: this.hasBalcony,
      hasGarden: this.hasGarden,
      hasElevator: this.hasElevator,
      hasSecurity: this.hasSecurity,
      hasAirConditioning: this.hasAirConditioning,
      hasPool: this.hasPool,
      petsAllowed: this.petsAllowed,
      minFloorNumber: this.minFloorNumber,
      maxFloorNumber: this.maxFloorNumber,
      maxDistanceToCenter: this.maxDistanceToCenter,
      maxDistanceToSea: this.maxDistanceToSea,
      maxDistanceToSchool: this.maxDistanceToSchool,
      maxDistanceToHospital: this.maxDistanceToHospital,
      amenities: this.amenities,
    };
  }

  static getDefault(): PropertyFilters {
    return new PropertyFilters();
  }
}
