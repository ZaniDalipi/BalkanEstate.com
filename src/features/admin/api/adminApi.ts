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
  });
};

export const checkExpiredSubscriptions = async (): Promise<any> => {
  return apiRequest('/admin/featured-subscriptions/check-expired', {
    method: 'POST',
    requiresAuth: true,
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
  });
};

export const deleteUser = async (userId: string): Promise<any> => {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
    requiresAuth: true,
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
  });
};

export const approveProperty = async (propertyId: string): Promise<any> => {
  return apiRequest(`/admin/properties/${propertyId}/approve`, {
    method: 'PUT',
    requiresAuth: true,
  });
};

export const rejectProperty = async (propertyId: string, reason?: string): Promise<any> => {
  return apiRequest(`/admin/properties/${propertyId}/reject`, {
    method: 'PUT',
    body: { reason },
    requiresAuth: true,
  });
};

// --- Admin Analytics ---

export const getAdminAnalytics = async (): Promise<any> => {
  return apiRequest('/admin/analytics', {
    requiresAuth: true,
  });
};

// --- Admin Discount Codes ---

export const getDiscountCodes = async (): Promise<any> => {
  return apiRequest('/admin/discount-codes', {
    requiresAuth: true,
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
  });
};

export const deleteDiscountCode = async (codeId: string): Promise<any> => {
  return apiRequest(`/admin/discount-codes/${codeId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const deactivateDiscountCode = async (codeId: string): Promise<any> => {
  return apiRequest(`/admin/discount-codes/${codeId}/deactivate`, {
    method: 'PATCH',
    requiresAuth: true,
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
  stripeProductId?: string;
  stripePriceId?: string;
}

export const getProducts = async (): Promise<{ products: Product[] }> => {
  return apiRequest('/products/admin/all', {
    requiresAuth: true,
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
  });
};

export const toggleProductStatus = async (productId: string): Promise<{ product: Product }> => {
  return apiRequest(`/products/admin/${productId}/status`, {
    method: 'PATCH',
    requiresAuth: true,
  });
};

export const toggleProductVisibility = async (productId: string): Promise<{ product: Product }> => {
  return apiRequest(`/products/admin/${productId}/visibility`, {
    method: 'PATCH',
    requiresAuth: true,
  });
};
