/**
 * Admin Data Hooks - Reactive data management using React Query
 *
 * Similar to Android's Kotlin Flow pattern:
 * - useQuery = StateFlow.collectAsState() - reactive data stream
 * - useMutation = suspend fun that triggers Flow updates
 * - invalidateQueries = Flow refresh/emit new value
 * - optimistic updates = immediate UI update before server confirmation
 *
 * KEY FEATURE: Cross-app cache invalidation
 * When admin modifies data, BOTH admin AND public caches are invalidated.
 * This ensures all components across the app stay in sync automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  updateProduct,
  toggleProductStatus,
  toggleProductVisibility,
  getUsers,
  updateUserRole,
  updateUser,
  deleteUser,
  getDiscountCodes,
  createDiscountCode,
  createFullDiscountCode,
  deleteDiscountCode,
  deactivateDiscountCode,
  generateBulkDiscountCodes,
  getPromotionPlans,
  createPromotionPlan,
  updatePromotionPlan,
  deletePromotionPlan,
  togglePromotionPlanStatus,
  seedPromotionPlans,
  Product,
  PromotionPlan,
  UserUpdateData,
  CreateDiscountCodeData,
  BulkDiscountCodeData,
} from '../api/adminApi';
import {
  productKeys,
  userKeys,
  discountKeys,
  analyticsKeys,
  promotionPlanKeys,
  getProductInvalidationKeys,
  getUserInvalidationKeys,
  getDiscountInvalidationKeys,
  getPromotionPlanInvalidationKeys,
} from '@/src/shared/query/queryKeys';

// ============================================================================
// Query Keys - Using centralized keys from shared module
// Re-export for backward compatibility
// ============================================================================

export const adminKeys = {
  all: ['admin'] as const,
  products: () => productKeys.adminAll(),
  users: (params?: { page?: number; limit?: number; role?: string; search?: string }) =>
    userKeys.adminList(params),
  discountCodes: () => discountKeys.adminList(),
  analytics: () => analyticsKeys.dashboard(),
  promotionPlans: () => promotionPlanKeys.adminList(),
};

// ============================================================================
// Products Hooks - Reactive product/pricing management
// ============================================================================

/**
 * useProducts - Fetches and subscribes to products data (admin view - all products)
 * Automatically refetches on window focus and at intervals for real-time updates
 *
 * Similar to: viewModel.products.collectAsState()
 */
export function useProducts() {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: async () => {
      const response = await getProducts();
      return response.products ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - pricing data rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Helper function to invalidate all product-related caches across the app
 */
function invalidateAllProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  getProductInvalidationKeys().forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

/**
 * useUpdateProduct - Mutation hook for updating products
 * Forces immediate refetch after mutation for guaranteed UI sync
 *
 * Similar to: viewModel.updateProduct(product)
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      updateProduct(productId, data),

    onError: (error) => {
      // Error removed
    },

    onSettled: () => {
      invalidateAllProductCaches(queryClient);
    },
  });
}

/**
 * useToggleProductStatus - Toggle product active/inactive
 */
export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductStatus(productId),
    onSettled: () => {
      invalidateAllProductCaches(queryClient);
    },
  });
}

/**
 * useToggleProductVisibility - Toggle product visibility
 */
export function useToggleProductVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductVisibility(productId),
    onSettled: () => {
      invalidateAllProductCaches(queryClient);
    },
  });
}

// ============================================================================
// Users Hooks
// ============================================================================

/**
 * Helper function to invalidate all user-related caches across the app
 */
function invalidateAllUserCaches(queryClient: ReturnType<typeof useQueryClient>) {
  getUserInvalidationKeys().forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

export function useUsers(params?: { page?: number; limit?: number; role?: string; search?: string }) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => getUsers(params),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUserRole(userId, role),
    // Invalidate ALL user caches across the app
    onSettled: () => {
      invalidateAllUserCaches(queryClient);
    },
  });
}

/**
 * useUpdateUser - Full user update mutation
 * Used for editing user details in admin panel
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdateData }) =>
      updateUser(userId, data),
    // Invalidate ALL user caches across the app
    onSettled: () => {
      invalidateAllUserCaches(queryClient);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    // Invalidate ALL user caches across the app
    onSettled: () => {
      invalidateAllUserCaches(queryClient);
    },
  });
}

// ============================================================================
// Discount Codes Hooks
// ============================================================================

/**
 * Helper function to invalidate all discount-related caches across the app
 */
function invalidateAllDiscountCaches(queryClient: ReturnType<typeof useQueryClient>) {
  getDiscountInvalidationKeys().forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

export function useDiscountCodes() {
  return useQuery({
    queryKey: adminKeys.discountCodes(),
    queryFn: getDiscountCodes,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { code: string; discountPercent: number; maxUses?: number; expiresAt?: string }) =>
      createDiscountCode(data),
    // Invalidate ALL discount caches - affects payment validation
    onSettled: () => {
      invalidateAllDiscountCaches(queryClient);
    },
  });
}

export function useDeleteDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: string) => deleteDiscountCode(codeId),

    // Optimistic delete
    onMutate: async (codeId) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.discountCodes() });
      const previousCodes = queryClient.getQueryData(adminKeys.discountCodes());

      queryClient.setQueryData(adminKeys.discountCodes(), (old: any) => ({
        ...old,
        codes: old?.codes?.filter((c: any) => c._id !== codeId),
      }));

      return { previousCodes };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousCodes) {
        queryClient.setQueryData(adminKeys.discountCodes(), context.previousCodes);
      }
    },

    // Invalidate ALL discount caches - affects payment validation
    onSettled: () => {
      invalidateAllDiscountCaches(queryClient);
    },
  });
}

/**
 * useDeactivateDiscountCode - Deactivate a discount code
 */
export function useDeactivateDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (codeId: string) => deactivateDiscountCode(codeId),
    onSettled: () => {
      invalidateAllDiscountCaches(queryClient);
    },
  });
}

/**
 * useCreateFullDiscountCode - Create a discount code with all fields
 */
export function useCreateFullDiscountCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDiscountCodeData) => createFullDiscountCode(data),
    onSettled: () => {
      invalidateAllDiscountCaches(queryClient);
    },
  });
}

/**
 * useBulkGenerateDiscountCodes - Generate multiple discount codes at once
 */
export function useBulkGenerateDiscountCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkDiscountCodeData) => generateBulkDiscountCodes(data),
    onSettled: () => {
      invalidateAllDiscountCaches(queryClient);
    },
  });
}

// ============================================================================
// Promotion Plans Hooks - Reactive promotion plan management
// ============================================================================

/**
 * Helper function to invalidate all promotion plan caches across the app
 */
function invalidateAllPromotionPlanCaches(queryClient: ReturnType<typeof useQueryClient>) {
  getPromotionPlanInvalidationKeys().forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}

/**
 * usePromotionPlans - Fetches and subscribes to promotion plans data (admin view - all plans)
 */
export function usePromotionPlans() {
  return useQuery({
    queryKey: adminKeys.promotionPlans(),
    queryFn: async () => {
      const response = await getPromotionPlans();
      return response.plans ?? [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - plans rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * useCreatePromotionPlan - Create a new promotion plan
 */
export function useCreatePromotionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<PromotionPlan, '_id' | 'createdAt' | 'updatedAt'>) =>
      createPromotionPlan(data),
    onSettled: () => {
      invalidateAllPromotionPlanCaches(queryClient);
    },
  });
}

/**
 * useUpdatePromotionPlan - Update an existing promotion plan
 */
export function useUpdatePromotionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: Partial<PromotionPlan> }) =>
      updatePromotionPlan(planId, data),
    onSettled: () => {
      invalidateAllPromotionPlanCaches(queryClient);
    },
  });
}

/**
 * useDeletePromotionPlan - Delete a promotion plan
 */
export function useDeletePromotionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => deletePromotionPlan(planId),

    // Optimistic delete
    onMutate: async (planId) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.promotionPlans() });
      const previousPlans = queryClient.getQueryData(adminKeys.promotionPlans());

      queryClient.setQueryData(adminKeys.promotionPlans(), (old: PromotionPlan[] | undefined) =>
        old?.filter((plan) => plan._id !== planId)
      );

      return { previousPlans };
    },

    onError: (_err, _planId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(adminKeys.promotionPlans(), context.previousPlans);
      }
    },

    onSettled: () => {
      invalidateAllPromotionPlanCaches(queryClient);
    },
  });
}

/**
 * useTogglePromotionPlanStatus - Toggle promotion plan active/inactive status
 * Includes optimistic update for instant UI feedback
 */
export function useTogglePromotionPlanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: string) => togglePromotionPlanStatus(planId),

    // Optimistic update for instant feedback
    onMutate: async (planId) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.promotionPlans() });
      const previousPlans = queryClient.getQueryData(adminKeys.promotionPlans());

      queryClient.setQueryData(adminKeys.promotionPlans(), (old: PromotionPlan[] | undefined) =>
        old?.map((plan) =>
          plan._id === planId ? { ...plan, isActive: !plan.isActive } : plan
        )
      );

      return { previousPlans };
    },

    onError: (_err, _planId, context) => {
      if (context?.previousPlans) {
        queryClient.setQueryData(adminKeys.promotionPlans(), context.previousPlans);
      }
    },

    onSettled: () => {
      invalidateAllPromotionPlanCaches(queryClient);
    },
  });
}

/**
 * useSeedPromotionPlans - Seed default promotion plans
 */
export function useSeedPromotionPlans() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (options?: { force?: boolean }) => seedPromotionPlans(options),
    onSettled: () => {
      invalidateAllPromotionPlanCaches(queryClient);
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * useRefreshAdminData - Force refresh all admin data AND public data
 * Useful for manual refresh buttons - ensures full app sync
 */
export function useRefreshAdminData() {
  const queryClient = useQueryClient();

  return () => {
    // Invalidate ALL caches across the entire app
    invalidateAllProductCaches(queryClient);
    invalidateAllUserCaches(queryClient);
    invalidateAllDiscountCaches(queryClient);
    invalidateAllPromotionPlanCaches(queryClient);
  };
}

/**
 * useInvalidateAllData - Hook to get functions for invalidating specific data types
 * Useful when you need granular control over what gets invalidated
 */
export function useInvalidateAllData() {
  const queryClient = useQueryClient();

  return {
    products: () => invalidateAllProductCaches(queryClient),
    users: () => invalidateAllUserCaches(queryClient),
    discounts: () => invalidateAllDiscountCaches(queryClient),
    promotionPlans: () => invalidateAllPromotionPlanCaches(queryClient),
    all: () => {
      invalidateAllProductCaches(queryClient);
      invalidateAllUserCaches(queryClient);
      invalidateAllDiscountCaches(queryClient);
      invalidateAllPromotionPlanCaches(queryClient);
    },
  };
}
