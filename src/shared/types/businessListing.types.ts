export const BUSINESS_CATEGORIES = [
  'construction',
  'renovation',
  'cleaning',
  'moving',
  'interior_design',
  'architecture',
  'plumbing',
  'electrical',
  'landscaping',
  'security',
  'real_estate_law',
  'insurance',
  'home_inspection',
  'pest_control',
  'painting',
  'roofing',
  'hvac',
  'furniture',
  'appliances',
  'other',
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

export const LISTING_TYPES = ['business', 'individual'] as const;
export type ListingType = typeof LISTING_TYPES[number];

export const PRICE_RANGES = ['$', '$$', '$$$'] as const;
export type PriceRange = typeof PRICE_RANGES[number];

export const PAYMENT_METHODS = [
  'cash', 'credit_card', 'debit_card', 'bank_transfer',
  'paypal', 'crypto', 'invoice',
] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const BALKAN_LANGUAGES = [
  'Albanian', 'Bosnian', 'Bulgarian', 'Croatian', 'English',
  'German', 'Greek', 'Hungarian', 'Italian', 'Macedonian',
  'Montenegrin', 'Romanian', 'Serbian', 'Slovenian', 'Turkish',
  'French', 'Russian', 'Arabic',
] as const;

export interface BusinessListing {
  id: string;
  owner: {
    id?: string;
    name?: string;
    avatarUrl?: string;
  };
  listingType: ListingType;
  name: string;
  slug: string;
  description?: string;
  category: BusinessCategory;
  services: string[];
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  logoUrl?: string;
  bannerUrl?: string;
  whatsapp?: string;
  viber?: string;
  languages?: string[];
  yearEstablished?: number;
  licenseNumber?: string;
  serviceAreas?: string[];
  priceRange?: PriceRange;
  paymentMethods?: PaymentMethod[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  isActive: boolean;
  isVerified: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessListingFilters {
  category?: BusinessCategory;
  listingType?: ListingType;
  city?: string;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BusinessListingsResponse {
  listings: BusinessListing[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateBusinessListingData {
  listingType?: ListingType;
  name: string;
  description?: string;
  category: BusinessCategory;
  services?: string[];
  contactPhone: string;
  contactEmail?: string;
  website?: string;
  address?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  whatsapp?: string;
  viber?: string;
  languages?: string[];
  yearEstablished?: number;
  licenseNumber?: string;
  serviceAreas?: string[];
  priceRange?: PriceRange;
  paymentMethods?: PaymentMethod[];
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    tiktok?: string;
  };
  businessHours?: Record<string, string>;
}
