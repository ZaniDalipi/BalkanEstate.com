import React, { useState, useEffect } from 'react';
import * as api from '../../services/apiService';
import { Property } from '../../types';

interface PromotionSelectorProps {
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
}

type PromotionTier = 'featured' | 'highlight' | 'premium';
type PromotionDuration = 7 | 15 | 30 | 60 | 90;

const PromotionSelector: React.FC<PromotionSelectorProps> = ({
  propertyId,
  pendingPropertyData,
  onSuccess,
  onPaymentSuccess,
  onSkip,
  onBack,
  isSubmitting: externalSubmitting = false,
  initialTier,
  initialDuration = 30,
  initialCoupon = '',
  inModal = false,
  isExtension = false,
  promotionId,
  currentTier,
  currentEndDate,
}) => {
  const [tiersData, setTiersData] = useState<api.PromotionTiersResponse | null>(null);
  const [agencyAllocation, setAgencyAllocation] = useState<api.AgencyAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state - use initial values if provided
  const [selectedTier, setSelectedTier] = useState<PromotionTier | null>(isExtension ? currentTier || null : initialTier || null);
  const [selectedDuration, setSelectedDuration] = useState<PromotionDuration>(initialDuration);
  const [hasUrgentBadge, setHasUrgentBadge] = useState(false);
  const [useAgencyAllocation, setUseAgencyAllocation] = useState(false);
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [couponValidation, setCouponValidation] = useState<api.CouponValidationResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

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
        console.error('Load promotion data error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
        const result = await api.validateCoupon(couponCode, selectedTier, price);
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

  // Calculate base price
  const calculateBasePrice = (): number => {
    const tierToUse = isExtension ? currentTier : selectedTier;
    if (!tiersData || !tierToUse) return 0;

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
    if (!selectedTier && !isExtension) {
      setError('Please select a promotion tier');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Extension mode - use propertyId to find active promotion
      if (isExtension && propertyId) {
        const result = await api.extendPromotion({
          propertyId,
          duration: selectedDuration,
          couponCode: couponCode || undefined,
        });

        if (result.isFree) {
          setSuccessMessage(`Promotion extended successfully! New end date: ${new Date(result.newEndDate!).toLocaleDateString()}`);
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }

        // Redirect to Stripe checkout for paid extension
        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('Failed to create extension checkout');
        }
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
          await api.purchasePromotion({
            propertyId,
            promotionTier: selectedTier!,
            duration: selectedDuration,
            hasUrgentBadge,
            useAgencyAllocation: true,
            couponCode: couponCode || undefined,
          });
          setSuccessMessage('Promotion activated successfully!');
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }

        // For paid promotions, use Stripe checkout
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

        // Redirect to Stripe checkout
        if (result.url) {
          window.location.href = result.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
      console.error('Purchase/extension error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Combined submitting state
  const isProcessing = submitting || externalSubmitting;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tiersData) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load promotion options'}</p>
        <button
          onClick={onSkip}
          className="mt-4 px-6 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
        >
          Skip for Now
        </button>
      </div>
    );
  }

  const priceInfo = calculateFinalPrice();
  const tiers = tiersData.tiers;

  return (
    <div className={inModal ? "w-full" : "max-w-7xl mx-auto px-4 sm:px-6 py-8"}>
      {/* Header Section */}
      <div className={`text-center ${inModal ? 'mb-6' : 'mb-10'}`}>
        <div className={`inline-block ${inModal ? 'p-2' : 'p-3'} bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mb-3 shadow-lg`}>
          <span className={inModal ? 'text-2xl' : 'text-4xl'}>{isExtension ? '⏰' : '🚀'}</span>
        </div>
        <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-clip-text text-transparent mb-2`}>
          {isExtension ? 'Extend Your Promotion' : 'Promote Your Listing'}
        </h2>
        <p className={`text-neutral-600 ${inModal ? 'text-sm' : 'text-base md:text-lg'} max-w-2xl mx-auto`}>
          {isExtension
            ? `Add more days to your ${currentTier} promotion. Current end date: ${currentEndDate ? new Date(currentEndDate).toLocaleDateString() : 'N/A'}`
            : 'Get up to 5x more views and inquiries with promoted placement. Choose the perfect plan for your needs.'}
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Benefits Banner */}
      <div className={`bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl ${inModal ? 'p-4 mb-5' : 'p-6 mb-8'}`}>
        <div className={`grid ${inModal ? 'grid-cols-3 gap-3' : 'md:grid-cols-3 gap-6'}`}>
          <div className="flex items-start gap-2">
            <div className={`flex-shrink-0 ${inModal ? 'w-8 h-8' : 'w-10 h-10'} bg-primary/20 rounded-lg flex items-center justify-center`}>
              <span className={inModal ? 'text-sm' : 'text-xl'}>👁️</span>
            </div>
            <div>
              <h3 className={`font-semibold text-neutral-900 ${inModal ? 'text-xs' : 'mb-1'}`}>Higher Visibility</h3>
              {!inModal && <p className="text-sm text-neutral-600">Appear at the top of search results</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className={`flex-shrink-0 ${inModal ? 'w-8 h-8' : 'w-10 h-10'} bg-primary/20 rounded-lg flex items-center justify-center`}>
              <span className={inModal ? 'text-sm' : 'text-xl'}>📱</span>
            </div>
            <div>
              <h3 className={`font-semibold text-neutral-900 ${inModal ? 'text-xs' : 'mb-1'}`}>More Inquiries</h3>
              {!inModal && <p className="text-sm text-neutral-600">Get contacted by serious buyers</p>}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className={`flex-shrink-0 ${inModal ? 'w-8 h-8' : 'w-10 h-10'} bg-primary/20 rounded-lg flex items-center justify-center`}>
              <span className={inModal ? 'text-sm' : 'text-xl'}>⚡</span>
            </div>
            <div>
              <h3 className={`font-semibold text-neutral-900 ${inModal ? 'text-xs' : 'mb-1'}`}>Sell Faster</h3>
              {!inModal && <p className="text-sm text-neutral-600">Reach buyers up to 3x faster</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Tier Selection - Only show if not in extension mode */}
      {!isExtension && (
        <div className={inModal ? 'mb-5' : 'mb-8'}>
          <h3 className={`${inModal ? 'text-base' : 'text-xl'} font-bold text-neutral-900 mb-4`}>Choose Your Plan</h3>
          <div className={`grid grid-cols-1 md:grid-cols-3 ${inModal ? 'gap-3' : 'gap-5'}`}>
            {(['featured', 'highlight', 'premium'] as PromotionTier[]).map((tierId) => {
              const tier = tiers[tierId];
              const isSelected = selectedTier === tierId;
              const pricing = tiersData.pricing.find(
                (p) => p.tierId === tierId && p.duration === selectedDuration
              );

              // Tier-specific styling
              const tierStyles = {
                featured: {
                  gradient: 'from-violet-50 to-purple-50',
                  border: isSelected ? 'border-violet-500' : 'border-violet-200',
                  shadow: isSelected ? 'shadow-[0_0_20px_rgba(124,58,237,0.3)]' : '',
                  iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
                  checkmark: 'text-violet-500',
                  badge: 'bg-violet-500',
                },
                highlight: {
                  gradient: 'from-sky-50 to-cyan-50',
                  border: isSelected ? 'border-sky-500' : 'border-sky-200',
                  shadow: isSelected ? 'shadow-[0_0_20px_rgba(14,165,233,0.3)]' : '',
                  iconBg: 'bg-gradient-to-br from-sky-400 to-cyan-500',
                  checkmark: 'text-sky-500',
                  badge: 'bg-sky-500',
                },
                premium: {
                  gradient: 'from-amber-50 to-yellow-50',
                  border: isSelected ? 'border-amber-500' : 'border-amber-200',
                  shadow: isSelected ? 'shadow-[0_0_20px_rgba(245,158,11,0.3)]' : '',
                  iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
                  checkmark: 'text-amber-500',
                  badge: 'bg-gradient-to-r from-amber-500 to-yellow-500',
                },
              };

              const style = tierStyles[tierId];

              return (
                <button
                  key={tierId}
                  onClick={() => setSelectedTier(tierId)}
                  className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 bg-gradient-to-br ${style.gradient} ${style.border} ${style.shadow} hover:scale-[1.02] ${isSelected ? 'scale-[1.02]' : ''}`}
                >
                  {tier.highlight && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${style.badge} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg`}>
                      ✨ Most Popular
                    </div>
                  )}

                  <div className="text-center mb-4 pt-2">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${style.iconBg} rounded-2xl shadow-lg mb-3`}>
                      <span className="text-2xl filter drop-shadow">
                        {tierId === 'featured' && '⭐'}
                        {tierId === 'highlight' && '💎'}
                        {tierId === 'premium' && '👑'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-gray-900">€{pricing?.price || 0}</span>
                      <span className="text-sm text-gray-500">/{selectedDuration} days</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 text-center min-h-[40px]">{tier.description}</p>

                  <ul className="space-y-2">
                    {tier.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className={`${style.checkmark} font-bold mt-0.5`}>✓</span>
                        <span>{typeof feature === 'string' ? feature : feature.name}</span>
                      </li>
                    ))}
                  </ul>

                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className={`w-7 h-7 ${style.iconBg} rounded-full flex items-center justify-center shadow-md`}>
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(selectedTier || isExtension) && (
        <>
          {/* Duration Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">⏱️</span>
              {isExtension ? 'Add Days to Promotion' : 'Select Duration'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {([7, 15, 30, 60, 90] as PromotionDuration[]).map((duration) => {
                const isSelected = selectedDuration === duration;
                const tierToUse = isExtension ? currentTier : selectedTier;
                const pricing = tiersData.pricing.find(
                  (p) => p.tierId === tierToUse && p.duration === duration
                );

                return (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`p-3 rounded-xl border-2 transition-all text-sm ${
                      isSelected
                        ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 text-gray-900 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-bold">{duration} days</div>
                    <div className={`text-xs font-semibold mt-1 ${isSelected ? 'text-primary' : 'text-gray-500'}`}>€{pricing?.price || 0}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgent Badge - Hide for extensions */}
          {!isExtension && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 p-5 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasUrgentBadge}
                  onChange={(e) => setHasUrgentBadge(e.target.checked)}
                  className="mt-1 w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">
                      {tiersData.urgentModifier.name}
                    </span>
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                      🔥 Urgent
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      +€{tiersData.urgentModifier.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {tiersData.urgentModifier.description}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Agency Allocation - Hide for extensions */}
          {!isExtension && agencyAllocation && canUseAgencyAllocation() && (
            <div className="bg-neutral-50 rounded-lg border border-neutral-200 p-5 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAgencyAllocation}
                  onChange={(e) => setUseAgencyAllocation(e.target.checked)}
                  className="mt-1 w-4 h-4 text-neutral-800 border-neutral-300 rounded focus:ring-neutral-800"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-neutral-800">
                      Use Agency Allocation
                    </span>
                    <span className="bg-green-600 text-white text-xs font-medium px-2 py-0.5 rounded">
                      Free
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">
                    Your {agencyAllocation.plan.planName} plan includes monthly promotions. Use one of your remaining {selectedTier} slots this month.
                  </p>
                  <div className="flex gap-3 text-xs text-neutral-700">
                    <div>
                      Featured: {agencyAllocation.remaining.featured}/{agencyAllocation.plan.monthlyFeaturedAds}
                    </div>
                    <div>
                      Highlight: {agencyAllocation.remaining.highlight}/{agencyAllocation.plan.monthlyHighlightAds}
                    </div>
                    <div>
                      Premium: {agencyAllocation.remaining.premium}/{agencyAllocation.plan.monthlyPremiumAds}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Coupon Code */}
          {!useAgencyAllocation && (
            <div className="bg-white rounded-lg border border-neutral-200 p-5 mb-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">Coupon Code</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:border-neutral-800"
                />
                {validatingCoupon && (
                  <div className="flex items-center px-3 py-2 text-neutral-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-800"></div>
                  </div>
                )}
              </div>
              {couponValidation && (
                <div
                  className={`mt-2 p-2 rounded text-xs ${
                    couponValidation.isValid
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {couponValidation.isValid ? (
                    <span>
                      Coupon applied! You save €{couponValidation.discount.toFixed(2)}
                    </span>
                  ) : (
                    <span>{couponValidation.message}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Price Summary */}
          <div className="bg-neutral-50 rounded-lg border border-neutral-300 p-5 mb-6">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              {priceInfo.original !== priceInfo.final && (
                <div className="flex justify-between text-neutral-600">
                  <span>Original Price:</span>
                  <span className="line-through">€{priceInfo.original.toFixed(2)}</span>
                </div>
              )}
              {priceInfo.savings > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Savings:</span>
                  <span>-€{priceInfo.savings.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-neutral-900 pt-2 border-t border-neutral-300">
                <span>Total:</span>
                <span>
                  €{priceInfo.final.toFixed(2)}
                  {useAgencyAllocation && priceInfo.final === 0 && (
                    <span className="text-sm text-green-600 ml-2 font-normal">(Free)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onBack && (
              <button
                onClick={onBack}
                disabled={isProcessing}
                className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 shadow-sm"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onSkip}
              disabled={isProcessing}
              className="px-6 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 shadow-sm"
            >
              {isExtension ? 'Cancel' : pendingPropertyData ? 'Post Without Promotion' : 'Skip for Now'}
            </button>
            <button
              onClick={handlePurchase}
              disabled={isProcessing || successMessage !== null}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {isExtension ? 'Extending...' : pendingPropertyData ? 'Creating Listing...' : 'Processing...'}
                </span>
              ) : successMessage ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Success!
                </span>
              ) : (
                isExtension
                  ? `Extend +${selectedDuration} days - €${priceInfo.final.toFixed(2)}`
                  : `Continue - €${priceInfo.final.toFixed(2)}`
              )}
            </button>
          </div>
        </>
      )}

      {!selectedTier && !isExtension && (
        <div className="text-center space-y-3">
          {onBack && (
            <button
              onClick={onBack}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors mr-3 disabled:opacity-50"
            >
              ← Back to Form
            </button>
          )}
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {pendingPropertyData ? 'Post Without Promotion' : 'Skip for Now'}
          </button>
          {pendingPropertyData && (
            <p className="text-xs text-neutral-500 mt-2">
              You can promote your listing anytime from your dashboard
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionSelector;
