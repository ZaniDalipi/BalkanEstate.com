import React, { useState } from 'react';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import {
  usePromotionCoupons,
  useCreatePromotionCoupon,
  useDisablePromotionCoupon,
  useRefreshPromotionCoupons,
  type PromotionCoupon,
  type CreateCouponData,
} from '../hooks/usePromotionCouponData';

export type { PromotionCoupon, CreateCouponData };

export function usePromotionCouponManager() {
  const { confirm } = useConfirmation();

  // React Query hooks
  const { data, isLoading, error: queryError, dataUpdatedAt } = usePromotionCoupons();
  const createMutation = useCreatePromotionCoupon();
  const disableMutation = useDisablePromotionCoupon();
  const refreshCoupons = useRefreshPromotionCoupons();

  // Local UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');

  // Coupon duration options (in days) — aligned with subscription plans
  const COUPON_DURATION_OPTIONS = [
    { value: 1, label: '24 Hours' },
    { value: 3, label: '3 Days' },
    { value: 7, label: '1 Week' },
    { value: 14, label: '2 Weeks' },
    { value: 30, label: '1 Month' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' },
    { value: 0, label: 'Custom' },
  ] as const;

  // Form state
  const [couponDuration, setCouponDurationRaw] = useState<number>(30); // default 30 days
  const [newCoupon, setNewCoupon] = useState<CreateCouponData>({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    maxTotalUses: 100,
    maxUsesPerUser: 1,
    applicableTiers: [],
    applicableDurations: [],
    minimumPurchaseAmount: 0,
    isPublic: false,
    notes: '',
  });

  // When duration changes, auto-calculate validUntil
  const setCouponDuration = (days: number) => {
    setCouponDurationRaw(days);
    if (days > 0) {
      const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
      setNewCoupon(prev => ({ ...prev, validUntil }));
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    const validUntilDate = new Date(newCoupon.validUntil);
    if (validUntilDate <= new Date()) {
      setLocalError('Valid until date must be in the future');
      setTimeout(() => setLocalError(null), 5000);
      return;
    }

    const payload: CreateCouponData = {
      code: newCoupon.code.toUpperCase(),
      description: newCoupon.description || undefined,
      discountType: newCoupon.discountType,
      discountValue: newCoupon.discountValue,
      validFrom: new Date().toISOString(),
      validUntil: validUntilDate.toISOString(),
      maxUsesPerUser: newCoupon.maxUsesPerUser || 1,
      isPublic: newCoupon.isPublic,
      notes: newCoupon.notes || undefined,
    };

    if (newCoupon.maxTotalUses && newCoupon.maxTotalUses > 0) {
      payload.maxTotalUses = newCoupon.maxTotalUses;
    }
    if (newCoupon.minimumPurchaseAmount && newCoupon.minimumPurchaseAmount > 0) {
      payload.minimumPurchaseAmount = newCoupon.minimumPurchaseAmount;
    }
    if (newCoupon.applicableTiers && newCoupon.applicableTiers.length > 0) {
      payload.applicableTiers = newCoupon.applicableTiers;
    }
    if (newCoupon.applicableDurations && newCoupon.applicableDurations.length > 0) {
      payload.applicableDurations = newCoupon.applicableDurations;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        setSuccessMessage('Promotion coupon created successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        resetForm();
      },
      onError: (err: any) => {
        setLocalError(err.message || 'Failed to create coupon');
        setTimeout(() => setLocalError(null), 5000);
      },
    });
  };

  const handleDisableCoupon = async (id: string) => {
    const confirmed = await confirm({
      title: 'Disable Coupon',
      message: 'Are you sure you want to disable this coupon?',
      confirmLabel: 'Disable',
      cancelLabel: 'Cancel',
      type: 'warning',
    });
    if (!confirmed) return;

    disableMutation.mutate(id, {
      onSuccess: () => {
        setSuccessMessage('Coupon disabled successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (err: any) => {
        const message = err?.message || 'Failed to disable coupon';
        setLocalError(message);
        setTimeout(() => setLocalError(null), 5000);
      },
    });
  };

  const resetForm = () => {
    setCouponDurationRaw(30);
    setNewCoupon({
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      maxTotalUses: 100,
      maxUsesPerUser: 1,
      applicableTiers: [],
      applicableDurations: [],
      minimumPurchaseAmount: 0,
      isPublic: false,
      notes: '',
    });
  };

  const applyPreset = (preset: 'test100' | 'welcome' | 'seasonal') => {
    const presetDurations: Record<string, number> = {
      test100: 365,
      welcome: 180,
      seasonal: 90,
    };
    const presets: Record<string, CreateCouponData> = {
      test100: {
        code: 'TEST100',
        description: 'Test coupon - 100% off for development',
        discountType: 'percentage',
        discountValue: 100,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 1000,
        maxUsesPerUser: 100,
        applicableTiers: [],
        applicableDurations: [],
        minimumPurchaseAmount: 0,
        isPublic: false,
        notes: 'Development testing only',
      },
      welcome: {
        code: 'WELCOME15',
        description: 'Welcome bonus - 15% off first promotion',
        discountType: 'percentage',
        discountValue: 15,
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 500,
        maxUsesPerUser: 1,
        applicableTiers: [],
        applicableDurations: [],
        minimumPurchaseAmount: 0,
        isPublic: true,
        notes: 'Welcome coupon for new users',
      },
      seasonal: {
        code: 'SUMMER25',
        description: 'Summer sale - 25% off all promotions',
        discountType: 'percentage',
        discountValue: 25,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxTotalUses: 200,
        maxUsesPerUser: 3,
        applicableTiers: [],
        applicableDurations: [],
        minimumPurchaseAmount: 0,
        isPublic: true,
        notes: 'Seasonal promotion campaign',
      },
    };
    setCouponDurationRaw(presetDurations[preset]);
    setNewCoupon(presets[preset]);
  };

  const coupons = data?.coupons || [];
  const filteredCoupons = coupons.filter((coupon) => {
    if (filterStatus === 'all') return true;
    return coupon.status === filterStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastUpdated = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'highlight': return 'bg-amber-100 text-amber-800';
      case 'featured': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const error = localError || (queryError ? String(queryError) : null);

  return {
    isLoading,
    error,
    successMessage,
    isCreateModalOpen,
    setIsCreateModalOpen,
    filterStatus,
    setFilterStatus,
    newCoupon,
    setNewCoupon,
    couponDuration,
    setCouponDuration,
    COUPON_DURATION_OPTIONS,
    createMutation,
    disableMutation,
    refreshCoupons,
    dataUpdatedAt,
    filteredCoupons,
    handleCreateCoupon,
    handleDisableCoupon,
    applyPreset,
    formatDate,
    formatLastUpdated,
    getStatusColor,
    getTierBadgeColor,
  };
}
