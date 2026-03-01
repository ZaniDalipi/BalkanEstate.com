/**
 * usePromotionData - React Query hooks for real-time promotion management
 *
 * Features:
 * - Auto-refresh every 10 seconds for instant updates
 * - Optimistic updates for immediate UI feedback
 * - Cache invalidation on mutations
 * - Refetch on window focus
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Property } from '@/types';
import {
  getMyPromotions,
  addUrgentBadge,
  updateAutoExtend,
  getAutoExtendCheckout,
  cancelPromotion,
  getPromotionHistory,
  getPromotionStats,
} from '../api';

// =============================================================================
// Types
// =============================================================================

export type PromotionFilter = 'all' | 'active' | 'expired';

export interface PromotionStats {
  active: number;
  expired: number;
  total: number;
  tierCounts: Record<string, number>;
}

export interface PromotionData {
  _id: string;
  propertyId: string | { _id: string };
  tier: string;
  startDate: string;
  endDate: string;
  hasUrgentBadge: boolean;
  autoExtend: boolean;
  autoExtendPaymentPending?: boolean;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

export interface PromotionsResponse {
  promotedProperties: Property[];
  promotions: Record<string, PromotionData>;
  stats: PromotionStats;
}

// =============================================================================
// Query Keys
// =============================================================================

export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (filter: PromotionFilter) => [...promotionKeys.lists(), filter] as const,
  details: () => [...promotionKeys.all, 'detail'] as const,
  detail: (id: string) => [...promotionKeys.details(), id] as const,
  history: (propertyId: string) => [...promotionKeys.all, 'history', propertyId] as const,
  stats: (promotionId: string) => [...promotionKeys.all, 'stats', promotionId] as const,
};

// =============================================================================
// API Functions
// =============================================================================

/**
 * Build property objects directly from promotions data.
 * The GET /promotions endpoint already populates property info,
 * so we don't need to fetch all listings separately.
 */
function promotionToProperty(promo: any): Property {
  const prop = promo.propertyId || {};
  const propId = typeof prop === 'object' ? (prop.id || prop._id || '') : prop;
  const seller = prop.sellerId || {};

  return {
    id: propId,
    sellerId: typeof seller === 'object' ? (seller.id || seller._id || '') : (seller || ''),
    status: prop.status || 'active',
    title: prop.title || '',
    price: prop.price || 0,
    address: prop.address || '',
    city: prop.city || '',
    country: prop.country || '',
    propertyType: prop.propertyType || 'apartment',
    imageUrl: prop.imageUrl || (prop.images?.[0]?.url) || '',
    images: prop.images || [],
    lat: prop.lat || 0,
    lng: prop.lng || 0,
    beds: prop.beds,
    baths: prop.baths,
    sqft: prop.sqft,
    seller: {
      type: seller.role === 'agent' ? 'agent' : 'private',
      name: seller.name || '',
      phone: seller.phone || '',
      avatarUrl: seller.avatarUrl,
      agencyName: seller.agencyName,
    },
    createdAt: prop.createdAt ? new Date(prop.createdAt).getTime() : Date.now(),
    lastRenewed: prop.lastRenewed ? new Date(prop.lastRenewed).getTime() : Date.now(),
    views: prop.views || 0,
    saves: prop.saves || 0,
    inquiries: prop.inquiries || 0,
    isPromoted: promo.isActive !== false,
    promotionTier: promo.promotionTier,
    promotionStartDate: promo.startDate ? new Date(promo.startDate).getTime() : undefined,
    promotionEndDate: promo.endDate ? new Date(promo.endDate).getTime() : undefined,
    hasUrgentBadge: promo.hasUrgentBadge || false,
  } as Property;
}

async function fetchPromotionsData(): Promise<PromotionsResponse> {
  const promotionsData = await getMyPromotions();

  const promotions = promotionsData?.promotions || [];
  const promoMap: Record<string, PromotionData> = {};
  const promoted: Property[] = [];

  promotions.forEach((promo: any) => {
    const prop = promo.propertyId;
    const propId = typeof prop === 'object' ? (prop.id || prop._id || '') : (prop || '');
    if (!propId) return;

    promoMap[propId] = promo;
    promoted.push(promotionToProperty(promo));
  });

  // Calculate stats
  const now = Date.now();
  const activeProps = promoted.filter(p => p.promotionEndDate && p.promotionEndDate > now);
  const expiredProps = promoted.filter(p => !p.promotionEndDate || p.promotionEndDate <= now);

  const tierCounts: Record<string, number> = {};
  activeProps.forEach(p => {
    const tier = p.promotionTier || 'standard';
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  });

  return {
    promotedProperties: promoted,
    promotions: promoMap,
    stats: {
      active: activeProps.length,
      expired: expiredProps.length,
      total: promoted.length,
      tierCounts,
    },
  };
}

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Main hook for fetching promotions with auto-refresh
 */
export function usePromotionsQuery() {
  return useQuery({
    queryKey: promotionKeys.lists(),
    queryFn: fetchPromotionsData,
    staleTime: 15 * 1000, // Consider stale after 15 seconds
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook for fetching promotion history
 */
export function usePromotionHistory(propertyId: string | null) {
  return useQuery({
    queryKey: promotionKeys.history(propertyId || ''),
    queryFn: () => getPromotionHistory(propertyId!),
    enabled: !!propertyId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching promotion stats
 */
export function usePromotionStatsQuery(promotionId: string | null) {
  return useQuery({
    queryKey: promotionKeys.stats(promotionId || ''),
    queryFn: () => getPromotionStats(promotionId!),
    enabled: !!promotionId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Refresh stats every 30 seconds
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for adding urgent badge
 */
export function useAddUrgentBadge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promotionId: string) => addUrgentBadge(promotionId),
    onSuccess: (result) => {
      if (result.isFree) {
        // Invalidate and refetch immediately for free urgent badge
        queryClient.invalidateQueries({ queryKey: promotionKeys.all });
      }
      // If paid, user will be redirected to payment checkout
    },
  });
}

/**
 * Hook for toggling auto-extend
 */
export function useToggleAutoExtend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ promotionId, autoExtend }: { promotionId: string; autoExtend: boolean }) =>
      updateAutoExtend(promotionId, { autoExtend }),
    onSuccess: () => {
      // Invalidate promotions to refetch latest state
      queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    },
    onMutate: async ({ promotionId, autoExtend }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: promotionKeys.lists() });

      const previousData = queryClient.getQueryData<PromotionsResponse>(promotionKeys.lists());

      if (previousData) {
        const updatedPromotions = { ...previousData.promotions };
        // Find and update the promotion
        Object.keys(updatedPromotions).forEach((key) => {
          if (updatedPromotions[key]._id === promotionId) {
            updatedPromotions[key] = { ...updatedPromotions[key], autoExtend };
          }
        });

        queryClient.setQueryData<PromotionsResponse>(promotionKeys.lists(), {
          ...previousData,
          promotions: updatedPromotions,
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(promotionKeys.lists(), context.previousData);
      }
    },
  });
}

/**
 * Hook for getting auto-extend checkout URL
 */
export function useAutoExtendCheckout() {
  return useMutation({
    mutationFn: (promotionId: string) => getAutoExtendCheckout(promotionId),
  });
}

/**
 * Hook for cancelling a promotion
 */
export function useCancelPromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promotionId: string) => cancelPromotion(promotionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.all });
    },
  });
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to manually refresh promotions
 */
export function useRefreshPromotions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: promotionKeys.all });
  };
}

/**
 * Combined hook that provides all promotion data and actions
 * (For easier migration from the old usePromotions hook)
 */
export function usePromotions() {
  const { data, isLoading, error, dataUpdatedAt, refetch } = usePromotionsQuery();
  const addUrgentMutation = useAddUrgentBadge();
  const toggleAutoExtendMutation = useToggleAutoExtend();
  const autoExtendCheckoutMutation = useAutoExtendCheckout();
  const refreshPromotions = useRefreshPromotions();

  return {
    // Data
    promotedProperties: data?.promotedProperties || [],
    promotions: data?.promotions || {},
    stats: data?.stats || { active: 0, expired: 0, total: 0, tierCounts: {} },

    // Status
    isLoading,
    error: error ? String(error) : null,
    lastUpdated: dataUpdatedAt,

    // Actions
    refetch,
    refresh: refreshPromotions,

    // Mutations
    addUrgent: addUrgentMutation,
    toggleAutoExtend: toggleAutoExtendMutation,
    autoExtendCheckout: autoExtendCheckoutMutation,
  };
}

export default {
  usePromotionsQuery,
  usePromotionHistory,
  usePromotionStatsQuery,
  useAddUrgentBadge,
  useToggleAutoExtend,
  useAutoExtendCheckout,
  useCancelPromotion,
  useRefreshPromotions,
  usePromotions,
  promotionKeys,
};
