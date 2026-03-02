/**
 * Centralized subscription tier constants
 * All subscription limits and configurations should be defined here
 * to maintain consistency across the codebase.
 */

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

// Billing periods
export const BILLING_PERIODS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

export type BillingPeriod = typeof BILLING_PERIODS[keyof typeof BILLING_PERIODS];

// Free tier limits
export const FREE_TIER_LIMITS: {
  LISTINGS: number;
  SAVED_SEARCHES: number;
  AI_MESSAGES: number;
  AI_INSIGHTS: number;
  IMAGE_DESCRIPTIONS: number;
  PROMOTION_COUPONS: number;
  PREMIUM_COUPONS: number;
  HIGHLIGHTED_COUPONS: number;
  FEATURED_COUPONS: number;
  AGENT_COUPONS: number;
} = {
  LISTINGS: 3,
  SAVED_SEARCHES: 3,
  AI_MESSAGES: 3,
  AI_INSIGHTS: 3,
  IMAGE_DESCRIPTIONS: 0,
  PROMOTION_COUPONS: 0,
  PREMIUM_COUPONS: 0,
  HIGHLIGHTED_COUPONS: 0,
  FEATURED_COUPONS: 0,
  AGENT_COUPONS: 0,
};

// Pro tier limits
export const PRO_TIER_LIMITS: {
  MONTHLY: {
    LISTINGS: number;
    PROMOTION_COUPONS: number;
    PREMIUM_COUPONS: number;
    HIGHLIGHTED_COUPONS: number;
    AI_INSIGHTS: number;
    SAVED_SEARCHES: number;
    AI_MESSAGES: number;
    IMAGE_DESCRIPTIONS: number;
  };
  YEARLY: {
    LISTINGS: number;
    PROMOTION_COUPONS: number;
    PREMIUM_COUPONS: number;
    HIGHLIGHTED_COUPONS: number;
    AI_INSIGHTS: number;
    SAVED_SEARCHES: number;
    AI_MESSAGES: number;
    IMAGE_DESCRIPTIONS: number;
  };
} = {
  MONTHLY: {
    LISTINGS: 20,
    PROMOTION_COUPONS: 3, // 2 highlighted + 1 premium
    PREMIUM_COUPONS: 1,
    HIGHLIGHTED_COUPONS: 2,
    AI_INSIGHTS: 20,
    SAVED_SEARCHES: -1, // unlimited
    AI_MESSAGES: -1, // unlimited (rate limited)
    IMAGE_DESCRIPTIONS: -1, // unlimited
  },
  YEARLY: {
    LISTINGS: 250,
    PROMOTION_COUPONS: 3, // per month
    PREMIUM_COUPONS: 1,
    HIGHLIGHTED_COUPONS: 2,
    AI_INSIGHTS: 20, // per month
    SAVED_SEARCHES: -1, // unlimited
    AI_MESSAGES: -1, // unlimited
    IMAGE_DESCRIPTIONS: -1, // unlimited
  },
};

// Enterprise tier limits
export const ENTERPRISE_TIER_LIMITS: {
  LISTINGS: number;
  TEAM_MEMBERS: number;
  PROMOTION_COUPONS: number;
  PREMIUM_COUPONS: number;
  HIGHLIGHTED_COUPONS: number;
  FEATURED_COUPONS: number;
  AI_INSIGHTS: number;
  SAVED_SEARCHES: number;
  AI_MESSAGES: number;
  IMAGE_DESCRIPTIONS: number;
} = {
  LISTINGS: 750,
  TEAM_MEMBERS: 5,
  PROMOTION_COUPONS: 5,
  PREMIUM_COUPONS: 1,
  HIGHLIGHTED_COUPONS: 2,
  FEATURED_COUPONS: 2,
  AI_INSIGHTS: -1, // unlimited
  SAVED_SEARCHES: -1, // unlimited
  AI_MESSAGES: -1, // unlimited
  IMAGE_DESCRIPTIONS: -1, // unlimited
};

// Trial limits (for agents on trial)
export const TRIAL_LIMITS: {
  LISTINGS: number;
  DURATION_DAYS: number;
} = {
  LISTINGS: 10,
  DURATION_DAYS: 7,
};

// Agency tier limits
export const AGENCY_TIER_LIMITS = {
  YEARLY: {
    LISTINGS: 750,
    AGENT_COUPONS: 5, // Monthly agent coupons
    PROMOTION_COUPONS: 5,
    PREMIUM_COUPONS: 1,
    HIGHLIGHTED_COUPONS: 2,
    FEATURED_COUPONS: 2,
    TEAM_MEMBERS: 5,
  },
  YEARLY_LARGE: {
    LISTINGS: 1000,
    AGENT_COUPONS: 10,
    PROMOTION_COUPONS: 10,
    PREMIUM_COUPONS: 5,
    HIGHLIGHTED_COUPONS: 5,
    FEATURED_COUPONS: 5,
    TEAM_MEMBERS: 10,
  },
};

// Pro buyer limits
export const PRO_BUYER_LIMITS = {
  LISTINGS: 0, // Buyers don't create listings
  SAVED_SEARCHES: -1, // unlimited
  AI_MESSAGES: -1, // unlimited
  AI_INSIGHTS: 50, // per month
};

// Pricing (in EUR)
export const PRICING = {
  FREE: 0,
  PRO_MONTHLY: 25,
  PRO_YEARLY: 200,
  ENTERPRISE: 1000,
  AGENCY_YEARLY: 1000,
  AGENCY_YEARLY_LARGE: 2000,
  PRO_BUYER_MONTHLY: 10,
  PRO_BUYER_YEARLY: 100,
};

// Duration in days
export const DURATION_DAYS = {
  MONTHLY: 30,
  YEARLY: 365,
  GRACE_PERIOD: 3,
};

// Helper function to get listing limit by tier and billing period
export function getListingsLimit(tier: SubscriptionTier, billingPeriod?: BillingPeriod): number {
  switch (tier) {
    case SUBSCRIPTION_TIERS.FREE:
      return FREE_TIER_LIMITS.LISTINGS;
    case SUBSCRIPTION_TIERS.PRO:
      return billingPeriod === BILLING_PERIODS.YEARLY
        ? PRO_TIER_LIMITS.YEARLY.LISTINGS
        : PRO_TIER_LIMITS.MONTHLY.LISTINGS;
    case SUBSCRIPTION_TIERS.ENTERPRISE:
      return ENTERPRISE_TIER_LIMITS.LISTINGS;
    default:
      return FREE_TIER_LIMITS.LISTINGS;
  }
}

// Helper function to get default limit for a tier
export function getDefaultTierLimits(tier: SubscriptionTier) {
  switch (tier) {
    case SUBSCRIPTION_TIERS.FREE:
      return {
        listingsLimit: FREE_TIER_LIMITS.LISTINGS,
        savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
        aiMessagesLimit: FREE_TIER_LIMITS.AI_MESSAGES,
        aiInsightsLimit: FREE_TIER_LIMITS.AI_INSIGHTS,
        promotionCoupons: FREE_TIER_LIMITS.PROMOTION_COUPONS,
      };
    case SUBSCRIPTION_TIERS.PRO:
      return {
        listingsLimit: PRO_TIER_LIMITS.YEARLY.LISTINGS,
        savedSearchesLimit: PRO_TIER_LIMITS.YEARLY.SAVED_SEARCHES,
        aiMessagesLimit: PRO_TIER_LIMITS.YEARLY.AI_MESSAGES,
        aiInsightsLimit: PRO_TIER_LIMITS.YEARLY.AI_INSIGHTS,
        promotionCoupons: PRO_TIER_LIMITS.YEARLY.PROMOTION_COUPONS,
      };
    case SUBSCRIPTION_TIERS.ENTERPRISE:
      return {
        listingsLimit: ENTERPRISE_TIER_LIMITS.LISTINGS,
        savedSearchesLimit: ENTERPRISE_TIER_LIMITS.SAVED_SEARCHES,
        aiMessagesLimit: ENTERPRISE_TIER_LIMITS.AI_MESSAGES,
        aiInsightsLimit: ENTERPRISE_TIER_LIMITS.AI_INSIGHTS,
        promotionCoupons: ENTERPRISE_TIER_LIMITS.PROMOTION_COUPONS,
      };
    default:
      return {
        listingsLimit: FREE_TIER_LIMITS.LISTINGS,
        savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
        aiMessagesLimit: FREE_TIER_LIMITS.AI_MESSAGES,
        aiInsightsLimit: FREE_TIER_LIMITS.AI_INSIGHTS,
        promotionCoupons: FREE_TIER_LIMITS.PROMOTION_COUPONS,
      };
  }
}
