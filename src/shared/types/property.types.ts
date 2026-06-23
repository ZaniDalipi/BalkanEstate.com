// Property domain types

import { UserRole } from './user.types';

export type PropertyStatus = 'active' | 'pending' | 'sold' | 'rented' | 'draft';
export type ListingType = 'sale' | 'rent';
export type RentPeriod = 'monthly' | 'weekly' | 'daily';
export type PropertyImageTag = 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
export type PropertyType = 'house' | 'apartment' | 'villa' | 'land' | 'other';
export type FurnishingStatus = 'any' | 'furnished' | 'semi-furnished' | 'unfurnished';
export type HeatingType = 'any' | 'central' | 'electric' | 'gas' | 'oil' | 'heat-pump' | 'solar' | 'wood' | 'none';
export type PropertyCondition = 'any' | 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
export type ViewType = 'any' | 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
export type EnergyRating = 'any' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Orientation = 'any' | 'north' | 'south' | 'east' | 'west' | 'northEast' | 'northWest' | 'southEast' | 'southWest';
export type PropertyPromotionTier = 'standard' | 'featured' | 'highlight' | 'premium';

export interface PropertyImage {
  url: string;
  tag: PropertyImageTag;
}

export interface Seller {
  type: 'agent' | 'private';
  name: string;
  avatarUrl?: string;
  phone: string;
  agencyName?: string;
  agencyLogo?: string;
  agencyId?: string;
  agentId?: string;
}

// Price interval for time-based pricing
export interface PriceInterval {
  price: number;
  startDate: number; // Unix timestamp
  endDate?: number; // Unix timestamp, undefined means ongoing
  label?: string; // Optional label like "Summer Sale", "Holiday Special"
}

export interface RentalHistoryEntry {
  _id: string;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
  monthlyRent: number;
  tenantName?: string;
  notes?: string;
}

export interface PriceHistoryEntry {
  id: string;
  propertyId: string;
  price: number;
  previousPrice?: number;
  changeType: 'initial' | 'increase' | 'decrease';
  percentageChange?: number;
  changedAt: string; // ISO date string from backend
}

export interface PropertyPriceHistoryResponse {
  history: PriceHistoryEntry[];
  currentPrice: number;
  originalPrice?: number;
  priceReducedAt?: string;
  priceIntervals: PriceInterval[];
  sqft?: number;
  createdAt?: string;
  listingType?: string;
  rentPeriod?: RentPeriod;
  status?: string;
}

export interface Property {
  id: string;
  propertyId?: string; // Custom property ID assigned by agency/agent
  title?: string;
  sellerId: string;
  listingType: ListingType;
  status: PropertyStatus;
  soldAt?: number;
  rentedAt?: number;
  price: number;
  isNegotiable?: boolean; // When true, price is "By Negotiation" (price field can be 0)
  // Price discount fields
  originalPrice?: number; // Original price before discount
  priceReducedAt?: number; // Timestamp when price was reduced
  priceIntervals?: PriceInterval[]; // Time-based pricing intervals
  address: string;
  city: string;
  country: string;
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
  tourUrl?: string;
  virtualTour360Url?: string;
  hasVirtualTour360?: boolean;
  videoUrl?: string; // URL for embedded video (YouTube, TikTok, Instagram, Vimeo, etc.)
  // Generated video fields (auto-generated property showcase video)
  generatedVideoUrl?: string; // URL for the auto-generated property video
  generatedVideoPublicId?: string; // Cloudinary public_id for the generated video
  generatedVideoFormat?: 'vertical' | 'horizontal' | 'square'; // Video format
  generatedVideoDuration?: number; // Duration in seconds
  hasGeneratedVideo?: boolean; // Flag indicating if generated video is available
  imageUrl: string;
  images?: PropertyImage[];
  lat: number;
  lng: number;
  seller: Seller;
  propertyType: PropertyType;
  floorNumber?: number;
  totalFloors?: number;
  floorplanUrl?: string;
  createdAt?: number;
  lastRenewed?: number;
  views?: number;
  saves?: number;
  inquiries?: number;
  createdAsRole?: UserRole;
  createdByAgencyId?: string; // Direct reference to the Agency that listed this property
  // Advanced property features
  furnishing?: FurnishingStatus;
  heatingType?: HeatingType;
  condition?: PropertyCondition;
  viewType?: ViewType;
  energyRating?: EnergyRating;
  orientation?: Orientation;
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
  // Promotion fields
  isPromoted?: boolean;
  promotionTier?: PropertyPromotionTier;
  promotionStartDate?: number;
  promotionEndDate?: number;
  hasUrgentBadge?: boolean;
  // Rental-specific fields
  rentPeriod?: RentPeriod;
  securityDeposit?: number;
  minimumLeaseDuration?: number;
  maximumLeaseDuration?: number;
  availableFrom?: number;
  utilitiesIncluded?: boolean;
  internetIncluded?: boolean;
  tenantRequirements?: string[];
  maxOccupants?: number;
  rentedUntil?: number;
  rentalHistory?: RentalHistoryEntry[];
  // Visit/viewing availability
  visitAvailability?: VisitAvailability;
  // Currency
  currency?: string;
  // Computed price discount flag
  hasDiscount?: boolean;
  // Alias fields (for component compatibility)
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  // Agent reference
  agentId?: string;
  // Universal-listings ingestion: present when this listing was imported from a third-party site.
  source?: string;
  sourceUrl?: string;
  sourceFetchedAt?: number;
}

export interface VisitAvailability {
  enabled: boolean;
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "18:00"
  slotDurationMinutes: number; // e.g. 30
  notes?: string;
}

export type SellerType = 'any' | 'agent' | 'private';

export interface Filters {
  query: string;
  country: string;
  listingType: 'any' | ListingType;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  livingRooms: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  sortBy: string;
  sellerType: SellerType;
  propertyType: 'any' | PropertyType;
  // Advanced filters
  minYearBuilt: number | null;
  maxYearBuilt: number | null;
  minParking: number | null;
  furnishing: FurnishingStatus;
  heatingType: HeatingType;
  condition: PropertyCondition;
  viewType: ViewType;
  energyRating: EnergyRating;
  hasBalcony: boolean | null;
  hasGarden: boolean | null;
  hasElevator: boolean | null;
  hasSecurity: boolean | null;
  hasAirConditioning: boolean | null;
  hasPool: boolean | null;
  petsAllowed: boolean | null;
  minFloorNumber: number | null;
  maxFloorNumber: number | null;
  maxDistanceToCenter: number | null;
  maxDistanceToSea: number | null;
  maxDistanceToSchool: number | null;
  maxDistanceToHospital: number | null;
  amenities: string[];
  // Price discount filter
  has360Tour: boolean | null;
  hasDiscount: boolean | null;
  hasPriceIncrease: boolean | null;
  minPricePerSqm: number | null;
  maxPricePerSqm: number | null;
  maxDaysListed: number | null;
}

export const initialFilters: Filters = {
  query: '',
  country: 'any',
  listingType: 'sale',
  minPrice: null,
  maxPrice: null,
  beds: null,
  baths: null,
  livingRooms: null,
  minSqft: null,
  maxSqft: null,
  sortBy: 'newest',
  sellerType: 'any',
  propertyType: 'any',
  minYearBuilt: null,
  maxYearBuilt: null,
  minParking: null,
  furnishing: 'any',
  heatingType: 'any',
  condition: 'any',
  viewType: 'any',
  energyRating: 'any',
  hasBalcony: null,
  hasGarden: null,
  hasElevator: null,
  hasSecurity: null,
  hasAirConditioning: null,
  hasPool: null,
  petsAllowed: null,
  minFloorNumber: null,
  maxFloorNumber: null,
  maxDistanceToCenter: null,
  maxDistanceToSea: null,
  maxDistanceToSchool: null,
  maxDistanceToHospital: null,
  amenities: [],
  has360Tour: null,
  hasDiscount: null,
  hasPriceIncrease: null,
  minPricePerSqm: null,
  maxPricePerSqm: null,
  maxDaysListed: null,
};
