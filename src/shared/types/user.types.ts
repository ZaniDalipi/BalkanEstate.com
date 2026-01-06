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

export type SubscriptionTier = 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'trial';
export type SubscriptionPlan = 'free' | 'pro_monthly' | 'pro_yearly' | 'enterprise_yearly';

export interface PromotionCoupons {
  monthly: number;           // Monthly allocation (0, 2, 15)
  available: number;         // Currently available total
  used: number;              // Used this month
  featured: number;          // Featured coupons available
  highlighted: number;       // Highlighted coupons available
  featuredDuration: number;  // Days per featured coupon (7 or 14)
  highlightedDuration: number; // Days per highlighted coupon (7 or 14)
  lastRefresh?: Date | string;
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;

  // Listing management
  listingsLimit: number;
  activeListingsCount: number;
  privateSellerCount: number;
  agentCount: number;

  // Promotion coupons
  promotionCoupons: PromotionCoupons;

  // Agency reference (for agency_agent tier)
  agencyId?: string;

  // Buyer-specific
  savedSearchesLimit?: number;

  // Billing
  totalPaid?: number;
  autoRenew?: boolean;

  // Dates
  expiresAt?: Date | string;
  startedAt?: Date | string;

  // Coupon source (for agency_agent)
  couponCode?: string;
  couponExpiresAt?: Date | string;
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
