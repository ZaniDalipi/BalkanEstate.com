// Admin API module
// Handles all admin-related API calls

import { apiRequest } from '@/src/shared/api';

// --- Admin Featured Subscriptions ---

export const getAllFeaturedSubscriptions = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  return apiRequest(`/admin/featured-subscriptions?${queryParams.toString()}`, {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const checkExpiredSubscriptions = async (): Promise<any> => {
  return apiRequest('/admin/featured-subscriptions/check-expired', {
    method: 'POST',
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin User Management ---

export const getUsers = async (params?: {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.role) queryParams.append('role', params.role);
  if (params?.search) queryParams.append('search', params.search);

  return apiRequest(`/admin/users?${queryParams.toString()}`, {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const updateUserRole = async (
  userId: string,
  role: string
): Promise<any> => {
  return apiRequest(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: { role },
    requiresAuth: true,
    encryptResponse: true,
  });
};

export interface UserUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  role?: string;
  licenseNumber?: string;
  licenseVerified?: boolean;
  isEmailVerified?: boolean;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  agencyName?: string;
  isEnterpriseTier?: boolean;
}

export const updateUser = async (
  userId: string,
  data: UserUpdateData
): Promise<any> => {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const deleteUser = async (userId: string): Promise<any> => {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Property Management ---

export const getAdminProperties = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<any> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));
  if (params?.status) queryParams.append('status', params.status);

  return apiRequest(`/admin/properties?${queryParams.toString()}`, {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const approveProperty = async (propertyId: string): Promise<any> => {
  return apiRequest(`/admin/properties/${propertyId}/approve`, {
    method: 'PUT',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const rejectProperty = async (propertyId: string, reason?: string): Promise<any> => {
  return apiRequest(`/admin/properties/${propertyId}/reject`, {
    method: 'PUT',
    body: { reason },
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Analytics ---

export const getAdminAnalytics = async (): Promise<any> => {
  return apiRequest('/admin/analytics', {
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Discount Codes ---

export const getDiscountCodes = async (): Promise<any> => {
  return apiRequest('/admin/discount-codes', {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const createDiscountCode = async (data: {
  code: string;
  discountPercent: number;
  maxUses?: number;
  expiresAt?: string;
}): Promise<any> => {
  return apiRequest('/admin/discount-codes', {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const deleteDiscountCode = async (codeId: string): Promise<any> => {
  return apiRequest(`/admin/discount-codes/${codeId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const deactivateDiscountCode = async (codeId: string): Promise<any> => {
  return apiRequest(`/admin/discount-codes/${codeId}/deactivate`, {
    method: 'PATCH',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export interface CreateDiscountCodeData {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: string;
  validUntil: string;
  usageLimit: number;
  description?: string;
  applicablePlans?: string[];
  minimumPurchaseAmount?: number;
  source?: string;
}

export const createFullDiscountCode = async (data: CreateDiscountCodeData): Promise<any> => {
  return apiRequest('/admin/discount-codes', {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export interface BulkDiscountCodeData {
  count: number;
  prefix: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: string;
  validUntil: string;
  usageLimit: number;
}

export const generateBulkDiscountCodes = async (data: BulkDiscountCodeData): Promise<any> => {
  return apiRequest('/admin/discount-codes/generate', {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Agency Subscription Management ---

export const getAgencySubscription = async (agencyId: string): Promise<{
  success: boolean;
  subscription: {
    status: string;
    startDate: string;
    expiresAt: string;
    amount: number;
    currency: string;
    autoRenew: boolean;
  };
  owner: { name: string; email: string };
  agencyName: string;
  events: Array<{
    _id: string;
    eventType: string;
    previousStatus?: string;
    newStatus?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
}> => {
  return apiRequest(`/admin/agencies/${agencyId}/subscription`, {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const activateAgencySubscription = async (
  agencyId: string,
  data: { durationDays: number; reason?: string }
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/admin/agencies/${agencyId}/subscription/activate`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const deactivateAgencySubscription = async (
  agencyId: string,
  data: { reason?: string; immediate?: boolean }
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/admin/agencies/${agencyId}/subscription/deactivate`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- User Subscription Management ---

export const deactivateUserSubscription = async (
  subscriptionId: string,
  data: { reason?: string }
): Promise<{ success: boolean; message: string }> => {
  return apiRequest(`/admin/subscriptions/${subscriptionId}/deactivate`, {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Products/Pricing ---

export interface Product {
  _id: string;
  productId: string;
  name: string;
  description?: string;
  type: string;
  tier: string;
  price: number;
  currency: string;
  billingPeriod: string;
  durationDays: number;
  features: string[];
  targetRole: string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  isActive: boolean;
  isVisible: boolean;
  hasFreeTrial: boolean;
  trialPeriodDays?: number;
  gracePeriodDays: number;
  listingsLimit: number;
  promotionCoupons: number;
  premiumCoupons: number;
  highlightedCoupons: number;
  featuredCoupons: number;
  agentCoupons: number;
  aiMessagesLimit: number;
  aiInsightsLimit: number;
  imageDescriptionLimit: number;
  savedSearchesLimit: number;
  earlyAccessListings?: boolean;
  advancedMarketInsights?: boolean;
  externalProductId?: string;
  externalPriceId?: string;
  // Agency/Enterprise features
  maxActiveSubscriptions?: number;
  cardStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

export const getProducts = async (): Promise<{ products: Product[] }> => {
  return apiRequest('/products/admin/all', {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const updateProduct = async (
  productId: string,
  data: Partial<Product>
): Promise<{ product: Product }> => {
  return apiRequest(`/products/admin/${productId}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const toggleProductStatus = async (productId: string): Promise<{ product: Product }> => {
  return apiRequest(`/products/admin/${productId}/status`, {
    method: 'PATCH',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const toggleProductVisibility = async (productId: string): Promise<{ product: Product }> => {
  return apiRequest(`/products/admin/${productId}/visibility`, {
    method: 'PATCH',
    requiresAuth: true,
    encryptResponse: true,
  });
};

// --- Admin Promotion Plans ---

export interface PromotionPlan {
  _id: string;
  category: 'listing' | 'agency';
  tier: string;
  name: string;
  description?: string;
  icon?: string;
  pricing: {
    duration7?: number;
    duration14?: number;
    duration28?: number;
    duration30?: number;
    duration90?: number;
    fixedPrice?: number;
    fixedDuration?: string;
  };
  features: string[];
  visibilityMultiplier?: string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  isAddOn: boolean;
  cardStyle?: {
    gradientFrom?: string;
    gradientTo?: string;
    borderColor?: string;
    iconBgColor?: string;
    priceColor?: string;
  };
  isActive: boolean;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getPromotionPlans = async (): Promise<{ plans: PromotionPlan[] }> => {
  return apiRequest('/promotion-plans/admin', {
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const getPublicPromotionPlans = async (category?: string): Promise<{ plans: PromotionPlan[] }> => {
  const queryParams = category ? `?category=${category}` : '';
  return apiRequest(`/promotion-plans${queryParams}`, {
    requiresAuth: false,
  });
};

export const createPromotionPlan = async (
  data: Omit<PromotionPlan, '_id' | 'createdAt' | 'updatedAt'>
): Promise<{ plan: PromotionPlan }> => {
  return apiRequest('/promotion-plans', {
    method: 'POST',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const updatePromotionPlan = async (
  planId: string,
  data: Partial<PromotionPlan>
): Promise<{ plan: PromotionPlan }> => {
  return apiRequest(`/promotion-plans/${planId}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const deletePromotionPlan = async (planId: string): Promise<{ message: string }> => {
  return apiRequest(`/promotion-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const togglePromotionPlanStatus = async (planId: string): Promise<{ plan: PromotionPlan }> => {
  return apiRequest(`/promotion-plans/${planId}/toggle-status`, {
    method: 'POST',
    requiresAuth: true,
    encryptResponse: true,
  });
};

export const seedPromotionPlans = async (options?: { force?: boolean }): Promise<{ message: string; count?: number }> => {
  const queryParams = options?.force ? '?force=true' : '';
  return apiRequest(`/promotion-plans/seed${queryParams}`, {
    method: 'POST',
    requiresAuth: true,
    encryptResponse: true,
  });
};
