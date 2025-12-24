/**
 * usePromotions Hook
 * Handles fetching and managing promotion data
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Property } from '../types';
import * as api from '../services/apiService';

export type PromotionFilter = 'all' | 'active' | 'expired';

export interface PromotionStats {
  active: number;
  expired: number;
  total: number;
  tierCounts: Record<string, number>;
}

export interface UsePromotionsReturn {
  promotedProperties: Property[];
  promotions: Record<string, any>;
  filteredProperties: Property[];
  stats: PromotionStats;
  isLoading: boolean;
  error: string | null;
  filter: PromotionFilter;
  setFilter: (filter: PromotionFilter) => void;
  refetch: () => Promise<void>;
  updatePromotion: (propertyId: string, updates: any) => void;
}

export const usePromotions = (): UsePromotionsReturn => {
  const [promotedProperties, setPromotedProperties] = useState<Property[]>([]);
  const [promotions, setPromotions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PromotionFilter>('active');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listings, promotionsData] = await Promise.all([
        api.getMyListings(),
        api.getMyPromotions(),
      ]);

      const promoted = listings.filter((p: Property) => p.isPromoted);
      setPromotedProperties(promoted);

      const promoMap: Record<string, any> = {};
      if (promotionsData?.promotions) {
        promotionsData.promotions.forEach((promo: any) => {
          const propId = promo.propertyId?._id || promo.propertyId;
          if (propId) {
            promoMap[propId] = promo;
          }
        });
      }
      setPromotions(promoMap);
    } catch (err: any) {
      console.error('Failed to fetch promoted properties:', err);
      setError(err.message || 'Failed to fetch promotions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProperties = useMemo(() => {
    const now = Date.now();
    return promotedProperties.filter(p => {
      if (filter === 'active') {
        return p.promotionEndDate && p.promotionEndDate > now;
      }
      if (filter === 'expired') {
        return !p.promotionEndDate || p.promotionEndDate <= now;
      }
      return true;
    });
  }, [promotedProperties, filter]);

  const stats = useMemo((): PromotionStats => {
    const now = Date.now();
    const active = promotedProperties.filter(p => p.promotionEndDate && p.promotionEndDate > now);
    const expired = promotedProperties.filter(p => !p.promotionEndDate || p.promotionEndDate <= now);

    const tierCounts: Record<string, number> = {};
    active.forEach(p => {
      const tier = p.promotionTier || 'standard';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    return { active: active.length, expired: expired.length, total: promotedProperties.length, tierCounts };
  }, [promotedProperties]);

  const updatePromotion = useCallback((propertyId: string, updates: any) => {
    setPromotions(prev => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], ...updates },
    }));
  }, []);

  return {
    promotedProperties,
    promotions,
    filteredProperties,
    stats,
    isLoading,
    error,
    filter,
    setFilter,
    refetch: fetchData,
    updatePromotion,
  };
};

/**
 * usePromotionActions Hook
 * Handles promotion-related actions
 */
export interface UsePromotionActionsReturn {
  actionLoading: string | null;
  handleAddUrgent: (promotionId: string) => Promise<void>;
  handleToggleAutoExtend: (promotionId: string, autoExtend: boolean, onSuccess?: () => void) => Promise<void>;
  handleCompleteAutoExtend: (promotionId: string) => Promise<void>;
}

export const usePromotionActions = (): UsePromotionActionsReturn => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAddUrgent = useCallback(async (promotionId: string) => {
    try {
      setActionLoading(promotionId);
      const result = await api.addUrgentBadge(promotionId);
      if (result.isFree) {
        window.location.reload();
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      console.error('Failed to add urgent badge:', error);
      alert(error.message || 'Failed to add urgent badge');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleToggleAutoExtend = useCallback(async (
    promotionId: string,
    autoExtend: boolean,
    onSuccess?: () => void
  ) => {
    try {
      await api.updateAutoExtend(promotionId, { autoExtend });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to update auto-extend:', error);
      alert(error.message || 'Failed to update auto-extend');
    }
  }, []);

  const handleCompleteAutoExtend = useCallback(async (promotionId: string) => {
    try {
      setActionLoading(promotionId);
      const result = await api.getAutoExtendCheckout(promotionId);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        alert('No pending auto-extend checkout found');
      }
    } catch (error: any) {
      console.error('Failed to complete auto-extend:', error);
      alert(error.message || 'Failed to get auto-extend checkout');
    } finally {
      setActionLoading(null);
    }
  }, []);

  return {
    actionLoading,
    handleAddUrgent,
    handleToggleAutoExtend,
    handleCompleteAutoExtend,
  };
};
