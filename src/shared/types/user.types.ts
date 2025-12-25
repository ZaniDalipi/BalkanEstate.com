// User domain types

export enum UserRole {
  BUYER = 'buyer',
  PRIVATE_SELLER = 'private_seller',
  AGENT = 'agent',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export interface Testimonial {
  quote: string;
  clientName: string;
  rating: number;
  createdAt?: string;
  userId?: {
    _id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface UserSubscription {
  tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
  status: 'active' | 'canceled' | 'expired' | 'trial';
  listingsLimit: number;
  activeListingsCount: number;
  privateSellerCount: number;
  agentCount: number;
  promotionCoupons?: {
    monthly: number;
    available: number;
    used: number;
    rollover?: number;
    lastRefresh?: Date | string;
  };
  savedSearchesLimit?: number;
  totalPaid?: number;
  expiresAt?: Date | string;
  startedAt?: Date | string;
}

export interface ProSubscription {
  isActive: boolean;
  plan: 'pro_monthly' | 'pro_yearly';
  expiresAt?: Date | string;
  startedAt?: Date | string;
  totalListingsLimit: number;
  activeListingsCount: number;
  privateSellerCount: number;
  agentCount: number;
  promotionCoupons?: {
    highlightCoupons: number;
    usedHighlightCoupons: number;
  };
}

export interface FreeSubscription {
  activeListingsCount: number;
  listingsLimit: number;
}

export interface MarketStats {
  avgDaysOnMarket?: number;
  priceGrowthYoY?: number;
  activityLevel?: string;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone: string;
  role: UserRole;
  city?: string;
  country?: string;
  address?: string;
  lat?: number;
  lng?: number;
  agencyName?: string;
  agentId?: string;
  agencyId?: string;
  licenseNumber?: string;
  licenseVerified?: boolean;
  licenseVerificationDate?: Date;
  listingsCount?: number;
  totalListingsCreated?: number;
  testimonials?: Testimonial[];
  isSubscribed: boolean;
  publicKey?: string;
  // Legacy subscription fields
  subscriptionPlan?: string;
  subscriptionProductName?: string;
  subscriptionStatus?: 'active' | 'expired' | 'trial' | 'grace' | 'canceled';
  subscriptionExpiresAt?: string | Date;
  subscriptionStartedAt?: string | Date;
  subscriptionRenewalDate?: string | Date;
  subscriptionSource?: 'google' | 'apple' | 'stripe' | 'web';
  subscriptionPrice?: number;
  subscriptionAutoRenewing?: boolean;
  subscriptionCurrency?: string;
  marketStats?: MarketStats;
  // Dual-Role System fields
  availableRoles?: UserRole[];
  activeRole?: UserRole;
  primaryRole?: UserRole;
  // Unified subscriptions
  proSubscription?: ProSubscription;
  freeSubscription?: FreeSubscription;
  subscription?: UserSubscription;
}

export interface LoginHistoryEntry {
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  failureReason?: string;
}
