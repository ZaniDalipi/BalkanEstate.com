// Agency domain types

import { User, Testimonial } from './user.types';

export type AgencyType = 'standard' | 'luxury' | 'commercial' | 'boutique' | 'team';

export interface BusinessHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface AgencySalesStats {
  salesLast12Months: number;
  totalSales: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
}

export interface Agency {
  _id: string;
  slug?: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email: string;
  phone: string;
  city?: string;
  country?: string;
  address?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  website?: string;
  totalProperties: number;
  totalAgents: number;
  yearsInBusiness?: number;
  isFeatured: boolean;
  featuredStartDate?: string;
  featuredEndDate?: string;
  adRotationOrder?: number;
  specializations?: string[];
  specialties?: string[];
  certifications?: string[];
  languages?: string[];
  serviceAreas?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  type?: AgencyType;
  businessHours?: BusinessHours;
  agents?: Agent[];
  ownerId?: string | { _id: string; name: string; email: string; role?: string };
  admins?: string[];
  invitationCode?: string;
  agentCoupons?: {
    coupons: Array<{
      code: string;
      status: 'available' | 'used' | 'expired';
      generatedAt?: string;
      expiresAt?: string;
      usedBy?: { _id: string; name: string; email: string } | null;
      usedAt?: string;
    }>;
    available: number;
    used: number;
    expired: number;
    canGenerateMore: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  totalListings?: number;
  salesStats?: AgencySalesStats;
}

export interface Agent extends User {
  userId?: string;
  licenseCountry?: string;
  licenseStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  totalSalesValue: number;
  propertiesSold: number;
  activeListings: number;
  rating: number;
  totalReviews?: number;
  bio?: string;
  specializations?: string[];
  yearsOfExperience?: number;
  languages?: string[];
  serviceAreas?: string[];
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  officeAddress?: string;
  officePhone?: string;
  teamSize?: number;
  minPrice?: number;
  maxPrice?: number;
  receiveInquiries?: boolean;
  averageprice?: number;
  certifications?: string[];
  recentsales?: {
    propertyId: string;
    soldPrice: number;
    soldDate: string;
  }[];
  awards?: string[];
  agencyLogo?: string;
  agencySlug?: string;
  agencyGradient?: string;
  agencyCoverImage?: string;
  agencyType?: AgencyType;
}

export interface AgencyFilters {
  city?: string;
  search?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export interface JoinRequest {
  _id: string;
  agencyId: string;
  userId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}
