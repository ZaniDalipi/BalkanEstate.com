import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as api from '@/services/apiService';
import { Property } from '@/types';
import { validatePaymentRedirectUrl } from '@/src/utils/security';

// === Shared Types ===

export type PromotionTier = 'featured' | 'highlight' | 'premium';
export type PromotionDuration = 7 | 15 | 30 | 60 | 90;

export interface ExtensionTierStyle {
  headerGradient: string;
  iconBg: string;
  lightBg: string;
  border: string;
  selectedBorder: string;
  text: string;
  selectedBg: string;
  tierName: string;
}

// === Shared Constants ===

export const extensionTierStyles: Record<PromotionTier, ExtensionTierStyle> = {
  featured: {
    headerGradient: 'from-violet-500 to-purple-600',
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
    lightBg: 'from-violet-50 to-purple-50',
    border: 'border-violet-200',
    selectedBorder: 'border-violet-500',
    text: 'text-violet-600',
    selectedBg: 'from-violet-100 to-purple-100',
    tierName: 'Featured',
  },
  highlight: {
    headerGradient: 'from-sky-500 to-cyan-600',
    iconBg: 'bg-gradient-to-br from-sky-400 to-cyan-500',
    lightBg: 'from-sky-50 to-cyan-50',
    border: 'border-sky-200',
    selectedBorder: 'border-sky-500',
    text: 'text-sky-600',
    selectedBg: 'from-sky-100 to-cyan-100',
    tierName: 'Highlight',
  },
  premium: {
    headerGradient: 'from-amber-500 to-yellow-500',
    iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
    lightBg: 'from-amber-50 to-yellow-50',
    border: 'border-amber-200',
    selectedBorder: 'border-amber-500',
    text: 'text-amber-600',
    selectedBg: 'from-amber-100 to-yellow-100',
    tierName: 'Premium',
  },
};

// === Props Interface ===

export interface PromotionSelectorProps {
  // Either propertyId (for existing listings) or pendingPropertyData (for new listings)
  propertyId?: string;
  pendingPropertyData?: Property;
  onSuccess?: () => void;
  onPaymentSuccess?: (promotionData: { tier: string; duration: number; hasUrgent: boolean; couponCode?: string }) => void;
  onSkip: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  initialTier?: 'featured' | 'highlight' | 'premium';
  initialDuration?: 7 | 15 | 30 | 60 | 90;
  initialCoupon?: string;
  inModal?: boolean; // When true, reduces padding for modal context
  // Extension mode
  isExtension?: boolean;
  promotionId?: string;
  currentTier?: 'featured' | 'highlight' | 'premium';
  currentEndDate?: Date;
  // Urgent badge mode - for adding urgent badge to existing promotion with upgrade options
  focusUrgent?: boolean;
  hasUrgentBadge?: boolean;
}

// === Hook ===

export function usePromotionSelector({
  propertyId,
  pendingPropertyData,
  onSuccess,
  onPaymentSuccess,
  onSkip,
  isSubmitting: externalSubmitting = false,
  initialTier,
  initialDuration = 30,
  initialCoupon = '',
  isExtension = false,
  promotionId,
  currentTier,
  currentEndDate,
  focusUrgent = false,
  hasUrgentBadge: alreadyHasUrgent = false,
}: PromotionSelectorProps) {
  const { t } = useTranslation(['payment']);
  const [tiersData, setTiersData] = useState<api.PromotionTiersResponse | null>(null);
  const [agencyAllocation, setAgencyAllocation] = useState<api.AgencyAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state - use initial values if provided
  const [selectedTier, setSelectedTier] = useState<PromotionTier | null>(
    isExtension || focusUrgent ? currentTier || null : initialTier || null
  );
  const [selectedDuration, setSelectedDuration] = useState<PromotionDuration>(initialDuration);
  // Auto-check urgent badge when in focusUrgent mode and property doesn't already have it
  const [hasUrgentBadge, setHasUrgentBadge] = useState(focusUrgent && !alreadyHasUrgent);
  // Track if user wants to upgrade tier in focusUrgent mode
  const [wantsTierUpgrade, setWantsTierUpgrade] = useState(false);
  const [useAgencyAllocation, setUseAgencyAllocation] = useState(false);
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [couponValidation, setCouponValidation] = useState<api.CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  // State to show "online payment coming soon" message
  const [showPaymentComingSoon, setShowPaymentComingSoon] = useState(false);

  // Check if promotion is expired (for focusUrgent mode)
  const isPromotionExpired = focusUrgent && currentEndDate && new Date(currentEndDate).getTime() < Date.now();

  // Load promotion tiers and agency allocation
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const tiers = await api.getPromotionTiers();
        setTiersData(tiers);

        // Try to load agency allocation (only works for agency owners)
        try {
          const allocation = await api.getAgencyAllocation();
          setAgencyAllocation(allocation.allocation);
        } catch (err) {
          // Not an agency owner, that's fine
          setAgencyAllocation(null);
        }
      } catch (err: any) {
        setError('Failed to load promotion options');
        // Error removed
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate base price
  const calculateBasePrice = (): number => {
    if (!tiersData) return 0;

    // Focus Urgent mode - just urgent badge price if no tier upgrade
    if (focusUrgent && !wantsTierUpgrade) {
      return hasUrgentBadge ? tiersData.urgentModifier.price : 0;
    }

    const tierToUse = isExtension ? currentTier : selectedTier;
    if (!tierToUse) return 0;

    const pricingEntry = tiersData.pricing.find(
      (p) => p.tierId === tierToUse && p.duration === selectedDuration
    );

    let price = pricingEntry?.price || 0;
    // Don't add urgent badge for extensions
    if (!isExtension && hasUrgentBadge) {
      price += tiersData.urgentModifier.price;
    }

    return price;
  };

  // Validate coupon when code changes
  useEffect(() => {
    const validateCouponCode = async () => {
      if (!couponCode || !selectedTier) {
        setCouponValidation(null);
        return;
      }

      setValidatingCoupon(true);
      try {
        const price = calculateBasePrice();
        const result = await api.validateCoupon(couponCode, selectedTier, price, selectedDuration);
        setCouponValidation(result);
      } catch (err: any) {
        setCouponValidation({
          isValid: false,
          discount: 0,
          discountType: 'fixed',
          discountValue: 0,
          message: err.message || 'Invalid coupon code',
        });
      } finally {
        setValidatingCoupon(false);
      }
    };

    const debounce = setTimeout(validateCouponCode, 500);
    return () => clearTimeout(debounce);
  }, [couponCode, selectedTier, selectedDuration]);

  // Calculate final price with discounts
  const calculateFinalPrice = (): { original: number; final: number; savings: number } => {
    const originalPrice = calculateBasePrice();
    let finalPrice = originalPrice;
    let savings = 0;

    // If using agency allocation, price is 0 (except urgent badge)
    if (useAgencyAllocation && selectedTier) {
      const urgentCost = hasUrgentBadge ? (tiersData?.urgentModifier.price || 0) : 0;
      finalPrice = urgentCost;
      savings = originalPrice - finalPrice;
    } else {
      // Apply agency discount if applicable
      if (agencyAllocation && agencyAllocation.plan.discountPercentage > 0) {
        const discount = (originalPrice * agencyAllocation.plan.discountPercentage) / 100;
        finalPrice = originalPrice - discount;
        savings = discount;
      }

      // Apply coupon if valid
      if (couponValidation?.isValid) {
        const couponDiscount = couponValidation.discount;
        finalPrice = Math.max(0, finalPrice - couponDiscount);
        savings += couponDiscount;
      }
    }

    return { original: originalPrice, final: finalPrice, savings };
  };

  // Check if agency allocation is available for selected tier
  const canUseAgencyAllocation = (): boolean => {
    if (isExtension) return false; // No agency allocation for extensions
    if (!agencyAllocation || !selectedTier) return false;

    const remaining = agencyAllocation.remaining;
    if (selectedTier === 'featured') return remaining.featured > 0;
    if (selectedTier === 'highlight') return remaining.highlight > 0;
    if (selectedTier === 'premium') return remaining.premium > 0;
    return false;
  };

  // Handle promotion purchase or extension
  const handlePurchase = async () => {
    if (!selectedTier && !isExtension && !focusUrgent) {
      setError('Please select a promotion tier');
      return;
    }

    // In focusUrgent mode without tier upgrade, need to have urgent badge checked
    if (focusUrgent && !wantsTierUpgrade && !hasUrgentBadge) {
      setError('Please select at least one option');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { final: finalPrice } = calculateFinalPrice();

      // Focus Urgent mode without tier upgrade - handle urgent badge
      if (focusUrgent && !wantsTierUpgrade && hasUrgentBadge && propertyId) {
        // If free (100% discount coupon), add the badge
        if (finalPrice === 0 && couponValidation?.isValid) {
          try {
            const result = await api.addUrgentBadge(promotionId || '', couponCode || undefined);
            if (result.isFree || result.success) {
              setSuccessMessage('Urgent badge added successfully!');
              setTimeout(() => onSuccess?.(), 1500);
              return;
            }
          } catch (err: any) {
            // If API fails, show friendly message
            setError(null);
            setSuccessMessage(null);
          }
        }
        // Urgent badge requires payment — let it fall through to checkout below
      }

      // If payment is required and no coupon, proceed to checkout with Paysera
      // (Free promotions with coupons also go through checkout below)

      // Free promotions (via coupon or agency allocation) can proceed

      // Extension mode - use propertyId to find active promotion
      if (isExtension && propertyId) {
        const result = await api.extendPromotion({
          propertyId,
          duration: selectedDuration,
          couponCode: couponCode || undefined,
        });

        if (result.isFree) {
          setSuccessMessage(`Promotion extended successfully! New end date: ${new Date(result.newEndDate!).toLocaleDateString('en-GB')}`);
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }

        // Payment required — redirect to Paysera checkout (validated)
        if (result.url) {
          const validatedUrl = validatePaymentRedirectUrl(result.url);
          if (validatedUrl) {
            window.location.href = validatedUrl;
          } else {
            setError(t('payment:errors.redirectBlocked', 'Payment redirect was blocked for security reasons. Please try again.'));
          }
          return;
        }

        setError('Failed to create extension payment session. Please try again.');
        return;
      }

      // If we have pendingPropertyData, we're in the new listing flow
      // Pass the promotion data back to parent to handle listing creation + promotion
      if (pendingPropertyData && onPaymentSuccess) {
        onPaymentSuccess({
          tier: selectedTier!,
          duration: selectedDuration,
          hasUrgent: hasUrgentBadge,
          couponCode: couponCode || undefined,
        });
        return; // Parent will handle the rest
      }

      // If we have propertyId, we're promoting an existing listing
      if (propertyId) {
        // If using agency allocation (free), use the direct purchase endpoint
        if (useAgencyAllocation) {
          const result = await api.purchasePromotion({
            propertyId,
            promotionTier: selectedTier!,
            duration: selectedDuration,
            hasUrgentBadge,
            useAgencyAllocation: true,
            couponCode: couponCode || undefined,
          });
          // Dispatch event so the agency page can update coupon counters immediately
          if (result?.promotionCoupons) {
            window.dispatchEvent(new CustomEvent('agency-coupon-used', {
              detail: { promotionCoupons: result.promotionCoupons },
            }));
          }
          setSuccessMessage('Promotion activated successfully!');
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }

        // For free promotions with coupon, use checkout endpoint
        const result = await api.createPromotionCheckout({
          propertyId,
          promotionTier: selectedTier!,
          duration: selectedDuration,
          hasUrgentBadge,
          couponCode: couponCode || undefined,
        });

        if (result.isFree) {
          // Promotion was free with coupon, already activated
          setSuccessMessage('Promotion activated (free with coupon)!');
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }

        // Payment required — redirect to Paysera checkout (validated)
        if (result.url) {
          const validatedUrl = validatePaymentRedirectUrl(result.url);
          if (validatedUrl) {
            window.location.href = validatedUrl;
          } else {
            setError(t('payment:errors.redirectBlocked', 'Payment redirect was blocked for security reasons. Please try again.'));
          }
          return;
        }

        setError('Failed to create payment session. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
      // Error removed
    } finally {
      setSubmitting(false);
    }
  };

  // Combined submitting state
  const isProcessing = submitting || externalSubmitting;

  // Calculate new end date for extension preview
  const calculateNewEndDate = (): Date => {
    const baseDate = currentEndDate ? new Date(currentEndDate) : new Date();
    return new Date(baseDate.getTime() + selectedDuration * 24 * 60 * 60 * 1000);
  };

  // Tier-specific styles for current mode
  const extStyle = currentTier ? extensionTierStyles[currentTier] : extensionTierStyles.featured;

  return {
    // State
    tiersData,
    agencyAllocation,
    loading,
    error,
    successMessage,
    selectedTier,
    selectedDuration,
    hasUrgentBadge,
    wantsTierUpgrade,
    useAgencyAllocation,
    couponCode,
    couponValidation,
    validatingCoupon,
    showPaymentComingSoon,
    isPromotionExpired,
    isProcessing,
    extStyle,

    // Setters
    setSelectedTier,
    setSelectedDuration,
    setHasUrgentBadge,
    setWantsTierUpgrade,
    setUseAgencyAllocation,
    setCouponCode,
    setShowPaymentComingSoon,
    setError,

    // Computed
    priceInfo: calculateFinalPrice(),
    canUseAgencyAllocation: canUseAgencyAllocation(),

    // Handlers
    handlePurchase,
    calculateNewEndDate,
  };
}
