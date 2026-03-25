// Promotions API module
// Handles all promotion-related API calls

import { apiRequest } from '@/src/shared/api';
import type {
  PromotionTiersResponse,
  AgencyAllocation,
  PurchasePromotionParams,
  CouponValidationResult,
  PromotionCheckoutParams,
  PromotionCheckoutResponse,
  PromotionHistoryResponse,
} from '@/src/shared/types';

// --- Promotion API ---

export const getPromotionTiers = async (): Promise<PromotionTiersResponse> => {
  return apiRequest('/promotions/tiers');
};

export const getAgencyAllocation = async (): Promise<{
  allocation: AgencyAllocation;
  agency: any;
}> => {
  return apiRequest('/promotions/agency/allocation', { requiresAuth: true, encryptResponse: true });
};

export const purchasePromotion = async (params: PurchasePromotionParams): Promise<any> => {
  return apiRequest('/promotions', {
    method: 'POST',
    body: params,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const createPromotionCheckout = async (
  params: PromotionCheckoutParams
): Promise<PromotionCheckoutResponse> => {
  return apiRequest('/promotions/checkout', {
    method: 'POST',
    body: params,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const confirmPromotionPayment = async (
  sessionId: string
): Promise<{
  success: boolean;
  message: string;
  promotion?: any;
}> => {
  return apiRequest('/promotions/confirm-payment', {
    method: 'POST',
    body: { sessionId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const validateCoupon = async (
  couponCode: string,
  promotionTier: string,
  price: number
): Promise<CouponValidationResult> => {
  try {
    const response = await apiRequest<{
      valid: boolean;
      couponCode?: string;
      discount?: number;
      finalPrice?: number;
      discountType?: 'percentage' | 'fixed';
      discountValue?: number;
      message?: string;
      error?: string;
    }>('/coupons/validate', {
      method: 'POST',
      body: { couponCode, promotionTier, price },
      requiresAuth: true,
    });

    return {
      isValid: response.valid === true,
      discount: response.discount || 0,
      discountType: response.discountType || 'fixed',
      discountValue: response.discountValue || 0,
      message: response.valid
        ? `Coupon applied: ${couponCode.toUpperCase()}`
        : response.error || response.message || 'Invalid coupon',
    };
  } catch (error: any) {
    return {
      isValid: false,
      discount: 0,
      discountType: 'fixed',
      discountValue: 0,
      message: error.message || 'Failed to validate coupon',
    };
  }
};

export const getMyPromotions = async (): Promise<any> => {
  return apiRequest('/promotions', { requiresAuth: true, encryptResponse: true });
};

export const cancelPromotion = async (promotionId: string): Promise<any> => {
  return apiRequest(`/promotions/${promotionId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const extendPromotion = async (params: {
  promotionId?: string;
  propertyId?: string;
  duration: number;
  couponCode?: string;
}): Promise<{
  success: boolean;
  sessionId?: string;
  url?: string;
  provider?: 'braintree' | 'paypal' | 'web';
  newEndDate?: string;
  isFree?: boolean;
  pricing?: {
    originalPrice: number;
    discount: number;
    finalPrice: number;
    currency: string;
  };
}> => {
  const id = params.promotionId || params.propertyId;
  if (!id) throw new Error('Either promotionId or propertyId is required');

  return apiRequest(`/promotions/${id}/extend`, {
    method: 'POST',
    body: { duration: params.duration, couponCode: params.couponCode },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const confirmExtensionPayment = async (
  sessionId: string
): Promise<{
  success: boolean;
  message: string;
  promotion?: any;
  newEndDate?: string;
}> => {
  return apiRequest('/promotions/confirm-extension', {
    method: 'POST',
    body: { sessionId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const addUrgentBadge = async (
  promotionId: string
): Promise<{
  success: boolean;
  isFree?: boolean;
  url?: string;
  sessionId?: string;
  price?: number;
  message?: string;
  promotion?: any;
}> => {
  return apiRequest(`/promotions/${promotionId}/add-urgent`, {
    method: 'POST',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const confirmUrgentBadgePayment = async (
  sessionId: string
): Promise<{
  success: boolean;
  message: string;
  promotion?: any;
}> => {
  return apiRequest('/promotions/confirm-urgent', {
    method: 'POST',
    body: { sessionId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const getPromotionHistory = async (
  propertyId: string
): Promise<PromotionHistoryResponse> => {
  return apiRequest(`/promotions/property/${propertyId}/history`, { requiresAuth: true, encryptResponse: true });
};

export const updateAutoExtend = async (
  promotionId: string,
  settings: { autoExtend: boolean; autoExtendDuration?: number }
): Promise<{
  success: boolean;
  message: string;
  promotion?: {
    _id: string;
    autoExtend: boolean;
    autoExtendDuration: number;
  };
}> => {
  return apiRequest(`/promotions/${promotionId}/auto-extend`, {
    method: 'PUT',
    body: settings,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const confirmAutoExtendPayment = async (
  sessionId: string
): Promise<{
  success: boolean;
  message: string;
  promotion?: any;
  newEndDate?: string;
}> => {
  return apiRequest('/promotions/confirm-auto-extend', {
    method: 'POST',
    body: { sessionId },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const getAutoExtendCheckout = async (
  promotionId: string
): Promise<{
  success: boolean;
  url?: string;
  sessionId?: string;
  promotion?: {
    _id: string;
    promotionTier: string;
    autoExtendDuration: number;
    endDate: string;
  };
}> => {
  return apiRequest(`/promotions/${promotionId}/auto-extend-checkout`, { requiresAuth: true, encryptResponse: true });
};

export const getFeaturedProperties = async (filters?: {
  city?: string;
  tier?: string;
  limit?: number;
}): Promise<any> => {
  const params = new URLSearchParams();
  if (filters?.city) params.append('city', filters.city);
  if (filters?.tier) params.append('tier', filters.tier);
  if (filters?.limit) params.append('limit', String(filters.limit));

  return apiRequest(`/promotions/featured?${params.toString()}`);
};

export const getPromotionStats = async (promotionId: string): Promise<any> => {
  return apiRequest(`/promotions/${promotionId}/stats`, { requiresAuth: true, encryptResponse: true });
};
