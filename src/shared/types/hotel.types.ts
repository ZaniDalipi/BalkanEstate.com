// Hotels & rooms-for-rent shared types.
// Mirrors backend/src/models/Hotel.ts — keep in sync.

export const HOTEL_PROPERTY_TYPES = [
  'hotel',
  'guesthouse',
  'apartment',
  'hostel',
  'villa',
  'resort',
  'bed_and_breakfast',
  'private_room',
] as const;
export type HotelPropertyType = typeof HOTEL_PROPERTY_TYPES[number];

export const ROOM_TYPES = [
  'single',
  'double',
  'twin',
  'triple',
  'family',
  'suite',
  'studio',
  'apartment',
  'dormitory',
] as const;
export type RoomType = typeof ROOM_TYPES[number];

export const HOTEL_AMENITIES = [
  'wifi',
  'parking',
  'pool',
  'gym',
  'spa',
  'restaurant',
  'bar',
  'breakfast',
  'air_conditioning',
  'heating',
  'kitchen',
  'laundry',
  'airport_shuttle',
  'pet_friendly',
  'family_friendly',
  'wheelchair_accessible',
  'beach_access',
  'room_service',
  'reception_24h',
  'non_smoking',
  'balcony',
  'sea_view',
  'mountain_view',
  'elevator',
  'jacuzzi',
  'private_pool',
  'minibar',
  'tv',
  'terrace',
  'kitchenette',
  'safe',
  'coffee_machine',
  'private_bathroom',
  'workspace',
] as const;
export type HotelAmenity = typeof HOTEL_AMENITIES[number];

export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'ALL', 'RSD', 'MKD', 'BGN', 'RON'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  ALL: 'L',
  RSD: 'дин',
  MKD: 'ден',
  BGN: 'лв',
  RON: 'lei',
};

export const CANCELLATION_POLICIES = ['flexible', 'moderate', 'strict', 'non_refundable'] as const;
export type CancellationPolicy = typeof CANCELLATION_POLICIES[number];

export interface Room {
  _id?: string;
  name: string;
  roomType: RoomType;
  description?: string;
  maxGuests: number;
  beds: number;
  bathrooms: number;
  sizeSqm?: number;
  pricePerNight: number;
  currency: SupportedCurrency;
  quantity: number;
  amenities?: HotelAmenity[];
}

export interface HotelImage {
  url: string;
  caption?: string;
}

export interface Hotel {
  id: string;
  owner: {
    id?: string;
    name?: string;
    avatarUrl?: string;
    email?: string;
  };
  name: string;
  slug: string;
  description?: string;
  propertyType: HotelPropertyType;
  starRating?: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  whatsapp?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  images: HotelImage[];
  amenities: HotelAmenity[];
  rooms: Room[];
  priceFrom?: number;
  currency: SupportedCurrency;
  checkInTime?: string;
  checkOutTime?: string;
  minNights?: number;
  maxNights?: number;
  cancellationPolicy?: CancellationPolicy;
  houseRules?: string[];
  petsAllowed: boolean;
  smokingAllowed: boolean;
  languagesSpoken?: string[];
  isActive: boolean;
  isVerified: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface HotelFilters {
  propertyType?: HotelPropertyType;
  city?: string;
  country?: string;
  amenities?: HotelAmenity[];
  minPrice?: number;
  maxPrice?: number;
  guests?: number;
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'rating';
  page?: number;
  limit?: number;
}

export interface HotelsResponse {
  hotels: Hotel[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateRoomData {
  name: string;
  roomType: RoomType;
  description?: string;
  maxGuests: number;
  beds: number;
  bathrooms?: number;
  sizeSqm?: number;
  pricePerNight: number;
  currency?: SupportedCurrency;
  quantity?: number;
  amenities?: HotelAmenity[];
}

export interface CreateHotelData {
  name: string;
  description?: string;
  propertyType: HotelPropertyType;
  starRating?: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  whatsapp?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  amenities?: HotelAmenity[];
  rooms: CreateRoomData[];
  currency?: SupportedCurrency;
  checkInTime?: string;
  checkOutTime?: string;
  minNights?: number;
  maxNights?: number;
  cancellationPolicy?: CancellationPolicy;
  houseRules?: string[];
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  languagesSpoken?: string[];
}
