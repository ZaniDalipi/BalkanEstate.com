/**
 * Admin Data Hooks - Reactive data management using React Query
 *
 * Similar to Android's Kotlin Flow pattern:
 * - useQuery = StateFlow.collectAsState() - reactive data stream
 * - useMutation = suspend fun that triggers Flow updates
 * - invalidateQueries = Flow refresh/emit new value
 * - optimistic updates = immediate UI update before server confirmation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  updateProduct,
  toggleProductStatus,
  toggleProductVisibility,
  getUsers,
  updateUserRole,
  deleteUser,
  getDiscountCodes,
  createDiscountCode,
  deleteDiscountCode,
  Product,
} from '../api/adminApi';

// ============================================================================
// Query Keys - Centralized cache key management
// ============================================================================

export const adminKeys = {
  all: ['admin'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  users: (params?: any) => [...adminKeys.all, 'users', params] as const,
  discountCodes: () => [...adminKeys.all, 'discountCodes'] as const,
  analytics: () => [...adminKeys.all, 'analytics'] as const,
};

// ============================================================================
// Products Hooks - Reactive product/pricing management
// ============================================================================

/**
 * useProducts - Fetches and subscribes to products data
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
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchInterval: 60 * 1000, // Poll every 60 seconds for real-time updates
  });
}

/**
 * useUpdateProduct - Mutation hook for updating products
 * Implements optimistic updates for instant UI feedback
 *
 * Similar to: viewModel.updateProduct(product)
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: Partial<Product> }) =>
      updateProduct(productId, data),

    // Optimistic update - update UI immediately before server confirms
    onMutate: async ({ productId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.products() });

      // Snapshot previous value for rollback
      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.products());

      // Optimistically update the cache
      queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
        old?.map((p) => (p._id === productId ? { ...p, ...data } : p))
      );

      return { previousProducts };
    },

    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(adminKeys.products(), context.previousProducts);
      }
    },

    // Always refetch after mutation to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

/**
 * useToggleProductStatus - Toggle product active/inactive
 * With optimistic updates
 */
export function useToggleProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductStatus(productId),

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.products() });
      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.products());

      queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
        old?.map((p) => (p._id === productId ? { ...p, isActive: !p.isActive } : p))
      );

      return { previousProducts };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(adminKeys.products(), context.previousProducts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

/**
 * useToggleProductVisibility - Toggle product visibility
 * With optimistic updates
 */
export function useToggleProductVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => toggleProductVisibility(productId),

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.products() });
      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.products());

      queryClient.setQueryData<Product[]>(adminKeys.products(), (old) =>
        old?.map((p) => (p._id === productId ? { ...p, isVisible: !p.isVisible } : p))
      );

      return { previousProducts };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(adminKeys.products(), context.previousProducts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

// ============================================================================
// Users Hooks
// ============================================================================

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

// ============================================================================
// Discount Codes Hooks
// ============================================================================

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.discountCodes() });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * useRefreshAdminData - Force refresh all admin data
 * Useful for manual refresh buttons
 */
export function useRefreshAdminData() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.all });
  };
}
