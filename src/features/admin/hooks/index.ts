/**
 * Admin Hooks - Centralized exports for all admin data management hooks
 *
 * Following architecture guidelines:
 * - Use TanStack Query for ALL server state
 * - Separate hooks files by domain (email, coupons, general admin)
 * - Export everything from a single index for clean imports
 */

// General admin data hooks (legacy)
export * from './useAdminData';

// React Query hooks for admin management
export * from './useAdminQueries';

// Email configuration hooks
export * from './useEmailConfigData';

// Promotion coupon hooks
export * from './usePromotionCouponData';
