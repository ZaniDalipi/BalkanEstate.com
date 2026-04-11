import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SeedProducts');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

log.info(`🌍 Environment: ${env.toUpperCase()}`);

// Export PRODUCTS so it can be imported for automatic syncing
export const PRODUCTS = [
  // ============================================================================
  // FREE TIER - Basic access with limited AI features
  // ============================================================================
  {
    productId: 'free_tier',
    name: 'Free',
    description: 'Get started with basic listing features and limited AI tools.',
    type: 'subscription' as const,
    tier: 'free' as const,
    price: 0,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '3 active listings',
      '3 saved searches',
      '3 AI chat messages',
      '3 generate insights',
      'Basic property details',
      'Photo gallery (up to 10 images)',
    ],
    targetRole: 'seller' as const,
    displayOrder: 1,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    // Limits
    listingsLimit: 3,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 3,
    aiMessagesLimit: 3,
    aiInsightsLimit: 3,
    imageDescriptionLimit: 0, // No auto image descriptions for free
  },

  // ============================================================================
  // PRO MONTHLY - Professional tools with AI features
  // ============================================================================
  {
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional selling tools with AI-powered features and monthly flexibility.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '20 listings per month',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 2,
    badge: 'BEST VALUE',
    badgeColor: 'green',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-500',
      textColor: 'text-gray-900',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 20, // 20 listings per month
    promotionCoupons: 3, // 2 highlighted + 1 premium
    premiumCoupons: 1, // 1 premium placement
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: 20, // 20 insights per month
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // PRO YEARLY - Best value with annual commitment
  // ============================================================================
  {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - 250 listings per year!',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '250 listings per year',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'All Pro Monthly features',
      'Save vs monthly billing',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'MOST POPULAR',
    badgeColor: 'amber',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-500',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 250, // 250 listings per year
    promotionCoupons: 3, // 2 highlighted + 1 premium per month
    premiumCoupons: 1, // 1 premium placement
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: 20, // 20 insights per month
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // SELLER PRO TIER - Aliases for backward compatibility (same as pro_monthly/pro_yearly)
  // ============================================================================
  {
    productId: 'seller_pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional selling tools with monthly flexibility. Great for active sellers.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '20 listings per month',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 2,
    badge: 'BEST VALUE',
    badgeColor: 'green',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-500',
      textColor: 'text-gray-900',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 20,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: 20,
    imageDescriptionLimit: -1,
  },
  {
    productId: 'seller_pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - 250 listings per year!',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '250 listings per year',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'All Pro Monthly features',
      'Save vs monthly billing',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'MOST POPULAR',
    badgeColor: 'amber',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-500',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 250,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: -1,
    imageDescriptionLimit: -1,
  },
  {
    productId: 'seller_enterprise_yearly',
    name: 'Enterprise',
    description: 'Complete agency solution - 750 listings, 5 team members, and shared promotion pool.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '750 listings (expandable)',
      '5 team members included',
      'Agency branding page',
      '5 promotion coupons/month (2 premier + 2 highlighted + 1 featured)',
      'Agent registration codes',
      'Unlimited saved searches',
      'Unlimited AI usage (no spam)',
      'Unlimited generate insights for all agents',
      'Dedicated account manager',
      'Team dashboard & analytics',
    ],
    targetRole: 'seller' as const, // Show in "For Sellers" tab
    displayOrder: 4,
    badge: 'BEST FOR TEAMS',
    badgeColor: 'purple',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-slate-900 to-gray-800',
      borderColor: 'border-amber-400',
      textColor: 'text-white',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 7,
    listingsLimit: 500,
    promotionCoupons: 5, // 2 premier + 2 highlighted + 1 featured
    premiumCoupons: 2, // 2 premium premier
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 1, // 1 featured
    agentCoupons: 5,
    teamMembersLimit: 5, // 5 agents via coupons (owner is +1 on top)
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: -1, // unlimited
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // ENTERPRISE TIER - For real estate agencies (€1000/year)
  // ============================================================================
  {
    productId: 'agency_yearly',
    name: 'Enterprise',
    description: 'Complete agency solution - 750 listings, 5 team members, and shared promotion pool.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '750 listings (expandable)',
      '5 team members included',
      'Agency branding page',
      '5 promotion coupons/month (2 premier + 2 highlighted + 1 featured)',
      'Agent registration codes',
      'Unlimited saved searches',
      'Unlimited AI usage (no spam)',
      'Unlimited generate insights for all agents',
      'Dedicated account manager',
      'Team dashboard & analytics',
    ],
    targetRole: 'seller' as const, // Show in "For Sellers" tab
    displayOrder: 4,
    badge: 'BEST FOR TEAMS',
    badgeColor: 'red',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-slate-900 to-gray-800',
      borderColor: 'border-amber-400',
      textColor: 'text-white',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 7,
    listingsLimit: 1000, // 1000 listings for enterprise
    promotionCoupons: 5, // 2 premier + 2 highlighted + 1 featured
    premiumCoupons: 2, // 2 premium premier
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 1, // 1 featured
    agentCoupons: 5, // 5 team member registration codes
    teamMembersLimit: 5, // 5 agents via coupons (owner is +1 on top)
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: -1, // unlimited for all agents
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // AGENCY AGENT PLAN - Granted via agent registration code (not purchasable)
  // ============================================================================
  {
    productId: 'agency_agent_yearly',
    name: 'Agency Pro',
    description: 'Agency team member plan — included with agent registration code. Not available for direct purchase.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 0,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '{listingsLimit} active listings per month',
      'Unlimited saved searches',
      'Unlimited AI chat',
      'Unlimited generate insights',
      'Full analytics',
      'Agency team support',
    ],
    targetRole: 'agent' as const,
    displayOrder: 9,
    badge: 'Agency Member',
    badgeColor: 'green',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-emerald-500 to-teal-600',
      textColor: 'text-white',
    },
    isActive: true,
    isVisible: false, // Not shown in pricing page — only granted via coupon
    hasFreeTrial: false,
    gracePeriodDays: 7,
    // Limits — admin can update these via admin panel
    listingsLimit: 30, // 30 active listings per month for agency agents
    promotionCoupons: 0, // Shared with agency pool, not individual
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    teamMembersLimit: 1,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: -1, // unlimited
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // FEATURED AGENCY - Visibility boosts for agencies (duration-based)
  // ============================================================================
  {
    productId: 'featured_agency_7days',
    name: 'Featured Agency - 1 Week',
    description: 'Boost your agency visibility for 1 week.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 6.99,
    currency: 'EUR',
    billingPeriod: 'weekly' as const,
    durationDays: 7,
    features: [
      'Featured in agency directory',
      'Priority in search results',
      'Homepage agency carousel',
      'Featured badge on profile',
    ],
    targetRole: 'agent' as const,
    displayOrder: 10,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_agency_14days',
    name: 'Featured Agency - 2 Weeks',
    description: 'Boost your agency visibility for 2 weeks.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 11.99,
    currency: 'EUR',
    billingPeriod: 'weekly' as const,
    durationDays: 14,
    features: [
      'Featured in agency directory',
      'Priority in search results',
      'Homepage agency carousel',
      'Featured badge on profile',
      'Save 14% vs 1 week',
    ],
    targetRole: 'agent' as const,
    displayOrder: 11,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_agency_28days',
    name: 'Featured Agency - 4 Weeks',
    description: 'Best value for monthly visibility boost.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 24.99,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 28,
    features: [
      'Featured in agency directory',
      'Priority in search results',
      'Homepage agency carousel',
      'Featured badge on profile',
      'Save 11% vs 2 weeks',
    ],
    targetRole: 'agent' as const,
    displayOrder: 12,
    badge: 'POPULAR',
    badgeColor: 'green',
    highlighted: true,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_agency_90days',
    name: 'Featured Agency - 90 Days',
    description: 'Maximum savings for long-term visibility.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 49.99,
    currency: 'EUR',
    billingPeriod: 'quarterly' as const,
    durationDays: 90,
    features: [
      'Featured in agency directory',
      'Priority in search results',
      'Homepage agency carousel',
      'Featured badge on profile',
      'Save 44% vs 4 weeks',
      'Priority support',
    ],
    targetRole: 'agent' as const,
    displayOrder: 13,
    badge: 'BEST VALUE',
    badgeColor: 'amber',
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },

  // ============================================================================
  // BUYER PRO - For property buyers (€3/month)
  // ============================================================================
  {
    productId: 'buyer_monthly',
    name: 'Buyer Pro',
    description: 'Never miss your dream property with instant alerts and market insights.',
    type: 'subscription' as const,
    tier: 'buyer' as const,
    price: 3,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      'Instant email & SMS notifications',
      'Unlimited saved searches',
      'Early access to new listings',
      'Advanced market insights',
      'Price drop notifications',
      'Investment calculator',
      'Mortgage pre-qualification',
      'Ad-free browsing',
    ],
    targetRole: 'buyer' as const,
    displayOrder: 5,
    badge: 'FOR BUYERS',
    badgeColor: 'blue',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-500',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: true,
    trialPeriodDays: 7,
    gracePeriodDays: 3,
    // Limits
    listingsLimit: 3, // Buyer Pro can post up to 3 listings
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 3,
    aiMessagesLimit: 50,
    aiInsightsLimit: 30,
    imageDescriptionLimit: 50,
  },

  // Alias for existing subscribers created before the buyer_monthly rename
  {
    productId: 'buyer_pro_monthly',
    name: 'Buyer Pro',
    description: 'Never miss your dream property with instant alerts and market insights.',
    type: 'subscription' as const,
    tier: 'buyer' as const,
    price: 3,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      'Instant email & SMS notifications',
      '3 saved searches',
      'Early access to new listings',
      'Advanced market insights',
      '30 AI insights/month',
      '50 auto-label images',
    ],
    targetRole: 'buyer' as const,
    displayOrder: 5,
    badge: 'FOR BUYERS',
    badgeColor: 'blue',
    highlighted: false,
    isActive: true,
    isVisible: false, // not shown in pricing — alias only
    hasFreeTrial: false,
    gracePeriodDays: 5,
    listingsLimit: 3,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 3,
    aiMessagesLimit: 50,
    aiInsightsLimit: 30,
    imageDescriptionLimit: 50,
  },

  // ============================================================================
  // ONE-TIME LISTING PROMOTIONS - Pay per highlight/premium/featured
  // ============================================================================

  // Highlighted Listing (yellow border, badge)
  {
    productId: 'highlight_7days',
    name: 'Highlight 7 Days',
    description: 'Make your listing stand out with a highlighted badge for 7 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 3.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 7,
    features: [
      'Yellow highlight border',
      'HIGHLIGHTED badge',
      'Stands out in search results',
      '7 days duration',
    ],
    targetRole: 'seller' as const,
    displayOrder: 20,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 1,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'highlight_14days',
    name: 'Highlight 14 Days',
    description: 'Make your listing stand out with a highlighted badge for 14 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 14.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 14,
    features: [
      'Yellow highlight border',
      'HIGHLIGHTED badge',
      'Stands out in search results',
      '14 days duration',
      'Save 17% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 21,
    badge: 'POPULAR',
    badgeColor: 'green',
    highlighted: true,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 1,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'highlight_30days',
    name: 'Highlight 30 Days',
    description: 'Make your listing stand out with a highlighted badge for 30 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 29.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 30,
    features: [
      'Yellow highlight border',
      'HIGHLIGHTED badge',
      'Stands out in search results',
      '30 days duration',
      'Save 33% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 22,
    badge: 'BEST VALUE',
    badgeColor: 'amber',
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 1,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },

  // Premium Listing (top of search results)
  {
    productId: 'premium_7days',
    name: 'Premium 7 Days',
    description: 'Get top placement in search results for 7 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 7.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 7,
    features: [
      'Top placement in search results',
      'PREMIUM badge',
      'Purple premium border',
      '7 days duration',
    ],
    targetRole: 'seller' as const,
    displayOrder: 23,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 1,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'premium_14days',
    name: 'Premium 14 Days',
    description: 'Get top placement in search results for 14 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 29.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 14,
    features: [
      'Top placement in search results',
      'PREMIUM badge',
      'Purple premium border',
      '14 days duration',
      'Save 20% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 24,
    badge: 'POPULAR',
    badgeColor: 'green',
    highlighted: true,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 1,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'premium_30days',
    name: 'Premium 30 Days',
    description: 'Get top placement in search results for 30 days.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 59.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 30,
    features: [
      'Top placement in search results',
      'PREMIUM badge',
      'Purple premium border',
      '30 days duration',
      'Save 40% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 25,
    badge: 'BEST VALUE',
    badgeColor: 'amber',
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 1,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },

  // Featured Listing (homepage carousel)
  {
    productId: 'featured_7days',
    name: 'Featured 7 Days',
    description: 'Get featured on the homepage carousel for maximum visibility.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 1.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 7,
    features: [
      'Homepage carousel placement',
      'FEATURED badge',
      'Gold featured border',
      'Maximum visibility',
      '7 days duration',
    ],
    targetRole: 'seller' as const,
    displayOrder: 26,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 1,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_14days',
    name: 'Featured 14 Days',
    description: 'Get featured on the homepage carousel for maximum visibility.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 7.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 14,
    features: [
      'Homepage carousel placement',
      'FEATURED badge',
      'Gold featured border',
      'Maximum visibility',
      '14 days duration',
      'Save 25% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 27,
    badge: 'POPULAR',
    badgeColor: 'green',
    highlighted: true,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 1,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_30days',
    name: 'Featured 30 Days',
    description: 'Get featured on the homepage carousel for maximum visibility.',
    type: 'one_time' as const,
    tier: 'addon' as const,
    price: 14.99,
    currency: 'EUR',
    billingPeriod: 'one_time' as const,
    durationDays: 30,
    features: [
      'Homepage carousel placement',
      'FEATURED badge',
      'Gold featured border',
      'Maximum visibility',
      '30 days duration',
      'Save 50% vs 7-day',
    ],
    targetRole: 'seller' as const,
    displayOrder: 28,
    badge: 'BEST VALUE',
    badgeColor: 'amber',
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 1,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Insert/update products
    for (const productData of PRODUCTS) {
      await Product.findOneAndUpdate(
        { productId: productData.productId },
        productData,
        { upsert: true, new: true }
      );
      log.info(`✅ Seeded product: ${productData.name} (${productData.productId}) - €${productData.price}/${productData.billingPeriod}`);
    }

    log.info('\n🎉 Successfully seeded all products!');
    log.info(`📊 Total products: ${PRODUCTS.length}`);
    log.info('\n💰 Pricing Summary:');
    log.info('   Free: €0 (3 listings, 3 saved searches, 3 AI messages, 3 insights)');
    log.info('   Pro Monthly: €25 (20 listings/mo, 3 promo coupons/mo, 20 insights/mo, unlimited AI & searches)');
    log.info('   Pro Yearly: €200 (250 listings/year, 3 promo coupons/mo, 20 insights/mo, unlimited AI & searches)');
    log.info('   Enterprise: €1000/year (750 listings, 5 team members, 5 promo coupons, unlimited everything)');
    log.info('   Agency Agent: €0 (granted via agent registration code, 30 listings/month, unlimited AI & searches)');
    log.info('   Buyer Pro: €3/month (unlimited searches, instant alerts, early access, market insights)');

  } catch (error) {
    log.error('❌ Error seeding products:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from MongoDB');
  }
}

// Only run the seed function if this script is executed directly (not imported as a module)
// This allows PRODUCTS to be imported for automatic syncing without triggering a connection attempt
if (require.main === module || process.argv[1]?.endsWith('seedProducts.ts')) {
  seedProducts();
}
