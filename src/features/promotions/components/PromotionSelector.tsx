import React, { useState, useEffect } from 'react';
import * as api from '@/services/apiService';
import { Property } from '@/types';
import { RocketLaunchIcon, EyeIcon, ChatBubbleLeftRightIcon, BoltIcon, StarIconSolid, ClockIcon, FireIcon } from '@/constants';

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
  // Urgent badge mode - for adding urgent badge to existing promotion with upgrade options
  focusUrgent?: boolean;
  hasUrgentBadge?: boolean;
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
  focusUrgent = false,
  hasUrgentBadge: alreadyHasUrgent = false,
}) => {
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

      // PAYMENTS COMING SOON - If payment is required, show info message
      if (finalPrice > 0) {
        setSuccessMessage('Payments coming soon! Please contact sales@balkanestateai.com to promote your listing manually.');
        setSubmitting(false);
        return;
      }

      // Focus Urgent mode without tier upgrade - just add urgent badge (free with coupon)
      if (focusUrgent && !wantsTierUpgrade && hasUrgentBadge && propertyId) {
        // This path is for free urgent badge (100% coupon)
        const result = await api.addUrgentBadge(promotionId || '');
        if (result.isFree) {
          setSuccessMessage('Urgent badge added successfully!');
          setTimeout(() => onSuccess?.(), 1500);
          return;
        }
        // If not free, show coming soon message (already handled above)
        return;
      }

      // Free promotions (via coupon or agency allocation) can proceed

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

        // Payment required but payments coming soon
        setSuccessMessage('Payments coming soon! Please contact sales@balkanestateai.com to extend your promotion manually.');
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

        // Payment required but payments coming soon
        setSuccessMessage('Payments coming soon! Please contact sales@balkanestateai.com to promote your listing manually.');
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

  // Tier-specific colors for extension mode
  const extensionTierStyles = {
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

  const extStyle = currentTier ? extensionTierStyles[currentTier] : extensionTierStyles.featured;

  // Calculate new end date for extension preview
  const calculateNewEndDate = (): Date => {
    const baseDate = currentEndDate ? new Date(currentEndDate) : new Date();
    return new Date(baseDate.getTime() + selectedDuration * 24 * 60 * 60 * 1000);
  };

  return (
    <div className={inModal ? "w-full px-4 sm:px-6 pt-8 pb-4" : "max-w-7xl mx-auto px-4 sm:px-6 py-8"}>
      {/* Header Section - Enhanced for Extension Mode and Urgent Badge Mode */}
      {focusUrgent ? (
        <div className={`text-center ${inModal ? 'mb-6' : 'mb-10'}`}>
          {/* Urgent Badge Mode Header */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold mb-4 shadow-lg">
            <FireIcon className="w-4 h-4" />
            <span>Add Urgent Badge</span>
          </div>

          <div className="inline-block p-3 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl mb-4 shadow-xl">
            <FireIcon className="w-8 h-8 text-white" />
          </div>

          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold text-gray-900 mb-3`}>
            {alreadyHasUrgent ? 'Upgrade Your Promotion' : 'Add Urgent Badge'}
          </h2>

          <p className={`text-neutral-600 ${inModal ? 'text-sm' : 'text-base'} max-w-xl mx-auto mb-4`}>
            {alreadyHasUrgent
              ? 'Your listing already has an urgent badge. Would you like to upgrade to a higher tier for more visibility?'
              : 'Get a flashing urgent badge on your listing to attract more buyers and sell faster.'}
          </p>

          {/* Current Tier Display */}
          {currentTier && (
            <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${extensionTierStyles[currentTier].lightBg} border ${extensionTierStyles[currentTier].border} rounded-xl px-5 py-3 shadow-sm`}>
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Current Plan</p>
                <p className={`text-lg font-bold ${extensionTierStyles[currentTier].text}`}>
                  {extensionTierStyles[currentTier].tierName}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : isExtension ? (
        <div className={`text-center ${inModal ? 'mb-6' : 'mb-10'}`}>
          {/* Tier Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${extStyle.headerGradient} text-white text-sm font-semibold mb-4 shadow-lg`}>
            <StarIconSolid className="w-4 h-4" />
            <span>{extStyle.tierName} Promotion</span>
          </div>

          <div className={`inline-block p-3 ${extStyle.iconBg} rounded-2xl mb-4 shadow-xl`}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold text-gray-900 mb-3`}>
            Extend Your Promotion
          </h2>

          {/* Current Status Card */}
          <div className={`inline-flex items-center gap-4 bg-gradient-to-r ${extStyle.lightBg} border ${extStyle.border} rounded-xl px-5 py-3 shadow-sm`}>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Current End Date</p>
              <p className="text-lg font-bold text-gray-900">
                {currentEndDate ? new Date(currentEndDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : 'N/A'}
              </p>
            </div>
            <div className={`w-px h-10 bg-gradient-to-b ${extStyle.headerGradient}`}></div>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">New End Date</p>
              <p className={`text-lg font-bold ${extStyle.text}`}>
                {calculateNewEndDate().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`text-center ${inModal ? 'mb-6' : 'mb-10'}`}>
          <div className={`inline-flex items-center justify-center ${inModal ? 'w-12 h-12' : 'w-16 h-16'} bg-gradient-to-br from-primary to-primary-dark rounded-full mb-3 shadow-lg`}>
            <RocketLaunchIcon className={`${inModal ? 'w-6 h-6' : 'w-8 h-8'} text-white`} />
          </div>
          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-clip-text text-transparent mb-2`}>
            Promote Your Listing
          </h2>
          <p className={`text-neutral-600 ${inModal ? 'text-sm' : 'text-base md:text-lg'} max-w-2xl mx-auto`}>
            Get up to 5x more views and inquiries with promoted placement. Choose the perfect plan for your needs.
          </p>
        </div>
      )}

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

      {/* Benefits Banner - Elegant centered design */}
      <div className={`${isExtension
        ? `bg-gradient-to-r ${extStyle.lightBg} border ${extStyle.border}`
        : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 border border-slate-200/60'
      } rounded-2xl ${inModal ? 'px-6 py-5 mb-6' : 'px-8 py-7 mb-10'} shadow-sm`}>
        <div className={`flex justify-center ${inModal ? 'gap-8' : 'gap-12 md:gap-16'}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-amber-400 to-orange-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <EyeIcon className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>Higher Visibility</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">Top of search results</p>}
          </div>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-blue-400 to-indigo-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <ChatBubbleLeftRightIcon className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>More Inquiries</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">Serious buyer contacts</p>}
          </div>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-emerald-400 to-teal-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <BoltIcon className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>Sell Faster</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">3x faster results</p>}
          </div>
        </div>
      </div>

      {/* Focus Urgent Mode - Urgent Badge + Optional Tier Upgrade */}
      {focusUrgent && (
        <div className={inModal ? 'mb-5' : 'mb-8'}>
          {/* Urgent Badge Section - Only show if doesn't already have urgent badge */}
          {!alreadyHasUrgent && tiersData && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200 p-5 mb-4 shadow-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasUrgentBadge}
                  onChange={(e) => setHasUrgentBadge(e.target.checked)}
                  className="mt-1 w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-gray-800">
                      {tiersData.urgentModifier.name}
                    </span>
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse inline-flex items-center gap-1">
                      <FireIcon className="w-3 h-3" /> Urgent
                    </span>
                    <span className="text-base font-bold text-red-600">
                      €{tiersData.urgentModifier.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {tiersData.urgentModifier.description}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Tier Upgrade Option */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg flex items-center justify-center">
                  <StarIconSolid className="w-4 h-4 text-white" />
                </span>
                Upgrade Your Plan?
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">Show upgrade options</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={wantsTierUpgrade}
                    onChange={(e) => setWantsTierUpgrade(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </div>
              </label>
            </div>

            {!wantsTierUpgrade ? (
              <p className="text-sm text-gray-500">
                You're currently on the <span className="font-semibold">{currentTier ? extensionTierStyles[currentTier].tierName : 'Standard'}</span> plan.
                {currentTier !== 'premium' && ' Enable upgrade options to boost your listing with a higher tier.'}
              </p>
            ) : (
              /* Show Tier Selection when upgrade is wanted */
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 mt-4`}>
                {(['featured', 'highlight', 'premium'] as PromotionTier[]).map((tierId) => {
                  const tier = tiers[tierId];
                  const isSelected = selectedTier === tierId;
                  const isCurrent = currentTier === tierId;
                  const isUpgrade = currentTier ? ['featured', 'highlight', 'premium'].indexOf(tierId) > ['featured', 'highlight', 'premium'].indexOf(currentTier) : true;
                  const pricing = tiersData?.pricing.find(
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
                      className={`relative p-4 rounded-xl border-2 text-left transition-all duration-300 bg-gradient-to-br ${style.gradient} ${style.border} ${style.shadow} hover:scale-[1.02] ${isSelected ? 'scale-[1.02]' : ''}`}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Current
                        </div>
                      )}
                      {isUpgrade && !isCurrent && (
                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${style.badge} text-white text-xs font-bold px-3 py-1 rounded-full`}>
                          Upgrade
                        </div>
                      )}

                      <div className="text-center pt-2">
                        <div className={`inline-flex items-center justify-center w-12 h-12 ${style.iconBg} rounded-xl shadow-lg mb-2`}>
                          {tierId === 'featured' && <StarIconSolid className="w-6 h-6 text-white" />}
                          {tierId === 'highlight' && (
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L9.5 9.5H2L8 14L5.5 22L12 17L18.5 22L16 14L22 9.5H14.5L12 2Z" />
                            </svg>
                          )}
                          {tierId === 'premium' && (
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
                            </svg>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          {tier.name}
                        </h3>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-xl font-bold text-gray-900">€{pricing?.price || 0}</span>
                          <span className="text-xs text-gray-500">/{selectedDuration}d</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className={`w-6 h-6 ${style.iconBg} rounded-full flex items-center justify-center shadow-md`}>
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tier Selection - Only show if not in extension mode and not in focusUrgent mode */}
      {!isExtension && !focusUrgent && (
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
                      Most Popular
                    </div>
                  )}

                  <div className="text-center mb-4 pt-2">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${style.iconBg} rounded-2xl shadow-lg mb-3`}>
                      {tierId === 'featured' && <StarIconSolid className="w-7 h-7 text-white" />}
                      {tierId === 'highlight' && (
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L9.5 9.5H2L8 14L5.5 22L12 17L18.5 22L16 14L22 9.5H14.5L12 2Z" />
                        </svg>
                      )}
                      {tierId === 'premium' && (
                        <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
                        </svg>
                      )}
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

      {(selectedTier || isExtension || focusUrgent) && (
        <>
          {/* Duration Selection - Enhanced for Extension */}
          <div className={`bg-white rounded-xl border ${isExtension ? extStyle.border : 'border-gray-200'} p-5 mb-4 shadow-sm`}>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className={`w-8 h-8 ${isExtension ? extStyle.iconBg : 'bg-primary/10'} rounded-lg flex items-center justify-center`}>
                <ClockIcon className={`w-4 h-4 ${isExtension ? 'text-white' : 'text-primary'}`} />
              </span>
              {isExtension ? 'Choose Extension Duration' : 'Select Duration'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {([7, 15, 30, 60, 90] as PromotionDuration[]).map((duration) => {
                const isSelected = selectedDuration === duration;
                const tierToUse = isExtension ? currentTier : selectedTier;
                const pricing = tiersData.pricing.find(
                  (p) => p.tierId === tierToUse && p.duration === duration
                );

                // Dynamic border and background colors based on tier for extension mode
                const durationStyle = isExtension && isSelected
                  ? `${extStyle.selectedBorder} bg-gradient-to-br ${extStyle.selectedBg} shadow-md`
                  : isSelected
                    ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';

                return (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`p-3 rounded-xl border-2 transition-all text-sm ${durationStyle} text-gray-900`}
                  >
                    <div className="font-bold">{duration} days</div>
                    <div className={`text-xs font-semibold mt-1 ${
                      isSelected
                        ? isExtension ? extStyle.text : 'text-primary'
                        : 'text-gray-500'
                    }`}>
                      €{pricing?.price || 0}
                    </div>
                    {isExtension && isSelected && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        +{duration} days
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgent Badge - Hide for extensions and focusUrgent mode (has its own section) */}
          {!isExtension && !focusUrgent && (
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
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse inline-flex items-center gap-1">
                      <FireIcon className="w-3 h-3" /> Urgent
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

          {/* Agency Allocation - Hide for extensions and focusUrgent mode */}
          {!isExtension && !focusUrgent && agencyAllocation && canUseAgencyAllocation() && (
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

          {/* Price Summary - Enhanced for Extension and Urgent Mode */}
          <div className={`rounded-xl border p-5 mb-6 ${
            focusUrgent
              ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
              : isExtension
                ? `bg-gradient-to-br ${extStyle.lightBg} ${extStyle.border}`
                : 'bg-neutral-50 border-neutral-300'
          }`}>
            <h3 className="text-sm font-semibold text-neutral-800 mb-3 flex items-center gap-2">
              {focusUrgent && <FireIcon className="w-4 h-4 text-red-500" />}
              {isExtension && <StarIconSolid className="w-4 h-4 text-current" />}
              {focusUrgent ? 'Urgent Badge Summary' : isExtension ? 'Extension Summary' : 'Summary'}
            </h3>
            <div className="space-y-2 text-sm">
              {isExtension && (
                <div className="flex justify-between text-gray-600">
                  <span>Duration:</span>
                  <span className="font-semibold">+{selectedDuration} days</span>
                </div>
              )}
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
              <div className={`flex justify-between text-lg font-bold text-neutral-900 pt-3 border-t ${
                isExtension ? extStyle.border : 'border-neutral-300'
              }`}>
                <span>Total:</span>
                <span className={isExtension ? extStyle.text : ''}>
                  €{priceInfo.final.toFixed(2)}
                  {useAgencyAllocation && priceInfo.final === 0 && (
                    <span className="text-sm text-green-600 ml-2 font-normal">(Free)</span>
                  )}
                  {isExtension && priceInfo.final === 0 && !useAgencyAllocation && couponValidation?.isValid && (
                    <span className="text-sm text-green-600 ml-2 font-normal">(Free with coupon)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons - Enhanced for Extension */}
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
              className={`px-6 py-3.5 bg-white border text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm ${
                isExtension || focusUrgent
                  ? `${extStyle?.border || 'border-gray-200'} hover:bg-gray-50`
                  : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {isExtension || focusUrgent ? 'Cancel' : pendingPropertyData ? 'Post Without Promotion' : 'Skip for Now'}
            </button>
            <button
              onClick={handlePurchase}
              disabled={isProcessing || successMessage !== null}
              className={`flex-1 px-6 py-3.5 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                focusUrgent
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : isExtension
                    ? `bg-gradient-to-r ${extStyle.headerGradient}`
                    : 'bg-gradient-to-r from-primary to-primary-dark'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {focusUrgent ? 'Processing...' : isExtension ? 'Extending...' : pendingPropertyData ? 'Creating Listing...' : 'Processing...'}
                </span>
              ) : successMessage ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Success!
                </span>
              ) : focusUrgent ? (
                <span className="flex items-center justify-center gap-2">
                  <FireIcon className="w-4 h-4" />
                  {wantsTierUpgrade
                    ? `Upgrade & Add Urgent - €${priceInfo.final.toFixed(2)}`
                    : `Add Urgent Badge - €${priceInfo.final.toFixed(2)}`}
                </span>
              ) : isExtension ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                  </svg>
                  Extend +{selectedDuration} days - €{priceInfo.final.toFixed(2)}
                </span>
              ) : (
                `Continue - €${priceInfo.final.toFixed(2)}`
              )}
            </button>
          </div>
        </>
      )}

      {!selectedTier && !isExtension && !focusUrgent && (
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
