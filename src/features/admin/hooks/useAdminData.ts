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
  Product,
  UserUpdateData,
  CreateDiscountCodeData,
  BulkDiscountCodeData,
} from '../api/adminApi';
import {
  productKeys,
  userKeys,
  discountKeys,
  analyticsKeys,
  getProductInvalidationKeys,
  getUserInvalidationKeys,
  getDiscountInvalidationKeys,
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
};

// ============================================================================
// Products Hooks - Reactive product/pricing management
// ============================================================================

/**
 * useProducts - Fetches and subscribes to products data (admin view - all products)
 * Automatically refetches on window focus and at intervals
 *
 * Similar to: viewModel.products.collectAsState()
 */
export function useProducts() {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: async () => {
      const response = await getProducts();
      return response.products;
    },
    staleTime: 0, // Always consider stale - ensures immediate refetch after mutations
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (garbage collection time)
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: true, // Always refetch when component mounts
  });
}

/**
 * Helper function to invalidate all product-related caches across the app
 * Forces immediate refetch by setting refetchType to 'all'
 */
function invalidateAllProductCaches(queryClient: ReturnType<typeof useQueryClient>) {
  // Invalidate all product-related keys (admin + public) and force refetch
  getProductInvalidationKeys().forEach((key) => {
    queryClient.invalidateQueries({
      queryKey: key,
      refetchType: 'all', // Force refetch even if query is not active
    });
  });
}

/**
 * useUpdateProduct - Mutation hook for updating products
 * Uses server response to update cache for guaranteed consistency
 *
 * Similar to: viewModel.updateProduct(product)
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      updateProduct(productId, data),

    // Update cache with actual server response for consistency
    onSuccess: (response, { productId }) => {
      const updatedProduct = response.product;
      if (updatedProduct) {
        queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
          old?.map((p) => (p._id === productId ? updatedProduct : p))
        );
      }
    },

    onError: (error) => {
      console.error('Update product error:', error);
    },

    // Always invalidate and force refetch to ensure all views are updated
    onSettled: () => {
      invalidateAllProductCaches(queryClient);
    },
  });
}

/**
 * useToggleProductStatus - Toggle product active/inactive
 * Uses server response to update cache instead of optimistic updates
 */
export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductStatus(productId),

    // Update cache with actual server response
    onSuccess: (response) => {
      const updatedProduct = response.product;
      if (updatedProduct) {
        queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
          old?.map((p) => (p._id === updatedProduct._id ? updatedProduct : p))
        );
      }
    },

    onError: (error) => {
      console.error('Toggle product status error:', error);
    },

    // Always invalidate and force refetch to ensure consistency
    onSettled: () => {
      invalidateAllProductCaches(queryClient);
    },
  });
}

/**
 * useToggleProductVisibility - Toggle product visibility
 * Uses server response to update cache instead of optimistic updates
 */
export function useToggleProductVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductVisibility(productId),

    // Update cache with actual server response
    onSuccess: (response) => {
      const updatedProduct = response.product;
      if (updatedProduct) {
        queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
          old?.map((p) => (p._id === updatedProduct._id ? updatedProduct : p))
        );
      }
    },

    onError: (error) => {
      console.error('Toggle product visibility error:', error);
    },

    // Always invalidate and force refetch to ensure consistency
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
    all: () => {
      invalidateAllProductCaches(queryClient);
      invalidateAllUserCaches(queryClient);
      invalidateAllDiscountCaches(queryClient);
    },
  };
}
