// Admin API module
// Handles all admin-related API calls

import { apiRequest, uploadRequest } from '@/src/shared/api';

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

// --- Luxury villa approval queue ---

export type VillaApprovalStatus = 'pending' | 'approved' | 'rejected';

export const getVillaApprovals = async (
  status: VillaApprovalStatus = 'pending'
): Promise<{ count: number; status: string; villas: any[]; hasMore?: boolean }> => {
  return apiRequest(`/admin/villa-approvals?status=${status}`, {
    requiresAuth: true,
  });
};

export const approveVilla = async (villaId: string): Promise<any> => {
  return apiRequest(`/admin/villa-approvals/${villaId}/approve`, {
    method: 'POST',
    requiresAuth: true,
  });
};

export const rejectVilla = async (villaId: string, reason?: string): Promise<any> => {
  return apiRequest(`/admin/villa-approvals/${villaId}/reject`, {
    method: 'POST',
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
  });
};

// --- Admin Products/Pricing ---

export interface Product {
  id: string;
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

// --- Admin Promotion Plans ---

export interface PromotionPlan {
  id: string;
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
  // Special Offer fields
  isSpecialOffer?: boolean;
  availableFrom?: string;
  availableTo?: string;
  originalPriceMultiplier?: number;
  offerLabel?: string;

  isActive: boolean;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const getPromotionPlans = async (): Promise<{ plans: PromotionPlan[] }> => {
  return apiRequest('/promotion-plans/admin', {
    requiresAuth: true,
  });
};

export const getPublicPromotionPlans = async (category?: string): Promise<{ plans: PromotionPlan[] }> => {
  const queryParams = category ? `?category=${category}` : '';
  return apiRequest(`/promotion-plans${queryParams}`, {
    requiresAuth: false,
  });
};

export const createPromotionPlan = async (
  data: Omit<PromotionPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ plan: PromotionPlan }> => {
  return apiRequest('/promotion-plans', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
};

export const updatePromotionPlan = async (
  planId: string,
  data: Partial<PromotionPlan>
): Promise<{ plan: PromotionPlan }> => {
  // Strip id and any nested subdocument ids before sending to backend
  const { id: _stripId, ...cleanData } = data as any;
  return apiRequest(`/promotion-plans/${planId}`, {
    method: 'PUT',
    body: cleanData,
    requiresAuth: true,
  });
};

export const deletePromotionPlan = async (planId: string): Promise<{ message: string }> => {
  return apiRequest(`/promotion-plans/${planId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
};

export const togglePromotionPlanStatus = async (planId: string): Promise<{ plan: PromotionPlan }> => {
  return apiRequest(`/promotion-plans/${planId}/toggle-status`, {
    method: 'POST',
    requiresAuth: true,
  });
};

export const seedPromotionPlans = async (options?: { force?: boolean }): Promise<{ message: string; count?: number }> => {
  const queryParams = options?.force ? '?force=true' : '';
  return apiRequest(`/promotion-plans/seed${queryParams}`, {
    method: 'POST',
    requiresAuth: true,
  });
};

// --- License Verification Management ---

export interface PendingLicenseAgent {
  agentId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    country?: string;
    city?: string;
  };
  licenseNumber: string;
  licenseCountry: string;
  licenseStatus: string;
  agencyName: string;
  createdAt: string;
  updatedAt: string;
}

export const getPendingLicenses = async (): Promise<{
  count: number;
  agents: PendingLicenseAgent[];
}> => {
  return apiRequest('/admin/pending-licenses', {
    requiresAuth: true,
  });
};

export const approveLicense = async (userId: string): Promise<{
  message: string;
  userId: string;
  licenseNumber: string;
  licenseStatus: string;
}> => {
  return apiRequest(`/admin/approve-license/${userId}`, {
    method: 'POST',
    requiresAuth: true,
  });
};

export const rejectLicense = async (userId: string, reason?: string): Promise<{
  message: string;
  userId: string;
  licenseNumber: string;
  licenseStatus: string;
  reason?: string;
}> => {
  return apiRequest(`/admin/reject-license/${userId}`, {
    method: 'POST',
    body: { reason },
    requiresAuth: true,
  });
};

// --- Villa Destinations (home-page corridor) ---

export interface AdminVillaDestination {
  _id: string;
  name: string;
  query: string;
  country: string;
  imageUrl?: string;
  imagePublicId?: string;
  imageCity?: string;
  imageCountry?: string;
  lat: number;
  lng: number;
  zoom: number;
  displayOrder: number;
  isActive: boolean;
}

export type VillaDestinationInput = Omit<AdminVillaDestination, '_id'>;

export const getAdminVillaDestinations = async (): Promise<{
  destinations: AdminVillaDestination[];
  count: number;
}> => apiRequest('/admin/villa-destinations', { requiresAuth: true });

export const createVillaDestination = async (
  body: Partial<VillaDestinationInput>
): Promise<{ destination: AdminVillaDestination }> =>
  apiRequest('/admin/villa-destinations', { method: 'POST', body, requiresAuth: true });

export const updateVillaDestination = async (
  id: string,
  body: Partial<VillaDestinationInput>
): Promise<{ destination: AdminVillaDestination }> =>
  apiRequest(`/admin/villa-destinations/${id}`, { method: 'PATCH', body, requiresAuth: true });

export const deleteVillaDestination = async (id: string): Promise<{ message: string }> =>
  apiRequest(`/admin/villa-destinations/${id}`, { method: 'DELETE', requiresAuth: true });

export const importDefaultVillaDestinations = async (): Promise<{
  message: string;
  imported: number;
  skipped: number;
}> => apiRequest('/admin/villa-destinations/import-defaults', { method: 'POST', requiresAuth: true });


// --- City showcase (home-page elastic gallery) ---
//
// The `city-showcase` collection is the only source of the gallery's content:
// nothing is hardcoded on the home page, so a panel without a photo cannot
// render at all. `imageUrl` is therefore required on the wire, not optional as
// it is for villa destinations, and the upload endpoint is called before the
// row exists rather than after.

export interface AdminCityShowcase {
  _id: string;
  city: string;
  country: string;
  searchQuery: string;
  imageUrl: string;
  imagePublicId?: string;
  displayOrder: number;
  isActive: boolean;
}

export type CityShowcaseInput = Omit<AdminCityShowcase, '_id'>;

export const getAdminCityShowcase = async (): Promise<{
  cities: AdminCityShowcase[];
  count: number;
}> => apiRequest('/admin/city-showcase', { requiresAuth: true });

export const createCityShowcase = async (
  body: CityShowcaseInput
): Promise<{ city: AdminCityShowcase }> =>
  apiRequest('/admin/city-showcase', { method: 'POST', body, requiresAuth: true });

export const updateCityShowcase = async (
  id: string,
  body: Partial<CityShowcaseInput>
): Promise<{ city: AdminCityShowcase }> =>
  apiRequest(`/admin/city-showcase/${id}`, { method: 'PATCH', body, requiresAuth: true });

export const deleteCityShowcase = async (id: string): Promise<{ message: string }> =>
  apiRequest(`/admin/city-showcase/${id}`, { method: 'DELETE', requiresAuth: true });

/**
 * Stores a photo and returns where it landed. The caller attaches the result
 * to a panel with `createCityShowcase` or `updateCityShowcase` — which is what
 * lets the create form obtain a photo before the row it belongs to exists.
 */
export const uploadCityShowcaseImage = async (
  file: File
): Promise<{ url: string; publicId: string }> => {
  const form = new FormData();
  form.append('image', file);
  // `uploadRequest` rather than a bare fetch: it refreshes an expired access
  // token and retries, emits `session-expired` when that fails, and waits for
  // the CSRF cookie before posting.
  return uploadRequest('/admin/city-showcase/upload-image', form);
};

/**
 * Copies the cities already in the database (`CityMarketData`) into the
 * gallery. Idempotent — it matches on city + country, so re-running after the
 * market data grows brings in only what is missing. `missingPhoto` names the
 * cities that were skipped because no photo could be found for them; they need
 * one uploaded by hand before they can be panels.
 */
export const importCitiesIntoShowcase = async (): Promise<{
  message: string;
  imported: number;
  alreadyPresent: number;
  missingPhoto: string[];
}> => apiRequest('/admin/city-showcase/import-cities', { method: 'POST', requiresAuth: true });
