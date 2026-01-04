// Property domain types

import { UserRole } from './user.types';

export type PropertyStatus = 'active' | 'pending' | 'sold' | 'draft';
export type PropertyImageTag = 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
export type PropertyType = 'house' | 'apartment' | 'villa' | 'land' | 'other';
export type FurnishingStatus = 'any' | 'furnished' | 'semi-furnished' | 'unfurnished';
export type HeatingType = 'any' | 'central' | 'electric' | 'gas' | 'oil' | 'heat-pump' | 'solar' | 'wood' | 'none';
export type PropertyCondition = 'any' | 'new' | 'excellent' | 'good' | 'fair' | 'needs-renovation';
export type ViewType = 'any' | 'sea' | 'mountain' | 'city' | 'park' | 'garden' | 'street';
export type EnergyRating = 'any' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type PromotionTier = 'standard' | 'featured' | 'highlight' | 'premium';

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
}

// Price interval for time-based pricing
export interface PriceInterval {
  price: number;
  startDate: number; // Unix timestamp
  endDate?: number; // Unix timestamp, undefined means ongoing
  label?: string; // Optional label like "Summer Sale", "Holiday Special"
}

export interface Property {
  id: string;
  title?: string;
  sellerId: string;
  status: PropertyStatus;
  soldAt?: number;
  price: number;
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
  // Advanced property features
  furnishing?: FurnishingStatus;
  heatingType?: HeatingType;
  condition?: PropertyCondition;
  viewType?: ViewType;
  energyRating?: EnergyRating;
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
  promotionTier?: PromotionTier;
  promotionStartDate?: number;
  promotionEndDate?: number;
  hasUrgentBadge?: boolean;
}

export type SellerType = 'any' | 'agent' | 'private';

export interface Filters {
  query: string;
  country: string;
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
  hasDiscount: boolean | null;
}

export const initialFilters: Filters = {
  query: '',
  country: 'any',
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
  hasDiscount: null,
};
