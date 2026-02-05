/**
 * Subscription Constants
 * Plan configurations and mappings for subscription management
 */

// Plan structure for UI
export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  periodMonths: number;
  features: string[];
  listingLimit: number;
  color: string;
  tier: number;
  badge?: string;
  badgeColor?: string;
  highlighted?: boolean;
  savedSearchesLimit?: number | 'unlimited';
  promotionCouponsMonthly?: number | 'shared';
  aiMessagesLimit?: number | 'unlimited';
  analyticsLevel?: 'basic' | 'advanced' | 'full';
  supportType?: 'email' | 'priority' | 'agency';
}

// Default free plan (not in products DB)
export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  price: 0,
  period: 'forever',
  periodMonths: 0,
  features: ['3 active listings', '3 saved searches', '3 AI messages', '3 generate insights', 'Basic property details'],
  listingLimit: 3,
  color: 'from-gray-400 to-gray-500',
  tier: 0,
  savedSearchesLimit: 3,
  promotionCouponsMonthly: 0,
  aiMessagesLimit: 3,
  analyticsLevel: 'basic',
  supportType: 'email',
};

// Agency agent plan (obtained via coupon redemption, not purchasable)
export const AGENCY_AGENT_PLAN: Plan = {
  id: 'agency_agent_yearly',
  name: 'Agency Pro',
  price: 0,
  period: 'year',
  periodMonths: 12,
  features: ['25 active listings', 'Unlimited saved searches', 'Unlimited AI chat', 'Full analytics', 'Agency team support'],
  listingLimit: 25,
  color: 'from-emerald-500 to-teal-600',
  tier: 2,
  badge: 'Agency Member',
  badgeColor: 'emerald',
  savedSearchesLimit: 'unlimited',
  promotionCouponsMonthly: 'shared',
  aiMessagesLimit: 'unlimited',
  analyticsLevel: 'full',
  supportType: 'agency',
};

// Map billing period to months
export const PERIOD_TO_MONTHS: Record<string, number> = {
  monthly: 1,
  yearly: 12,
  weekly: 0.25,
  quarterly: 3,
  one_time: 0,
};

// Map product IDs to listing limits
export const LISTING_LIMITS: Record<string, number> = {
  free: 3,
  seller_pro_monthly: 20,
  seller_pro_yearly: 250,
  seller_enterprise_yearly: 500,
  free_tier: 3,
  pro_monthly: 20,
  pro_yearly: 250,
  enterprise_yearly: 500,
  agency_yearly: 100,
  agency_agent_yearly: 25,
};

// Tier determination by product ID
export const PLAN_TIERS: Record<string, number> = {
  free: 0,
  free_tier: 0,
  seller_pro_monthly: 1,
  pro_monthly: 1,
  seller_pro_yearly: 1,
  pro_yearly: 1,
  seller_enterprise_yearly: 2,
  enterprise_yearly: 2,
  agency_yearly: 3,
  agency_agent_yearly: 2,
};

// Plan colors by product ID
export const PLAN_COLORS: Record<string, string> = {
  free: 'from-gray-400 to-gray-500',
  free_tier: 'from-gray-400 to-gray-500',
  seller_pro_monthly: 'from-blue-500 to-indigo-600',
  pro_monthly: 'from-blue-500 to-indigo-600',
  seller_pro_yearly: 'from-blue-600 to-purple-700',
  pro_yearly: 'from-blue-600 to-purple-700',
  seller_enterprise_yearly: 'from-purple-600 to-pink-600',
  enterprise_yearly: 'from-purple-600 to-pink-600',
  agency_yearly: 'from-teal-500 to-emerald-600',
  agency_agent_yearly: 'from-emerald-500 to-teal-600',
};

// Status colors for subscription badges
export const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  trial: 'bg-blue-100 text-blue-800',
  grace: 'bg-yellow-100 text-yellow-800',
  canceled: 'bg-gray-100 text-gray-800',
  pending_cancellation: 'bg-orange-100 text-orange-800',
};

// Format date helper
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Get status display label
export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending_cancellation': return 'CANCELLING';
    case 'canceled': return 'CANCELLED';
    case 'active': return 'ACTIVE';
    case 'expired': return 'EXPIRED';
    case 'trial': return 'TRIAL';
    case 'grace': return 'GRACE PERIOD';
    default: return status?.toUpperCase() || 'FREE';
  }
};

// Get status color class
export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
};
