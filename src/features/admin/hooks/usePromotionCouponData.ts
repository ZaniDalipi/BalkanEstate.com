/**
 * Promotion Coupon Data Hooks - Reactive data management using React Query
 *
 * Manages promotion coupons for property listing promotions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/src/shared/api/httpClient';

// ============================================================================
// Types
// ============================================================================

export interface PromotionCoupon {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'expired' | 'disabled';
  maxTotalUses?: number;
  maxUsesPerUser: number;
  currentTotalUses: number;
  applicableTiers: string[];
  minimumPurchaseAmount?: number;
  isPublic: boolean;
  notes?: string;
  createdAt: string;
  usageHistory?: {
    userId: string;
    promotionId: string;
    usedAt: string;
    discountApplied: number;
  }[];
}

export interface CreateCouponData {
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  validFrom?: string;
  validUntil: string;
  maxTotalUses?: number;
  maxUsesPerUser: number;
  applicableTiers?: string[];
  minimumPurchaseAmount?: number;
  isPublic: boolean;
  notes?: string;
}

export interface CouponsResponse {
  coupons: PromotionCoupon[];
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function getPromotionCoupons(): Promise<CouponsResponse> {
  return apiRequest<CouponsResponse>('/coupons', { requiresAuth: true });
}

async function getPromotionCoupon(id: string): Promise<{ coupon: PromotionCoupon }> {
  return apiRequest<{ coupon: PromotionCoupon }>(`/coupons/${id}`, { requiresAuth: true });
}

async function createPromotionCoupon(
  data: CreateCouponData
): Promise<{ message: string; coupon: PromotionCoupon }> {
  return apiRequest<{ message: string; coupon: PromotionCoupon }>('/coupons', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

async function updatePromotionCoupon(
  id: string,
  data: Partial<CreateCouponData>
): Promise<{ message: string; coupon: PromotionCoupon }> {
  return apiRequest<{ message: string; coupon: PromotionCoupon }>(`/coupons/${id}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
  });
}

async function disablePromotionCoupon(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/coupons/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

async function validateCoupon(
  code: string,
  promotionTier: string,
  price: number
): Promise<{
  isValid: boolean;
  discount?: number;
  discountType?: string;
  discountValue?: number;
  message?: string;
}> {
  return apiRequest('/coupons/validate', {
    method: 'POST',
    body: { code, promotionTier, price },
    requiresAuth: true,
  });
}

// ============================================================================
// Query Keys
// ============================================================================

export const promotionCouponKeys = {
  all: ['promotion-coupons'] as const,
  list: () => [...promotionCouponKeys.all, 'list'] as const,
  detail: (id: string) => [...promotionCouponKeys.all, 'detail', id] as const,
  validate: (code: string) => [...promotionCouponKeys.all, 'validate', code] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * usePromotionCoupons - Fetches all promotion coupons with auto-refresh
 * Refetches every 10 seconds to catch coupon usage updates
 */
export function usePromotionCoupons() {
  return useQuery({
    queryKey: promotionCouponKeys.list(),
    queryFn: getPromotionCoupons,
    staleTime: 5 * 1000, // Consider stale after 5 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // Auto-refetch every 10 seconds for real-time updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * usePromotionCoupon - Fetches a single promotion coupon
 */
export function usePromotionCoupon(id: string) {
  return useQuery({
    queryKey: promotionCouponKeys.detail(id),
    queryFn: () => getPromotionCoupon(id),
    enabled: !!id,
    staleTime: 10 * 1000,
  });
}

/**
 * useCreatePromotionCoupon - Mutation to create a new coupon
 */
export function useCreatePromotionCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCouponData) => createPromotionCoupon(data),
    onSuccess: () => {
      // Invalidate and refetch coupons list
      queryClient.invalidateQueries({ queryKey: promotionCouponKeys.all });
    },
  });
}

/**
 * useUpdatePromotionCoupon - Mutation to update a coupon
 */
export function useUpdatePromotionCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCouponData> }) =>
      updatePromotionCoupon(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: promotionCouponKeys.all });
      queryClient.invalidateQueries({ queryKey: promotionCouponKeys.detail(id) });
    },
  });
}

/**
 * useDisablePromotionCoupon - Mutation to disable a coupon with optimistic update
 */
export function useDisablePromotionCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => disablePromotionCoupon(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: promotionCouponKeys.list() });

      // Snapshot the previous value
      const previousCoupons = queryClient.getQueryData<CouponsResponse>(
        promotionCouponKeys.list()
      );

      // Optimistically update to disabled status
      if (previousCoupons) {
        queryClient.setQueryData<CouponsResponse>(promotionCouponKeys.list(), {
          ...previousCoupons,
          coupons: previousCoupons.coupons.map((coupon) =>
            coupon._id === id ? { ...coupon, status: 'disabled' as const } : coupon
          ),
        });
      }

      return { previousCoupons };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousCoupons) {
        queryClient.setQueryData(promotionCouponKeys.list(), context.previousCoupons);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: promotionCouponKeys.all });
    },
  });
}

/**
 * useValidateCoupon - Mutation to validate a coupon code
 */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: ({
      code,
      promotionTier,
      price,
    }: {
      code: string;
      promotionTier: string;
      price: number;
    }) => validateCoupon(code, promotionTier, price),
  });
}

/**
 * useRefreshPromotionCoupons - Manual refresh function
 */
export function useRefreshPromotionCoupons() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: promotionCouponKeys.all,
      refetchType: 'all',
    });
  };
}
