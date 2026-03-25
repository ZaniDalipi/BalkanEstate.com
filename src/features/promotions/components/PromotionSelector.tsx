import React from 'react';
import { useTranslation } from 'react-i18next';
import { RocketLaunchIcon, EyeIconSolid, ChatBubbleLeftRightIconSolid, BoltIconSolid, StarIconSolid, FireIcon } from '@/constants';
import { usePromotionSelector, extensionTierStyles } from './usePromotionSelector';
import type { PromotionSelectorProps, PromotionTier } from './usePromotionSelector';
import PromotionTierCard from './PromotionTierCard';
import PromotionDurationPicker from './PromotionDurationPicker';
import PromotionSummary from './PromotionSummary';
import BraintreeDropIn from '@/features/payments/components/BraintreeDropIn';
import { useAppContext } from '@/context/AppContext';

const PromotionSelector: React.FC<PromotionSelectorProps> = (props) => {
  const {
    onSkip,
    onBack,
    inModal = false,
    isExtension = false,
    currentTier,
    currentEndDate,
    focusUrgent = false,
    hasUrgentBadge: alreadyHasUrgent = false,
    pendingPropertyData,
  } = props;

  const { state } = useAppContext();
  const userCountry = (state.currentUser as any)?.country?.toUpperCase() || 'GR';

  const {
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
    showBraintreeDropIn,
    braintreePaymentData,
    isPromotionExpired,
    isProcessing,
    extStyle,
    setSelectedTier,
    setSelectedDuration,
    setHasUrgentBadge,
    setWantsTierUpgrade,
    setUseAgencyAllocation,
    setCouponCode,
    setShowPaymentComingSoon,
    priceInfo,
    canUseAgencyAllocation,
    handlePurchase,
    handleBraintreeSuccess,
    handleBraintreeCancel,
    calculateNewEndDate,
  } = usePromotionSelector(props);

  const { t } = useTranslation(['common']);

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
        <p className="text-red-600">{error || t('common:promotions.failedToLoad')}</p>
        <button
          onClick={onSkip}
          className="mt-4 px-6 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300"
        >
          {t('common:promotions.skipForNow')}
        </button>
      </div>
    );
  }

  const tiers = tiersData.tiers;

  return (
    <div className={inModal ? "w-full px-4 sm:px-6 pt-4 sm:pt-6 lg:pt-8 pb-4" : "max-w-7xl mx-auto px-4 sm:px-6 py-8"}>
      {/* Header Section - Enhanced for Extension Mode and Urgent Badge Mode */}
      {focusUrgent ? (
        <div className={`text-center ${inModal ? 'mb-6' : 'mb-10'}`}>
          {/* Urgent Badge Mode Header */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold mb-4 shadow-lg">
            <FireIcon className="w-4 h-4" />
            <span>{t('common:promotions.addUrgentBadge')}</span>
          </div>

          <div className="inline-block p-3 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl mb-4 shadow-xl">
            <FireIcon className="w-8 h-8 text-white" />
          </div>

          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold text-gray-900 mb-3`}>
            {alreadyHasUrgent ? t('common:promotions.upgradePromotion') : t('common:promotions.addUrgentBadge')}
          </h2>

          <p className={`text-neutral-600 ${inModal ? 'text-sm' : 'text-base'} max-w-xl mx-auto mb-4`}>
            {alreadyHasUrgent
              ? t('common:promotions.alreadyHasUrgentDescription')
              : t('common:promotions.urgentBadgeDescription')}
          </p>

          {/* Current Tier Display */}
          {currentTier && (
            <div className={`inline-flex items-center gap-3 bg-gradient-to-r ${extensionTierStyles[currentTier].lightBg} border ${extensionTierStyles[currentTier].border} rounded-xl px-5 py-3 shadow-sm`}>
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t('common:promotions.currentPlan')}</p>
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
            <span>{extStyle.tierName} {t('common:promotions.promotion')}</span>
          </div>

          <div className={`inline-block p-3 ${extStyle.iconBg} rounded-2xl mb-4 shadow-xl`}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold text-gray-900 mb-3`}>
            {t('common:promotions.extendPromotion')}
          </h2>

          {/* Current Status Card */}
          <div className={`inline-flex items-center gap-4 bg-gradient-to-r ${extStyle.lightBg} border ${extStyle.border} rounded-xl px-5 py-3 shadow-sm`}>
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t('common:promotions.currentEndDate')}</p>
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
              <p className="text-xs text-gray-500 uppercase tracking-wide">{t('common:promotions.newEndDate')}</p>
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
        <div className={`text-center ${inModal ? 'mb-3 sm:mb-6' : 'mb-10'}`}>
          <div className={`inline-flex items-center justify-center ${inModal ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-16 h-16'} bg-gradient-to-br from-primary to-primary-dark rounded-full mb-2 sm:mb-3 shadow-lg`}>
            <RocketLaunchIcon className={`${inModal ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-8 h-8'} text-white`} />
          </div>
          <h2 className={`${inModal ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 bg-clip-text text-transparent mb-2`}>
            {t('common:promotions.promoteYourListing')}
          </h2>
          <p className={`text-neutral-600 ${inModal ? 'text-sm' : 'text-base md:text-lg'} max-w-2xl mx-auto`}>
            {t('common:promotions.description')}
          </p>
        </div>
      )}

      {/* Expired Promotion Message - For focusUrgent mode when promotion has expired */}
      {focusUrgent && isPromotionExpired && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-xl mb-6 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold mb-1">{t('common:promotions.promotionExpired')}</p>
              <p className="text-amber-700 mb-3">{t('common:promotions.promotionExpiredDescription')}</p>
              <button
                onClick={onSkip}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                {t('common:promotions.closeAndExtend')}
              </button>
            </div>
          </div>
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

      {error && !isPromotionExpired && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Braintree Inline Payment */}
      {showBraintreeDropIn && braintreePaymentData && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-1">{t('common:promotions.completePayment', 'Complete Payment')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            {t('common:promotions.securePayment', 'Your payment is secured by Braintree.')}
          </p>
          <BraintreeDropIn
            amount={braintreePaymentData.amount}
            productId={braintreePaymentData.productId}
            planName={braintreePaymentData.planName}
            planInterval="one_time"
            countryCode={userCountry}
            onSuccess={handleBraintreeSuccess}
            onError={(msg) => { setError(msg); handleBraintreeCancel(); }}
            onCancel={handleBraintreeCancel}
          />
        </div>
      )}

      {/* Online Payment Coming Soon Banner */}
      {showPaymentComingSoon && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-5 py-4 rounded-xl mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 mb-1">{t('common:promotions.paymentComingSoon')}</p>
              <p className="text-blue-700 text-sm mb-3">
                {t('common:promotions.paymentComingSoonDescription')}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setShowPaymentComingSoon(false);
                    // Focus on coupon input
                    const couponInput = document.querySelector('input[placeholder="Enter code"]') as HTMLInputElement;
                    if (couponInput) {
                      couponInput.focus();
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  {t('common:promotions.iHaveCoupon')}
                </button>
                <button
                  onClick={onSkip}
                  className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors text-sm border border-gray-200"
                >
                  {t('common:promotions.maybeLater')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hide the rest of the form if promotion is expired in focusUrgent mode */}
      {(!focusUrgent || !isPromotionExpired) && (
      <>
      {/* Benefits Banner - Elegant centered design */}
      <div className={`${isExtension
        ? `bg-gradient-to-r ${extStyle.lightBg} border ${extStyle.border}`
        : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 border border-slate-200/60'
      } rounded-2xl ${inModal ? 'px-4 py-3 sm:px-6 sm:py-5 mb-4 sm:mb-6' : 'px-8 py-7 mb-10'} shadow-sm`}>
        <div className={`flex justify-center ${inModal ? 'gap-8' : 'gap-12 md:gap-16'}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-amber-400 to-orange-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <EyeIconSolid className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>{t('common:promotions.higherVisibility')}</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">{t('common:promotions.topOfSearchResults')}</p>}
          </div>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-blue-400 to-indigo-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <ChatBubbleLeftRightIconSolid className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>{t('common:promotions.moreInquiries')}</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">{t('common:promotions.seriousBuyerContacts')}</p>}
          </div>
          <div className="flex flex-col items-center text-center">
            <div className={`${inModal ? 'w-12 h-12 mb-2' : 'w-14 h-14 mb-3'} ${isExtension ? extStyle.iconBg : 'bg-gradient-to-br from-emerald-400 to-teal-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <BoltIconSolid className={`${inModal ? 'w-5 h-5' : 'w-7 h-7'} text-white`} />
            </div>
            <h3 className={`font-semibold text-gray-900 ${inModal ? 'text-xs' : 'text-sm'}`}>{t('common:promotions.sellFaster')}</h3>
            {!inModal && <p className="text-xs text-gray-500 mt-0.5">{t('common:promotions.fasterResults')}</p>}
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
                      <FireIcon className="w-3 h-3" /> {t('common:promotions.urgent')}
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
                {t('common:promotions.upgradeYourPlan')}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600">{t('common:promotions.showUpgradeOptions')}</span>
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
                {t('common:promotions.currentlyOnPlan', { plan: currentTier ? extensionTierStyles[currentTier].tierName : t('common:promotions.standard') })}
                {currentTier !== 'premium' && ` ${t('common:promotions.enableUpgradeOptions')}`}
              </p>
            ) : (
              /* Show Tier Selection when upgrade is wanted */
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 mt-4`}>
                {(['featured', 'highlight', 'premium'] as PromotionTier[]).map((tierId) => {
                  const tier = tiers[tierId];
                  const pricing = tiersData.pricing.find(
                    (p) => p.tierId === tierId && p.duration === selectedDuration
                  );
                  return (
                    <PromotionTierCard
                      key={tierId}
                      tierId={tierId}
                      tier={tier}
                      isSelected={selectedTier === tierId}
                      selectedDuration={selectedDuration}
                      price={pricing?.price || 0}
                      onSelect={setSelectedTier}
                      variant="compact"
                      currentTier={currentTier}
                    />
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
          <h3 className={`${inModal ? 'text-base' : 'text-xl'} font-bold text-neutral-900 mb-4`}>{t('common:promotions.chooseYourPlan')}</h3>
          <div className={`grid grid-cols-1 sm:grid-cols-3 items-stretch ${inModal ? 'gap-3' : 'gap-5'}`}>
            {(['featured', 'highlight', 'premium'] as PromotionTier[]).map((tierId) => {
              const tier = tiers[tierId];
              const pricing = tiersData.pricing.find(
                (p) => p.tierId === tierId && p.duration === selectedDuration
              );
              return (
                <PromotionTierCard
                  key={tierId}
                  tierId={tierId}
                  tier={tier}
                  isSelected={selectedTier === tierId}
                  selectedDuration={selectedDuration}
                  price={pricing?.price || 0}
                  onSelect={setSelectedTier}
                />
              );
            })}
          </div>
        </div>
      )}

      {(selectedTier || isExtension || focusUrgent) && (
        <>
          {/* Duration Selection */}
          <PromotionDurationPicker
            selectedDuration={selectedDuration}
            onDurationChange={setSelectedDuration}
            pricing={tiersData.pricing}
            tierToUse={isExtension ? currentTier : selectedTier}
            isExtension={isExtension}
            extStyle={extStyle}
          />

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
                      <FireIcon className="w-3 h-3" /> {t('common:promotions.urgent')}
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
          {!isExtension && !focusUrgent && agencyAllocation && canUseAgencyAllocation && (
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
                      {t('common:promotions.useAgencyAllocation')}
                    </span>
                    <span className="bg-green-600 text-white text-xs font-medium px-2 py-0.5 rounded">
                      {t('common:promotions.free')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">
                    {t('common:promotions.agencyAllocationDescription', { planName: agencyAllocation.plan.planName, tier: selectedTier })}
                  </p>
                  <div className="flex gap-3 text-xs text-neutral-700">
                    <div>
                      {t('common:promotions.featured')}: {agencyAllocation.remaining.featured}/{agencyAllocation.plan.monthlyFeaturedAds}
                    </div>
                    <div>
                      {t('common:promotions.highlight')}: {agencyAllocation.remaining.highlight}/{agencyAllocation.plan.monthlyHighlightAds}
                    </div>
                    <div>
                      {t('common:promotions.premium')}: {agencyAllocation.remaining.premium}/{agencyAllocation.plan.monthlyPremiumAds}
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Coupon Code */}
          {!useAgencyAllocation && (
            <div className="bg-white rounded-lg border border-neutral-200 p-5 mb-4">
              <h3 className="text-sm font-semibold text-neutral-800 mb-3">{t('common:promotions.couponCode')}</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder={t('common:promotions.enterCode')}
                  className="flex-1 px-3 py-2 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:border-neutral-800 uppercase"
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
                      {t('common:promotions.couponApplied', { amount: couponValidation.discount.toFixed(2) })}
                    </span>
                  ) : (
                    <span>{couponValidation.message}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Price Summary + Action Buttons */}
          <PromotionSummary
            priceInfo={priceInfo}
            selectedDuration={selectedDuration}
            isExtension={isExtension}
            focusUrgent={focusUrgent}
            extStyle={extStyle}
            wantsTierUpgrade={wantsTierUpgrade}
            useAgencyAllocation={useAgencyAllocation}
            couponValidation={couponValidation}
            isProcessing={isProcessing}
            successMessage={successMessage}
            hasPendingProperty={!!pendingPropertyData}
            onBack={onBack}
            onSkip={onSkip}
            onPurchase={handlePurchase}
          />
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
              {t('common:promotions.backToForm')}
            </button>
          )}
          <button
            onClick={onSkip}
            disabled={isProcessing}
            className="px-6 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            {pendingPropertyData ? t('common:promotions.postWithoutPromotion') : t('common:promotions.skipForNow')}
          </button>
          {pendingPropertyData && (
            <p className="text-xs text-neutral-500 mt-2">
              {t('common:promotions.promoteFromDashboard')}
            </p>
          )}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default PromotionSelector;
