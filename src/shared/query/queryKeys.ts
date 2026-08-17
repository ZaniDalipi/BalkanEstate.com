/**
 * Centralized Query Keys for React Query
 *
 * This file defines all query keys used throughout the application.
 * Having centralized keys ensures proper cache invalidation when data changes.
 *
 * Pattern:
 * - Keys are organized by domain (products, users, properties, etc.)
 * - Each domain has sub-keys for different data views
 * - Admin and public views share base keys for cross-invalidation
 */

// ============================================================================
// Products Query Keys
// Used by: PricingPlans, PromotionOfferModal, Admin PricingManager
// ============================================================================

export const productKeys = {
  all: ['products'] as const,

  // Public endpoints (visible products only)
  public: () => [...productKeys.all, 'public'] as const,
  publicByRole: (role?: 'buyer' | 'seller' | 'agent') =>
    [...productKeys.public(), { role }] as const,
  publicProduct: (productId: string) =>
    [...productKeys.public(), productId] as const,

  // Admin endpoints (all products including hidden)
  admin: () => [...productKeys.all, 'admin'] as const,
  adminAll: () => [...productKeys.admin(), 'all'] as const,
};

// ============================================================================
// Room Styler Query Keys
// Used by: RoomStylerModal usage meter, MyAccountPage AI usage meter
// ============================================================================

export const roomStylerKeys = {
  all: ['roomStyler'] as const,
  usage: () => [...roomStylerKeys.all, 'usage'] as const,
};

// ============================================================================
// Discount Codes Query Keys
// Used by: Admin DiscountCodeManager, Payment validation
// ============================================================================

export const discountKeys = {
  all: ['discounts'] as const,

  // Admin - all discount codes
  admin: () => [...discountKeys.all, 'admin'] as const,
  adminList: () => [...discountKeys.admin(), 'list'] as const,

  // Public - validate specific code
  validate: (code: string) => [...discountKeys.all, 'validate', code] as const,
};

// ============================================================================
// Promotion Coupons Query Keys
// Used by: Admin PromotionCouponManager, listing boost features
// ============================================================================

export const couponKeys = {
  all: ['coupons'] as const,

  admin: () => [...couponKeys.all, 'admin'] as const,
  adminList: () => [...couponKeys.admin(), 'list'] as const,

  // User's available coupons
  userCoupons: (userId?: string) => [...couponKeys.all, 'user', userId] as const,
};

// ============================================================================
// Users Query Keys
// Used by: Admin UserManager, user profile
// ============================================================================

export const userKeys = {
  all: ['users'] as const,

  // Admin - user management
  admin: () => [...userKeys.all, 'admin'] as const,
  adminList: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    [...userKeys.admin(), 'list', params] as const,
  adminUser: (userId: string) => [...userKeys.admin(), userId] as const,

  // Current user profile
  current: () => [...userKeys.all, 'current'] as const,
  currentSubscription: () => [...userKeys.current(), 'subscription'] as const,
};

// ============================================================================
// Properties Query Keys
// Used by: Admin PropertyManager, listings, search results
// ============================================================================

export const propertyKeys = {
  all: ['properties'] as const,

  // Admin - all properties
  admin: () => [...propertyKeys.all, 'admin'] as const,
  adminList: (params?: { page?: number; limit?: number; status?: string }) =>
    [...propertyKeys.admin(), 'list', params] as const,
  adminProperty: (propertyId: string) => [...propertyKeys.admin(), propertyId] as const,

  // Public - approved properties
  public: () => [...propertyKeys.all, 'public'] as const,
  publicList: (filters?: Record<string, unknown>) =>
    [...propertyKeys.public(), 'list', filters] as const,
  publicProperty: (propertyId: string) => [...propertyKeys.public(), propertyId] as const,

  // User's own properties
  myListings: () => [...propertyKeys.all, 'my'] as const,

  // Price history for a single property
  priceHistory: (propertyId: string) => [...propertyKeys.all, propertyId, 'price-history'] as const,
};

// ============================================================================
// Analytics Query Keys
// Used by: Admin AnalyticsDashboard
// ============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,

  admin: () => [...analyticsKeys.all, 'admin'] as const,
  dashboard: () => [...analyticsKeys.admin(), 'dashboard'] as const,
};

// ============================================================================
// Featured Subscriptions Query Keys
// Used by: Admin featured subscription management
// ============================================================================

export const featuredKeys = {
  all: ['featured'] as const,

  admin: () => [...featuredKeys.all, 'admin'] as const,
  adminList: (params?: { status?: string; page?: number; limit?: number }) =>
    [...featuredKeys.admin(), 'list', params] as const,
};

// ============================================================================
// Agency Query Keys
// Used by: Admin AgencyManager, agency pages
// ============================================================================

export const agencyKeys = {
  all: ['agencies'] as const,

  admin: () => [...agencyKeys.all, 'admin'] as const,
  adminList: () => [...agencyKeys.admin(), 'list'] as const,

  public: () => [...agencyKeys.all, 'public'] as const,
  publicAgency: (agencyId: string) => [...agencyKeys.public(), agencyId] as const,
};

// ============================================================================
// Promotion Plans Query Keys
// Used by: Admin PromotionPlansManager, public promotion pages
// ============================================================================

export const promotionPlanKeys = {
  all: ['promotion-plans'] as const,

  // Admin - all plans including inactive
  admin: () => [...promotionPlanKeys.all, 'admin'] as const,
  adminList: () => [...promotionPlanKeys.admin(), 'list'] as const,

  // Public - active and visible plans only
  public: () => [...promotionPlanKeys.all, 'public'] as const,
  publicByCategory: (category?: 'listing' | 'agency') =>
    [...promotionPlanKeys.public(), { category }] as const,
};

// ============================================================================
// Backward Compatibility - Admin Keys Alias
// Used by existing admin hooks
// ============================================================================

export const adminKeys = {
  all: ['admin'] as const,
  products: () => productKeys.adminAll(),
  users: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    userKeys.adminList(params),
  discountCodes: () => discountKeys.adminList(),
  analytics: () => analyticsKeys.dashboard(),
  properties: (params?: { page?: number; limit?: number; status?: string }) =>
    propertyKeys.adminList(params),
  coupons: () => couponKeys.adminList(),
  featured: (params?: { status?: string; page?: number; limit?: number }) =>
    featuredKeys.adminList(params),
  promotionPlans: () => promotionPlanKeys.adminList(),
};

// ============================================================================
// Invalidation Helpers
// Helper functions to get all related keys that should be invalidated
// ============================================================================

/**
 * Get all product-related keys that should be invalidated when products change
 */
export function getProductInvalidationKeys() {
  return [
    productKeys.all,      // Invalidates all product caches (admin + public)
    analyticsKeys.all,    // Product changes may affect analytics
  ];
}

/**
 * Get all user-related keys that should be invalidated when users change
 */
export function getUserInvalidationKeys() {
  return [
    userKeys.all,
    analyticsKeys.all,
  ];
}

/**
 * Get all property-related keys that should be invalidated when properties change
 */
export function getPropertyInvalidationKeys() {
  return [
    propertyKeys.all,
    analyticsKeys.all,
  ];
}

/**
 * Get all discount-related keys that should be invalidated when discounts change
 */
export function getDiscountInvalidationKeys() {
  return [
    discountKeys.all,
    analyticsKeys.all,
  ];
}

/**
 * Get all promotion plan keys that should be invalidated when plans change
 */
export function getPromotionPlanInvalidationKeys() {
  return [
    promotionPlanKeys.all,
    analyticsKeys.all,
  ];
}
