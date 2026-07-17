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

// Bed types a host can mix & match within a room (e.g. "1 king bed" or
// "2 single beds" or "1 queen + 1 sofa bed"). Mirrors backend BED_TYPES.
export const BED_TYPES = [
  'single',
  'twin',
  'double',
  'queen',
  'king',
  'sofa_bed',
  'bunk',
] as const;
export type BedType = typeof BED_TYPES[number];

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

// On-site parking options a guest needs to know before booking.
export const PARKING_TYPES = ['none', 'free', 'paid', 'street'] as const;
export type ParkingType = typeof PARKING_TYPES[number];

// Payment methods a property accepts.
export const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'mobile_payment'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Outlook a specific room offers.
export const ROOM_VIEWS = ['none', 'sea', 'city', 'garden', 'pool', 'mountain', 'courtyard'] as const;
export type RoomView = typeof ROOM_VIEWS[number];

export interface BedOption {
  bedType: BedType;
  quantity: number;
}

export interface Room {
  _id?: string;
  name: string;
  roomType: RoomType;
  description?: string;
  maxGuests: number;
  /** Total bed count — derived from bedConfiguration when it's set. */
  beds: number;
  /** Structured bed breakdown, e.g. [{ bedType: 'king', quantity: 1 }]. */
  bedConfiguration?: BedOption[];
  bathrooms: number;
  sizeSqm?: number;
  pricePerNight: number;
  currency: SupportedCurrency;
  quantity: number;
  amenities?: HotelAmenity[];
  /** Free-text amenities the host defines beyond the standard list. */
  customAmenities?: string[];
  /** Outlook from the room (e.g. sea, city). */
  view?: RoomView;
  /** Whether breakfast is included in this room's nightly rate. */
  breakfastIncluded?: boolean;
  /** Whether this room can be cancelled free of charge. */
  freeCancellation?: boolean;
  /** Whether this is a non-smoking room. */
  nonSmoking?: boolean;
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
  neighborhood?: string;
  postalCode?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  images: HotelImage[];
  amenities: HotelAmenity[];
  /** Free-text amenities the host defines beyond the standard list. */
  customAmenities?: string[];
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
  checkInMinAge?: number;
  breakfastIncluded?: boolean;
  parkingType?: ParkingType;
  paymentMethods?: PaymentMethod[];
  prepaymentRequired?: boolean;
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
  bedConfiguration?: BedOption[];
  bathrooms?: number;
  sizeSqm?: number;
  pricePerNight: number;
  currency?: SupportedCurrency;
  quantity?: number;
  amenities?: HotelAmenity[];
  /** Free-text amenities the host defines beyond the standard list. */
  customAmenities?: string[];
  view?: RoomView;
  breakfastIncluded?: boolean;
  freeCancellation?: boolean;
  nonSmoking?: boolean;
}

export type HotelCodeStatus = 'active' | 'redeemed' | 'revoked';

export interface HotelListingCode {
  id: string;
  code: string;
  status: HotelCodeStatus;
  note?: string;
  redeemedBy?: { id?: string; name?: string; email?: string } | null;
  redeemedHotel?: { id?: string; name?: string; slug?: string } | null;
  redeemedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreateHotelData {
  /** Optional access code (interim monetization bridge). */
  listingCode?: string;
  name: string;
  description?: string;
  propertyType: HotelPropertyType;
  starRating?: number;
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  whatsapp?: string;
  address?: string;
  neighborhood?: string;
  postalCode?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  amenities?: HotelAmenity[];
  /** Free-text amenities the host defines beyond the standard list. */
  customAmenities?: string[];
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
  checkInMinAge?: number;
  breakfastIncluded?: boolean;
  parkingType?: ParkingType;
  paymentMethods?: PaymentMethod[];
  prepaymentRequired?: boolean;
}
