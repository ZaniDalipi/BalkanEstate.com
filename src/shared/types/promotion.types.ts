// Promotion domain types

export type PromotionTierType = 'featured' | 'highlight' | 'premium';
export type PromotionDuration = 7 | 15 | 30 | 60 | 90;

export interface PromotionTier {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: string;
  color: string;
  highlight?: boolean;
}

export interface PromotionPricing {
  tierId: string;
  duration: number;
  price: number;
}

export interface UrgentModifier {
  id: string;
  name: string;
  description: string;
  price: number;
  badgeColor: string;
  canCombineWith: string[];
}

export interface AgencyPlanAllocation {
  planId: string;
  planName: string;
  monthlyFeaturedAds: number;
  monthlyHighlightAds: number;
  monthlyPremiumAds: number;
  discountPercentage: number;
}

export interface PromotionTiersResponse {
  tiers: Record<string, PromotionTier>;
  pricing: PromotionPricing[];
  urgentModifier: UrgentModifier;
  agencyAllocations: AgencyPlanAllocation[];
}

export interface PurchasePromotionParams {
  propertyId: string;
  promotionTier: PromotionTierType;
  duration: PromotionDuration;
  hasUrgentBadge?: boolean;
  useAgencyAllocation?: boolean;
  couponCode?: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  discount: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  message?: string;
}

export interface AgencyAllocation {
  plan: AgencyPlanAllocation;
  usage: {
    featured: number;
    highlight: number;
    premium: number;
  };
  remaining: {
    featured: number;
    highlight: number;
    premium: number;
  };
}

export interface PromotionCheckoutParams {
  propertyId: string;
  promotionTier: string;
  duration: number;
  hasUrgentBadge?: boolean;
  couponCode?: string;
}

export interface PromotionCheckoutResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  promotion?: any;
  isFree?: boolean;
  pricing?: {
    originalPrice: number;
    discount: number;
    finalPrice: number;
    currency: string;
  };
}

export interface PromotionHistoryItem {
  _id: string;
  tier: string;
  tierInfo: any;
  startDate: string;
  endDate: string;
  duration: number;
  hasUrgentBadge: boolean;
  price: number;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  paymentStatus: string;
  isFromAgencyAllocation: boolean;
  autoExtend: boolean;
  performance: {
    views: number;
    inquiries: number;
    saves: number;
  };
  createdAt: string;
}

export interface PromotionHistoryResponse {
  history: PromotionHistoryItem[];
  totals: {
    totalPromotions: number;
    totalSpent: number;
    totalDaysPromoted: number;
    totalViews: number;
    totalInquiries: number;
  };
  property: {
    id: string;
    title: string;
  };
}
