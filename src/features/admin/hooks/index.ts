/**
 * Admin Hooks - Centralized exports for all admin data management hooks
 *
 * Following architecture guidelines:
 * - Use TanStack Query for ALL server state
 * - Separate hooks files by domain (email, coupons, general admin)
 * - Export everything from a single index for clean imports
 *
 * NOTE: useAdminData and useAdminQueries have overlapping exports.
 * useAdminQueries is the newer, more complete version.
 * We export everything from useAdminQueries and only unique hooks from useAdminData.
 */

// React Query hooks for admin management (newer, preferred)
export * from './useAdminQueries';

// Legacy admin data hooks - only export unique hooks not in useAdminQueries
export {
  useProducts,
  useUsers,
  useDiscountCodes,
  usePromotionPlans,
  useCreatePromotionPlan,
  useCreateFullDiscountCode,
  useBulkGenerateDiscountCodes,
} from './useAdminData';

// Email configuration hooks
export * from './useEmailConfigData';

// Promotion coupon hooks
export * from './usePromotionCouponData';
