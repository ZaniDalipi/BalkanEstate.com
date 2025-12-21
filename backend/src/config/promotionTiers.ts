/**
 * Promotion Tier Definitions
 * Inspired by industry leaders: Zillow, Realestate.com.au, Rightmove
 *
 * This configuration defines all available promotion tiers for property listings.
 * Each tier offers different levels of visibility and engagement features.
 */

export type PromotionTierType = 'standard' | 'featured' | 'highlight' | 'premium' | 'urgent';
export type PromotionDuration = 7 | 15 | 30 | 60 | 90;

export interface PromotionTierFeature {
  name: string;
  description: string;
  included: boolean;
}

export interface PromotionTier {
  id: PromotionTierType;
  name: string;
  tagline: string;
  description: string;
  detailedDescription: string;
  features: PromotionTierFeature[];
  displayMultiplier: number; // Size multiplier in search results (1 = standard)
  searchPriority: number; // Higher = appears first (0-100)
  badgeColor: string;
  badgeIcon: string;
  showImageCarousel: boolean;
  maxImages: number; // Number of images shown in listings
  autoRefreshDays?: number; // Auto-refresh to top every X days
  homepageFeatured: boolean;
  socialMediaPromotion: boolean;
  emailNewsletterInclusion: boolean;
  prioritySupport: boolean;
  highlightBorder: boolean;
  rotationDisplay: boolean; // For premium rotating display
  stats: {
    avgViewIncrease: string;
    avgInquiryIncrease: string;
    avgSalePriceIncrease?: string;
  };
}

export interface PromotionPricing {
  tierId: PromotionTierType;
  duration: PromotionDuration;
  price: number; // Price in EUR
  currency: string;
  discount?: number; // Percentage discount for longer durations
  popular?: boolean; // Mark as "most popular" option
}

export interface UrgentModifier {
  id: 'urgent';
  name: string;
  description: string;
  price: number; // Flat fee to add urgent badge
  badgeColor: string;
  canCombineWith: PromotionTierType[];
}

/**
 * Promotion Tier Definitions
 */
export const PROMOTION_TIERS: Record<PromotionTierType, PromotionTier> = {
  standard: {
    id: 'standard',
    name: 'Standard Listing',
    tagline: 'Basic visibility for your property',
    description: 'Free listing with basic features',
    detailedDescription: 'Your property will be listed with standard visibility in search results. Perfect for properties in high-demand areas or when you\'re not in a rush to sell.',
    features: [
      { name: 'Listed in search results', description: 'Appears in all relevant searches', included: true },
      { name: 'Property detail page', description: 'Full property information page', included: true },
      { name: 'Contact form', description: 'Buyers can reach out directly', included: true },
      { name: 'Map location', description: 'Show property on map', included: true },
      { name: 'Mobile app visibility', description: 'Visible on iOS and Android apps', included: true },
      { name: 'Priority placement', description: 'Enhanced visibility in results', included: false },
      { name: 'Homepage featuring', description: 'Featured on main homepage', included: false },
      { name: 'Image carousel', description: 'Multiple images in search results', included: false },
    ],
    displayMultiplier: 1.0,
    searchPriority: 10,
    badgeColor: '#6B7280',
    badgeIcon: '🏠',
    showImageCarousel: false,
    maxImages: 1,
    homepageFeatured: false,
    socialMediaPromotion: false,
    emailNewsletterInclusion: false,
    prioritySupport: false,
    highlightBorder: false,
    rotationDisplay: false,
    stats: {
      avgViewIncrease: '0%',
      avgInquiryIncrease: '0%',
    },
  },

  featured: {
    id: 'featured',
    name: 'Featured Listing',
    tagline: 'Stand out with enhanced visibility',
    description: 'Get 2x more views with featured placement and image carousel',
    detailedDescription: 'Featured listings appear above standard listings and are twice as large, displaying 3 beautiful property images in an eye-catching carousel. Your property will stand out in search results and attract significantly more buyer attention. Perfect for competitive markets.',
    features: [
      { name: 'Everything in Standard', description: 'All basic features included', included: true },
      { name: '2x larger display', description: 'Double-sized listing card', included: true },
      { name: '3-image carousel', description: 'Showcase your best property photos', included: true },
      { name: '"Featured" badge', description: 'Eye-catching badge on listing', included: true },
      { name: 'Priority in search results', description: 'Appears above standard listings', included: true },
      { name: 'Mobile app priority', description: 'Enhanced mobile visibility', included: true },
      { name: 'Weekly performance report', description: 'Track views and engagement', included: true },
      { name: 'Homepage featuring', description: 'Featured on main homepage', included: false },
      { name: 'Social media promotion', description: 'Promoted on our social channels', included: false },
    ],
    displayMultiplier: 2.0,
    searchPriority: 40,
    badgeColor: '#3B82F6',
    badgeIcon: '⭐',
    showImageCarousel: true,
    maxImages: 3,
    homepageFeatured: false,
    socialMediaPromotion: false,
    emailNewsletterInclusion: false,
    prioritySupport: false,
    highlightBorder: false,
    rotationDisplay: false,
    stats: {
      avgViewIncrease: '+120%',
      avgInquiryIncrease: '+85%',
    },
  },

  highlight: {
    id: 'highlight',
    name: 'Highlight Listing',
    tagline: 'Maximum visibility with distinctive highlighting',
    description: 'Get 3x more views with premium highlighting and auto-refresh',
    detailedDescription: 'Highlight listings dominate search results with a distinctive colored border and background, making them impossible to miss. Your listing features 3 stunning property images, appears above both standard and featured listings, and automatically refreshes to the top every 3 days. Research shows highlighted properties receive 230% more views and 170% more inquiries. Ideal for premium properties or competitive markets.',
    features: [
      { name: 'Everything in Featured', description: 'All featured benefits included', included: true },
      { name: 'Distinctive highlight border', description: 'Eye-catching colored border', included: true },
      { name: 'Colored background', description: 'Stand out with subtle background', included: true },
      { name: '3-image carousel', description: 'Premium photo showcase', included: true },
      { name: '"Highlight" badge', description: 'Premium highlight badge', included: true },
      { name: 'Priority over Featured', description: 'Appears above featured listings', included: true },
      { name: 'Auto-refresh every 3 days', description: 'Automatically bumped to top', included: true },
      { name: 'Homepage sidebar feature', description: 'Featured in homepage sidebar', included: true },
      { name: 'Daily performance report', description: 'Detailed analytics dashboard', included: true },
      { name: 'Priority customer support', description: 'Fast-track support access', included: false },
    ],
    displayMultiplier: 2.5,
    searchPriority: 70,
    badgeColor: '#F59E0B',
    badgeIcon: '💎',
    showImageCarousel: true,
    maxImages: 3,
    autoRefreshDays: 3,
    homepageFeatured: true,
    socialMediaPromotion: false,
    emailNewsletterInclusion: false,
    prioritySupport: false,
    highlightBorder: true,
    rotationDisplay: false,
    stats: {
      avgViewIncrease: '+230%',
      avgInquiryIncrease: '+170%',
      avgSalePriceIncrease: '+2%',
    },
  },

  premium: {
    id: 'premium',
    name: 'Premium Premiere',
    tagline: 'Ultimate exposure - Top of search, always',
    description: 'The ultimate promotion package with guaranteed top placement',
    detailedDescription: 'Premium Premiere is our highest level of exposure, giving your property unmatched visibility. Your listing is displayed at the very top of all search results in a giant, unmissable format with rotating banner display. It\'s featured prominently on our homepage, promoted across our social media channels to thousands of followers, and included in our email newsletter sent to over 50,000 active buyers. You\'ll also receive priority customer support and comprehensive marketing materials. Limited availability to maintain exclusivity (maximum 10% of listings in your area). Based on industry data, Premium listings achieve 350% more views, 240% more inquiries, and sell for an average of 3-5% more.',
    features: [
      { name: 'Everything in Highlight', description: 'All highlight benefits included', included: true },
      { name: '3x largest display size', description: 'Giant, unmissable listing', included: true },
      { name: 'Always at top of search', description: 'Guaranteed top placement', included: true },
      { name: 'Rotating banner display', description: 'Premium rotating showcase', included: true },
      { name: '3-image premium carousel', description: 'High-quality image showcase', included: true },
      { name: '"Premium" badge', description: 'Exclusive premium badge', included: true },
      { name: 'Homepage hero section', description: 'Featured in main hero banner', included: true },
      { name: 'Social media promotion', description: 'Posted on Facebook, Instagram, Twitter', included: true },
      { name: 'Email newsletter feature', description: 'Sent to 50,000+ subscribers', included: true },
      { name: 'Priority customer support', description: 'Dedicated support agent', included: true },
      { name: 'Professional marketing materials', description: 'Custom social media graphics', included: true },
      { name: 'Real-time analytics dashboard', description: 'Comprehensive performance tracking', included: true },
    ],
    displayMultiplier: 3.0,
    searchPriority: 100,
    badgeColor: '#8B5CF6',
    badgeIcon: '👑',
    showImageCarousel: true,
    maxImages: 3,
    homepageFeatured: true,
    socialMediaPromotion: true,
    emailNewsletterInclusion: true,
    prioritySupport: true,
    highlightBorder: true,
    rotationDisplay: true,
    stats: {
      avgViewIncrease: '+350%',
      avgInquiryIncrease: '+240%',
      avgSalePriceIncrease: '+3-5%',
    },
  },

  urgent: {
    id: 'urgent',
    name: 'Urgent',
    tagline: 'Signal urgency to motivated buyers',
    description: 'Add an urgent badge to create immediate action',
    detailedDescription: 'The Urgent modifier adds a prominent red "URGENT" badge to your listing, signaling to buyers that immediate action is needed. This psychological trigger significantly increases engagement rates and attracts serious, motivated buyers. Can be combined with any promotion tier for maximum impact.',
    features: [
      { name: 'Urgent badge', description: 'Prominent red urgent indicator', included: true },
      { name: 'Increased click-through rate', description: 'Urgency drives action', included: true },
      { name: 'Attracts motivated buyers', description: 'Serious buyers respond to urgency', included: true },
      { name: 'Combines with any tier', description: 'Add to Featured, Highlight, or Premium', included: true },
    ],
    displayMultiplier: 1.0,
    searchPriority: 5, // Adds +5 to base tier priority
    badgeColor: '#EF4444',
    badgeIcon: '🔥',
    showImageCarousel: false,
    maxImages: 1,
    homepageFeatured: false,
    socialMediaPromotion: false,
    emailNewsletterInclusion: false,
    prioritySupport: false,
    highlightBorder: false,
    rotationDisplay: false,
    stats: {
      avgViewIncrease: '+25%',
      avgInquiryIncrease: '+35%',
    },
  },
};

/**
 * Promotion Pricing Table
 */
export const PROMOTION_PRICING: PromotionPricing[] = [
  // Standard (Free)
  { tierId: 'standard', duration: 30, price: 0, currency: 'EUR' },
  { tierId: 'standard', duration: 60, price: 0, currency: 'EUR' },
  { tierId: 'standard', duration: 90, price: 0, currency: 'EUR' },

  // Featured
  { tierId: 'featured', duration: 7, price: 1.99, currency: 'EUR' },
  { tierId: 'featured', duration: 15, price: 3.49, currency: 'EUR', discount: 12, popular: true },
  { tierId: 'featured', duration: 30, price: 5.99, currency: 'EUR', discount: 25 },
  { tierId: 'featured', duration: 60, price: 9.99, currency: 'EUR', discount: 38 },
  { tierId: 'featured', duration: 90, price: 13.99, currency: 'EUR', discount: 45 },

  // Highlight
  { tierId: 'highlight', duration: 7, price: 3.99, currency: 'EUR' },
  { tierId: 'highlight', duration: 15, price: 6.99, currency: 'EUR', discount: 12, popular: true },
  { tierId: 'highlight', duration: 30, price: 11.99, currency: 'EUR', discount: 25 },
  { tierId: 'highlight', duration: 60, price: 19.99, currency: 'EUR', discount: 38 },
  { tierId: 'highlight', duration: 90, price: 27.99, currency: 'EUR', discount: 45 },

  // Premium
  { tierId: 'premium', duration: 7, price: 7.99, currency: 'EUR' },
  { tierId: 'premium', duration: 15, price: 13.99, currency: 'EUR', discount: 12, popular: true },
  { tierId: 'premium', duration: 30, price: 23.99, currency: 'EUR', discount: 25 },
  { tierId: 'premium', duration: 60, price: 39.99, currency: 'EUR', discount: 38 },
  { tierId: 'premium', duration: 90, price: 55.99, currency: 'EUR', discount: 45 },
];

/**
 * Urgent Modifier Configuration
 */
export const URGENT_MODIFIER: UrgentModifier = {
  id: 'urgent',
  name: 'Urgent',
  description: 'Add a prominent "URGENT" badge to signal time sensitivity and attract motivated buyers',
  price: 0.99,
  badgeColor: '#EF4444',
  canCombineWith: ['standard', 'featured', 'highlight', 'premium'],
};

/**
 * Agency Plan Allocation
 * Number of free promoted listings per month based on agency subscription tier
 */
export interface AgencyPlanAllocation {
  planId: string;
  planName: string;
  monthlyFeaturedAds: number;
  monthlyHighlightAds: number;
  monthlyPremiumAds: number;
  discountPercentage: number;
}

export const AGENCY_PLAN_ALLOCATIONS: AgencyPlanAllocation[] = [
  {
    planId: 'free',
    planName: 'Free',
    monthlyFeaturedAds: 0,
    monthlyHighlightAds: 0,
    monthlyPremiumAds: 0,
    discountPercentage: 0,
  },
  {
    planId: 'pro_monthly',
    planName: 'Pro Monthly',
    monthlyFeaturedAds: 2,
    monthlyHighlightAds: 0,
    monthlyPremiumAds: 0,
    discountPercentage: 10,
  },
  {
    planId: 'pro_yearly',
    planName: 'Pro Yearly',
    monthlyFeaturedAds: 3,
    monthlyHighlightAds: 1,
    monthlyPremiumAds: 0,
    discountPercentage: 15,
  },
  {
    planId: 'enterprise',
    planName: 'Enterprise',
    monthlyFeaturedAds: 5,
    monthlyHighlightAds: 3,
    monthlyPremiumAds: 1,
    discountPercentage: 20,
  },
];

/**
 * Helper Functions
 */

export const getPromotionPrice = (
  tierId: PromotionTierType,
  duration: PromotionDuration,
  addUrgent: boolean = false
): number => {
  const pricing = PROMOTION_PRICING.find(p => p.tierId === tierId && p.duration === duration);
  const basePrice = pricing?.price || 0;
  const urgentPrice = addUrgent ? URGENT_MODIFIER.price : 0;
  return basePrice + urgentPrice;
};

export const getPromotionDiscount = (
  tierId: PromotionTierType,
  duration: PromotionDuration
): number => {
  const pricing = PROMOTION_PRICING.find(p => p.tierId === tierId && p.duration === duration);
  return pricing?.discount || 0;
};

export const isPopularOption = (
  tierId: PromotionTierType,
  duration: PromotionDuration
): boolean => {
  const pricing = PROMOTION_PRICING.find(p => p.tierId === tierId && p.duration === duration);
  return pricing?.popular || false;
};

export const getAgencyAllocation = (planId: string): AgencyPlanAllocation | undefined => {
  return AGENCY_PLAN_ALLOCATIONS.find(a => a.planId === planId);
};

export const calculateDiscountedPrice = (
  basePrice: number,
  discountPercentage: number
): number => {
  return basePrice * (1 - discountPercentage / 100);
};
