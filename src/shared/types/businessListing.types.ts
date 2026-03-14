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
  logoUrl?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
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
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  businessHours?: Record<string, string>;
}
