// Domain Repository Interface: IPropertyRepository
// Defines property data operations contract

import { Property } from '../entities/Property';
import { PropertyFilters } from '../entities/PropertyFilters';

export interface CreatePropertyDTO {
  sellerId: string;
  price: number;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  beds: number;
  baths: number;
  livingRooms: number;
  sqft: number;
  yearBuilt: number;
  parking: number;
  description: string;
  specialFeatures: string[];
  materials: string[];
  amenities: string[];
  imageUrl: string;
  images?: { url: string; tag: string }[];
  propertyType: string;
  floorNumber?: number;
  totalFloors?: number;
  furnishing?: string;
  heatingType?: string;
  condition?: string;
  viewType?: string;
  energyRating?: string;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasAirConditioning?: boolean;
  hasPool?: boolean;
  petsAllowed?: boolean;
  distanceToCenter?: number;
  distanceToSea?: number;
  distanceToSchool?: number;
  distanceToHospital?: number;
}

export interface UpdatePropertyDTO extends Partial<CreatePropertyDTO> {
  status?: 'active' | 'pending' | 'sold' | 'draft';
}

/**
 * Repository interface for property operations
 */
export interface IPropertyRepository {
  /**
   * Get all properties with optional filters
   */
  getProperties(filters?: PropertyFilters): Promise<Property[]>;

  /**
   * Get a single property by ID
   */
  getPropertyById(id: string): Promise<Property>;

  /**
   * Create a new property listing
   */
  createProperty(data: CreatePropertyDTO): Promise<Property>;

  /**
   * Update an existing property
   */
  updateProperty(id: string, data: UpdatePropertyDTO): Promise<Property>;

  /**
   * Delete a property
   */
  deleteProperty(id: string): Promise<void>;

  /**
   * Get properties created by a specific user
   */
  getMyListings(userId: string): Promise<Property[]>;

  /**
   * Mark property as sold
   */
  markAsSold(id: string): Promise<Property>;

  /**
   * Renew property listing
   */
  renewListing(id: string): Promise<Property>;

  /**
   * Toggle saved/favorite property for a user
   */
  toggleSavedProperty(userId: string, propertyId: string): Promise<void>;

  /**
   * Get user's saved/favorite properties
   */
  getSavedProperties(userId: string): Promise<Property[]>;

  /**
   * Upload property images
   */
  uploadImages(propertyId: string, images: File[]): Promise<string[]>;

  /**
   * Delete a property image
   */
  deleteImage(propertyId: string, imageUrl: string): Promise<void>;

  /**
   * Log property view for analytics
   */
  logPropertyView(propertyId: string): Promise<void>;

  /**
   * Search properties with AI
   */
  searchWithAI(query: string): Promise<Property[]>;
}
