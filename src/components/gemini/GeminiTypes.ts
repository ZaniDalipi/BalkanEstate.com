// GeminiTypes
// Type definitions and constants for Gemini AI property listing generator

import { PropertyImageTag } from '../../types';

// Step types for the wizard flow
export type Step = 'init' | 'loading' | 'form' | 'floorplan' | 'success';
export type Mode = 'ai' | 'manual';

// Image data structure
export interface ImageData {
  file: File | null;
  previewUrl: string;
}

// Listing data structure
export interface ListingData {
  streetAddress: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingRooms: number;
  sq_meters: number;
  year_built: number;
  parking_spots: number;
  specialFeatures: string[];
  materials: string[];
  amenities: string[];
  description: string;
  image_tags: { index: number; tag: string }[];
  tourUrl: string;
  propertyType: 'house' | 'apartment' | 'villa' | 'other';
  floorNumber: number;
  totalFloors: number;
  lat: number;
  lng: number;
  // Mandatory amenities
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  hasSecurity?: boolean;
  hasAirConditioning?: boolean;
  hasPool?: boolean;
  petsAllowed?: boolean;
}

// Initial listing data with default values
export const initialListingData: ListingData = {
  streetAddress: '',
  price: 0,
  bedrooms: 0,
  bathrooms: 0,
  livingRooms: 0,
  sq_meters: 0,
  year_built: new Date().getFullYear(),
  parking_spots: 0,
  specialFeatures: [],
  materials: [],
  amenities: [],
  description: '',
  image_tags: [],
  tourUrl: '',
  propertyType: 'house',
  floorNumber: 1,
  totalFloors: 1,
  lat: 0,
  lng: 0,
  hasBalcony: undefined,
  hasGarden: undefined,
  hasElevator: undefined,
  hasSecurity: undefined,
  hasAirConditioning: undefined,
  hasPool: undefined,
  petsAllowed: undefined,
};

// Languages corresponding to supported countries
export const LANGUAGES = [
  'English',
  'Albanian',
  'Macedonian',
  'Serbian',
  'Bosnian',
  'Croatian',
  'Montenegrin',
  'Greek',
  'Bulgarian',
  'Romanian',
];

// Valid property image tags
export const ALL_VALID_TAGS: PropertyImageTag[] = [
  'exterior',
  'living_room',
  'kitchen',
  'bedroom',
  'bathroom',
  'other',
];

// Free listing limit for non-subscribed users
export const FREE_LISTING_LIMIT = 3;

// CSS class constants for form inputs
export const inputBaseClasses =
  'block w-full text-base bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors focus:bg-white';

export const floatingInputClasses =
  'block px-2.5 pb-2.5 pt-4 w-full text-base text-neutral-900 bg-white rounded-lg border appearance-none focus:outline-none focus:ring-0 peer';

export const floatingLabelClasses =
  'absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1 peer-focus:text-primary';

export const floatingSelectLabelClasses =
  'absolute text-base text-neutral-700 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 start-1';
