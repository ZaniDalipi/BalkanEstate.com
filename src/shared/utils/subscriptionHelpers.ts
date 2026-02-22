/**
 * Subscription Helpers - Single Source of Truth
 *
 * This file contains all subscription-related logic and configurations.
 * All components should use these helpers instead of hardcoding subscription rules.
 */

import {
  UserSubscription,
  SubscriptionTier,
  SubscriptionPlan,
  PromotionCoupons,
  UserRole,
} from '../types/user.types';

// ============================================================================
// SUBSCRIPTION CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Listing limits by subscription tier
 * Note: pro_monthly gets 20/month, pro_yearly gets 250/year
 * For 'pro' tier, we use the yearly limit as the default
 */
export const LISTING_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,
  pro: 250, // Pro yearly gets 250 listings/year (pro_monthly handled separately at 20/month)
  agency_owner: 500, // Enterprise: 500 listings
  agency_agent: 25,
  buyer: 3,
};

/**
 * Listing limits by subscription plan (more specific)
 */
export const PLAN_LISTING_LIMITS: Record<SubscriptionPlan, number> = {
  free: 3,
  pro_monthly: 20, // 20 listings per month
  pro_yearly: 250, // 250 listings per year
  enterprise_yearly: 500, // 500 listings for enterprise
};

/**
 * Agency pool listing limit (shared among all agents)
 */
export const AGENCY_POOL_LISTINGS = 500;

/**
 * Promotion coupon configurations by plan
 * Pro: 3 coupons/month (2 highlighted + 1 premium)
 * Enterprise: 5 coupons/month (2 premium premier + 2 highlighted + 1 featured)
 */
export const PROMOTION_CONFIGS: Record<
  SubscriptionPlan,
  {
    monthly: number;
    featured: number;
    highlighted: number;
    premium: number; // Premium placement coupons
    featuredDuration: number;
    highlightedDuration: number;
    premiumDuration: number;
  }
> = {
  free: {
    monthly: 0,
    featured: 0,
    highlighted: 0,
    premium: 0,
    featuredDuration: 0,
    highlightedDuration: 0,
    premiumDuration: 0,
  },
  pro_monthly: {
    monthly: 3,
    featured: 0,
    highlighted: 2,
    premium: 1, // 1 premium placement
    featuredDuration: 7,
    highlightedDuration: 7,
    premiumDuration: 7,
  },
  pro_yearly: {
    monthly: 3,
    featured: 0,
    highlighted: 2,
    premium: 1, // 1 premium placement
    featuredDuration: 14,
    highlightedDuration: 14,
    premiumDuration: 14,
  },
  enterprise_yearly: {
    monthly: 5, // 5 coupons total for agency
    featured: 1, // 1 featured
    highlighted: 2, // 2 highlighted
    premium: 2, // 2 premium premier
    featuredDuration: 14,
    highlightedDuration: 14,
    premiumDuration: 14,
  },
};

/**
 * Agency-specific promotion allocations
 */
export const AGENCY_PROMOTIONS = {
  agentRecruitmentCoupons: 5, // One-time coupons to recruit agents
  agencyPagePromotions: 5, // Monthly promotions for agency visibility
  promotionCouponPool: 5, // Monthly shared promotion coupons (2 premium premier, 2 highlighted, 1 featured)
  maxTeamMembers: 5, // 5 team members included
};

/**
 * Subscription pricing (in EUR)
 */
export const SUBSCRIPTION_PRICING: Record<SubscriptionPlan, number> = {
  free: 0,
  pro_monthly: 25,
  pro_yearly: 200,
  enterprise_yearly: 1000,
};

/**
 * Feature limits by subscription plan
 */
export const FEATURE_LIMITS: Record<
  SubscriptionPlan,
  {
    savedSearches: number; // -1 = unlimited
    aiMessages: number; // -1 = unlimited (but rate limited)
    generateInsights: number; // -1 = unlimited
    autoGenerateImageDesc: number; // -1 = unlimited
  }
> = {
  free: {
    savedSearches: 3,
    aiMessages: 3,
    generateInsights: 3,
    autoGenerateImageDesc: 0, // No auto image descriptions for free tier
  },
  pro_monthly: {
    savedSearches: -1, // unlimited
    aiMessages: -1, // unlimited (rate limited to prevent spam)
    generateInsights: 20, // 20 per month
    autoGenerateImageDesc: -1, // unlimited
  },
  pro_yearly: {
    savedSearches: -1, // unlimited
    aiMessages: -1, // unlimited (rate limited to prevent spam)
    generateInsights: 20, // 20 per month
    autoGenerateImageDesc: -1, // unlimited
  },
  enterprise_yearly: {
    savedSearches: -1, // unlimited
    aiMessages: -1, // unlimited (rate limited to prevent spam)
    generateInsights: -1, // unlimited for all agents
    autoGenerateImageDesc: -1, // unlimited
  },
};

// ============================================================================
// DEFAULT SUBSCRIPTION GENERATORS
// ============================================================================

/**
 * Get default promotion coupons for a subscription plan
 */
export function getDefaultPromotionCoupons(plan: SubscriptionPlan): PromotionCoupons {
  const config = PROMOTION_CONFIGS[plan];
  return {
    monthly: config.monthly,
    available: config.monthly,
    used: 0,
    featured: config.featured,
    highlighted: config.highlighted,
    premium: config.premium,
    featuredDuration: config.featuredDuration,
    highlightedDuration: config.highlightedDuration,
    premiumDuration: config.premiumDuration,
    lastRefresh: new Date().toISOString(),
  };
}

/**
 * Get default subscription for free tier
 */
export function getDefaultFreeSubscription(): UserSubscription {
  return {
    tier: 'free',
    status: 'active',
    plan: 'free',
    listingsLimit: LISTING_LIMITS.free,
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: getDefaultPromotionCoupons('free'),
    startedAt: new Date().toISOString(),
  };
}

/**
 * Get default subscription for Pro tier
 */
export function getDefaultProSubscription(
  plan: 'pro_monthly' | 'pro_yearly',
  expiresAt: Date
): UserSubscription {
  return {
    tier: 'pro',
    status: 'active',
    plan,
    listingsLimit: PLAN_LISTING_LIMITS[plan], // Use plan-specific limit (20 for monthly, 250 for yearly)
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: getDefaultPromotionCoupons(plan),
    startedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    autoRenew: true,
  };
}

/**
 * Get default subscription for agency agent (coupon-based)
 */
export function getDefaultAgencyAgentSubscription(
  agencyId: string,
  couponCode: string,
  couponExpiresAt: Date
): UserSubscription {
  return {
    tier: 'agency_agent',
    status: 'active',
    plan: 'pro_yearly', // Coupon provides yearly pro equivalent
    listingsLimit: LISTING_LIMITS.agency_agent,
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: {
      // Agency agents use the agency's shared pool
      monthly: 0,
      available: 0,
      used: 0,
      featured: 0,
      highlighted: 0,
      premium: 0,
      featuredDuration: 14,
      highlightedDuration: 14,
      premiumDuration: 14,
    },
    agencyId,
    couponCode,
    couponExpiresAt: couponExpiresAt.toISOString(),
    startedAt: new Date().toISOString(),
    expiresAt: couponExpiresAt.toISOString(),
  };
}

/**
 * Get default subscription for agency owner
 */
export function getDefaultAgencyOwnerSubscription(expiresAt: Date): UserSubscription {
  return {
    tier: 'agency_owner',
    status: 'active',
    plan: 'enterprise_yearly',
    listingsLimit: PLAN_LISTING_LIMITS.enterprise_yearly, // 500 listings for enterprise
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: getDefaultPromotionCoupons('enterprise_yearly'),
    startedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    autoRenew: true,
  };
}

// ============================================================================
// PERMISSION CHECK HELPERS
// ============================================================================

/**
 * Check if user can post a listing
 */
export function canPostListing(
  subscription: UserSubscription | undefined,
  asRole: 'private_seller' | 'agent'
): { allowed: boolean; reason?: string } {
  if (!subscription) {
    return { allowed: false, reason: 'No subscription found' };
  }

  // Check subscription status
  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return { allowed: false, reason: 'Subscription is not active' };
  }

  // Free users cannot post as agent
  if (asRole === 'agent' && subscription.tier === 'free') {
    return {
      allowed: false,
      reason: 'Pro subscription required to post as agent',
    };
  }

  // Agency agents can ONLY post as agent
  if (subscription.tier === 'agency_agent' && asRole === 'private_seller') {
    return {
      allowed: false,
      reason: 'Agency agents can only post as agent, not as private seller',
    };
  }

  // Check listing limit
  if (subscription.activeListingsCount >= subscription.listingsLimit) {
    return {
      allowed: false,
      reason: `Listing limit reached (${subscription.activeListingsCount}/${subscription.listingsLimit})`,
    };
  }

  return { allowed: true };
}

/**
 * Check if user can become an agent
 */
export function canBecomeAgent(subscription: UserSubscription | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (!subscription) {
    return { allowed: false, reason: 'No subscription found' };
  }

  // Must have Pro, agency_owner, or agency_agent tier
  const allowedTiers: SubscriptionTier[] = ['pro', 'agency_owner', 'agency_agent'];

  if (!allowedTiers.includes(subscription.tier)) {
    return {
      allowed: false,
      reason: 'Pro subscription required to become an agent',
    };
  }

  if (subscription.status !== 'active' && subscription.status !== 'trial') {
    return {
      allowed: false,
      reason: 'Active subscription required to become an agent',
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create an agency
 * Uses multiple indicators to determine agent status (matching backend logic)
 * Database is the single source of truth for agent status
 */
export function canCreateAgency(
  subscription: Pick<UserSubscription, 'tier'> | undefined,
  availableRoles: UserRole[] | undefined,
  userFields?: {
    role?: UserRole | string;
    agentId?: string;
    licenseNumber?: string;
  }
): { allowed: boolean; reason?: string } {
  // Must be an active agent first - check multiple indicators (matches backend logic)
  // Database is the single source of truth, check all possible agent indicators
  const isAgent =
    availableRoles?.includes(UserRole.AGENT) ||
    userFields?.role === UserRole.AGENT ||
    userFields?.role === 'agent' ||
    !!userFields?.agentId ||
    !!userFields?.licenseNumber;

  if (!isAgent) {
    return {
      allowed: false,
      reason: 'You must be an agent to create an agency',
    };
  }

  // Check if user already owns an agency (agency_owner tier means they already have one)
  if (subscription?.tier === 'agency_owner') {
    return {
      allowed: false,
      reason: 'You already own an agency',
    };
  }

  // Agent can create an agency - no Pro subscription required
  return { allowed: true };
}

/**
 * Check if user can use promotion coupons
 */
export function canUsePromotionCoupon(
  subscription: UserSubscription | undefined,
  couponType: 'featured' | 'highlighted'
): { allowed: boolean; reason?: string; available: number } {
  if (!subscription) {
    return { allowed: false, reason: 'No subscription found', available: 0 };
  }

  const coupons = subscription.promotionCoupons;
  if (!coupons) {
    return { allowed: false, reason: 'No promotion coupons available', available: 0 };
  }

  const available = couponType === 'featured' ? coupons.featured : coupons.highlighted;

  if (available <= 0) {
    return {
      allowed: false,
      reason: `No ${couponType} coupons available`,
      available: 0,
    };
  }

  return { allowed: true, available };
}

/**
 * Get available roles based on subscription
 */
export function getAvailableRoles(subscription: UserSubscription | undefined): UserRole[] {
  if (!subscription) {
    return [UserRole.BUYER];
  }

  const roles: UserRole[] = [];

  switch (subscription.tier) {
    case 'buyer':
      roles.push(UserRole.BUYER);
      break;

    case 'free':
      roles.push(UserRole.PRIVATE_SELLER);
      break;

    case 'pro':
      roles.push(UserRole.PRIVATE_SELLER, UserRole.AGENT);
      break;

    case 'agency_agent':
      // Agency agents can ONLY be agents
      roles.push(UserRole.AGENT);
      break;

    case 'agency_owner':
      roles.push(UserRole.PRIVATE_SELLER, UserRole.AGENT);
      break;
  }

  return roles;
}

/**
 * Check if user can post as a specific role
 */
export function canPostAsRole(
  subscription: UserSubscription | undefined,
  role: 'private_seller' | 'agent'
): boolean {
  if (!subscription) return false;

  if (role === 'agent') {
    // Only Pro, agency_owner, and agency_agent can post as agent
    return ['pro', 'agency_owner', 'agency_agent'].includes(subscription.tier);
  }

  if (role === 'private_seller') {
    // Agency agents cannot post as private seller
    if (subscription.tier === 'agency_agent') return false;
    // Everyone else can post as private seller (except buyers)
    return subscription.tier !== 'buyer';
  }

  return false;
}

// ============================================================================
// SUBSCRIPTION STATUS HELPERS
// ============================================================================

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: UserSubscription | undefined): boolean {
  if (!subscription) return false;
  return subscription.status === 'active' || subscription.status === 'trial';
}

/**
 * Check if subscription is expired or expiring soon
 */
export function getSubscriptionStatus(subscription: UserSubscription | undefined): {
  isActive: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
} {
  if (!subscription) {
    return { isActive: false, isExpiringSoon: false, daysRemaining: null };
  }

  const isActive = subscription.status === 'active' || subscription.status === 'trial';

  if (!subscription.expiresAt) {
    return { isActive, isExpiringSoon: false, daysRemaining: null };
  }

  const expiresAt = new Date(subscription.expiresAt);
  const now = new Date();
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isActive,
    isExpiringSoon: daysRemaining <= 7 && daysRemaining > 0,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
  };
}

/**
 * Get remaining listings
 */
export function getRemainingListings(subscription: UserSubscription | undefined): number {
  if (!subscription) return 0;
  return Math.max(0, subscription.listingsLimit - subscription.activeListingsCount);
}

/**
 * Get subscription display name
 */
export function getSubscriptionDisplayName(plan: SubscriptionPlan): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'pro_monthly':
      return 'Pro Monthly';
    case 'pro_yearly':
      return 'Pro Yearly';
    case 'enterprise_yearly':
      return 'Enterprise';
    default:
      return 'Unknown';
  }
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'agency_owner':
      return 'Agency Owner';
    case 'agency_agent':
      return 'Agency Agent';
    case 'buyer':
      return 'Buyer';
    default:
      return 'Unknown';
  }
}

// ============================================================================
// COUPON REFRESH HELPERS
// ============================================================================

/**
 * Check if promotion coupons need refresh (monthly reset)
 */
export function needsCouponRefresh(coupons: PromotionCoupons | undefined): boolean {
  if (!coupons || !coupons.lastRefresh) return true;

  const lastRefresh = new Date(coupons.lastRefresh);
  const now = new Date();

  // Refresh if we're in a new month
  return (
    lastRefresh.getMonth() !== now.getMonth() ||
    lastRefresh.getFullYear() !== now.getFullYear()
  );
}

/**
 * Get refreshed promotion coupons (for monthly reset)
 */
export function getRefreshedCoupons(
  currentCoupons: PromotionCoupons,
  plan: SubscriptionPlan
): PromotionCoupons {
  const config = PROMOTION_CONFIGS[plan];

  return {
    monthly: config.monthly,
    available: config.monthly,
    used: 0,
    featured: config.featured,
    highlighted: config.highlighted,
    premium: config.premium,
    featuredDuration: config.featuredDuration,
    highlightedDuration: config.highlightedDuration,
    premiumDuration: config.premiumDuration,
    lastRefresh: new Date().toISOString(),
  };
}

// ============================================================================
// UPGRADE PATH HELPERS
// ============================================================================

/**
 * Get upgrade options for current subscription
 */
export function getUpgradeOptions(
  currentTier: SubscriptionTier
): { plan: SubscriptionPlan; price: number; benefits: string[] }[] {
  const options: { plan: SubscriptionPlan; price: number; benefits: string[] }[] = [];

  if (currentTier === 'free') {
    options.push({
      plan: 'pro_monthly',
      price: SUBSCRIPTION_PRICING.pro_monthly,
      benefits: [
        '20 active listings per month (vs 3)',
        '3 promotion coupons per month (2 highlighted + 1 premium)',
        '20 insights per month',
        'Unlimited AI chat & saved searches',
        'Unlimited auto-generate image descriptions',
      ],
    });
    options.push({
      plan: 'pro_yearly',
      price: SUBSCRIPTION_PRICING.pro_yearly,
      benefits: [
        '250 active listings per year (vs 3)',
        '3 promotion coupons per month (2 highlighted + 1 premium)',
        '14-day promotions (vs 7-day)',
        '20 insights per month',
        'Unlimited AI chat & saved searches',
        'Save over 30% vs monthly',
      ],
    });
  }

  if (currentTier === 'pro') {
    options.push({
      plan: 'enterprise_yearly',
      price: SUBSCRIPTION_PRICING.enterprise_yearly,
      benefits: [
        'Create and manage your agency',
        '500 listings for your agency',
        '5 team members included',
        '5 promotion coupons per month (2 premier + 2 highlighted + 1 featured)',
        'Unlimited insights for all agents',
        'Priority support & dedicated account manager',
      ],
    });
  }

  return options;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate subscription data integrity
 */
export function validateSubscription(subscription: UserSubscription): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!subscription.tier) errors.push('Missing tier');
  if (!subscription.status) errors.push('Missing status');
  if (!subscription.plan) errors.push('Missing plan');
  if (typeof subscription.listingsLimit !== 'number') errors.push('Invalid listings limit');
  if (typeof subscription.activeListingsCount !== 'number') errors.push('Invalid active listings count');

  // Check consistency
  if (subscription.activeListingsCount > subscription.listingsLimit) {
    errors.push('Active listings exceed limit');
  }

  if (subscription.privateSellerCount + subscription.agentCount !== subscription.activeListingsCount) {
    errors.push('Listing counts do not match total');
  }

  // Check tier-specific rules
  if (subscription.tier === 'agency_agent' && !subscription.agencyId) {
    errors.push('Agency agent must have agency ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
