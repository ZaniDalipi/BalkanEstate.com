import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { createFeaturedSubscription } from '../../services/apiService';
import { SparklesIcon, CheckCircleIcon, XMarkIcon } from '../../constants';
import { API_URL } from '../../src/shared/api/config';
import { csrfHeaders, ensureCsrfToken } from '../../src/shared/api/httpClient';

interface FeaturedProduct {
  productId: string;
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
  badge?: string;
  highlighted?: boolean;
}

interface FeaturedSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agencyId: string;
  onSuccess?: () => void;
}

const FeaturedSubscriptionDialog: React.FC<FeaturedSubscriptionDialogProps> = ({
  isOpen,
  onClose,
  agencyId,
  onSuccess,
}) => {
  const { t } = useTranslation(['agencies', 'common']);
  const [selectedDuration, setSelectedDuration] = useState<7 | 14 | 28 | 90>(28);
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [finalPrice, setFinalPrice] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);

  // Fetch featured agency products from database
  useEffect(() => {
    if (isOpen) {
      fetchFeaturedProducts();
    }
  }, [isOpen]);

  const fetchFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch(`${API_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        const featured = (data.products || []).filter((p: any) =>
          p.productId?.startsWith('featured_agency_')
        );
        setFeaturedProducts(featured);
      }
    } catch (err) {
    } finally {
      setLoadingProducts(false);
    }
  };

  // Build duration-based pricing from DB products or use fallback
  const durationOptions = useMemo(() => {
    const defaults: Record<number, { price: number; label: string; productId: string; badge?: string; highlighted?: boolean; features: string[] }> = {
      7: { price: 6.99, label: t('agencies:featuredDialog.duration1week', '1 Week'), productId: 'featured_agency_7days', features: [] },
      14: { price: 11.99, label: t('agencies:featuredDialog.duration2weeks', '2 Weeks'), productId: 'featured_agency_14days', features: [] },
      28: { price: 24.99, label: t('agencies:featuredDialog.duration4weeks', '4 Weeks'), productId: 'featured_agency_28days', badge: t('agencies:featuredDialog.badgePopular', 'POPULAR'), highlighted: true, features: [] },
      90: { price: 49.99, label: t('agencies:featuredDialog.duration90days', '90 Days'), productId: 'featured_agency_90days', badge: t('agencies:featuredDialog.badgeBestValue', 'BEST VALUE'), features: [] },
    };

    for (const product of featuredProducts) {
      const match = product.productId.match(/featured_agency_(\d+)days/);
      if (match) {
        const days = parseInt(match[1]);
        if (defaults[days]) {
          defaults[days].price = product.price;
          defaults[days].features = product.features || [];
          if (product.badge) defaults[days].badge = product.badge;
          if (product.highlighted !== undefined) defaults[days].highlighted = product.highlighted;
        }
      }
    }

    return defaults;
  }, [featuredProducts, t]);

  // Get features for selected plan from DB or default
  const selectedFeatures = useMemo(() => {
    const planFeatures = durationOptions[selectedDuration]?.features || [];
    if (planFeatures.length > 0) {
      return planFeatures;
    }
    return [
      t('agencies:featured.subscription.featuredInDirectory', 'Featured in agency directory'),
      t('agencies:featured.subscription.priorityInSearch', 'Priority in search results'),
      t('agencies:featured.subscription.homepageCarousel', 'Homepage agency carousel'),
      t('agencies:featured.subscription.featuredBadge', 'Featured badge on profile'),
      t('agencies:featured.subscription.boostedVisibility', 'Boosted visibility everywhere'),
    ];
  }, [selectedDuration, durationOptions, t]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError(t('agencies:payment.invalidCoupon', 'Please enter a coupon code'));
      return;
    }

    try {
      setValidatingCoupon(true);
      setError(null);

      await ensureCsrfToken();
      const response = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('balkan_estate_token')}`,
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          couponCode: couponCode.toUpperCase(),
          price: durationOptions[selectedDuration].price,
          tier: 'featured',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || t('agencies:coupon.errors.invalidCoupon', 'Invalid coupon'));
      }

      const data = await response.json();
      setFinalPrice(data.finalPrice);
      setDiscountAmount(data.discount);
      setCouponApplied(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || t('agencies:payment.couponError', 'Failed to apply coupon'));
      setCouponApplied(false);
      setFinalPrice(null);
      setDiscountAmount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await createFeaturedSubscription(agencyId, {
        interval: `${selectedDuration}days` as any,
        couponCode: couponCode || undefined,
        startTrial: false,
      });

      if (!response.requiresPayment || response.finalPrice === 0) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || t('agencies:payment.error', 'Failed to create subscription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('agencies:featuredDialog.title', 'Featured Agency Subscription')}
      maxWidth="max-w-2xl"
    >
      <div className="p-6">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-neutral-800 mb-2">
              {t('agencies:featuredDialog.subscriptionCreated', 'Subscription Created!')}
            </h3>
            <p className="text-neutral-600">
              {t('agencies:featuredDialog.agencyNowFeatured', 'Your agency is now featured. Redirecting...')}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-primary rounded-lg p-6 text-white mb-6">
              <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="w-8 h-8" />
                <h3 className="text-2xl font-bold">{t('agencies:featuredDialog.getFeatured', 'Get Featured!')}</h3>
              </div>
              <p className="text-purple-100">
                {t('agencies:featuredDialog.boostVisibility', "Boost your agency's visibility and get more leads with a featured listing")}
              </p>
            </div>

            {/* Loading Products */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-neutral-600">{t('agencies:featuredDialog.loadingPricing', 'Loading pricing...')}</span>
              </div>
            ) : (
              <>
                {/* Duration-based Pricing Options */}
                <div className="mb-6">
                  <h4 className="font-semibold text-neutral-800 mb-3">{t('agencies:featuredDialog.chooseDuration', 'Choose Duration')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {([7, 14, 28, 90] as const).map((days) => {
                      const opt = durationOptions[days];
                      const isSelected = selectedDuration === days;
                      return (
                        <button
                          key={days}
                          onClick={() => setSelectedDuration(days)}
                          className={`p-4 rounded-lg border-2 transition-all relative ${
                            isSelected
                              ? 'border-primary bg-purple-50 shadow-md'
                              : opt.highlighted
                                ? 'border-green-300 hover:border-green-400 bg-green-50/30'
                                : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {opt.badge && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {opt.badge}
                            </span>
                          )}
                          <div className="text-center">
                            <p className="text-sm text-neutral-500">{opt.label}</p>
                            <p className="text-xl font-bold text-neutral-800 mt-1">
                              €{opt.price.toFixed(2)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Features - Dynamic from DB */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-neutral-800 mb-3">
                    {t('agencies:featuredDialog.whatsIncluded', "What's Included:")}
                  </h4>
                  <ul className="space-y-2">
                    {selectedFeatures.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-neutral-700">
                        <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Coupon Code */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('agencies:featuredDialog.haveCouponCode', 'Have a coupon code?')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponApplied(false);
                    setFinalPrice(null);
                  }}
                  placeholder={t('agencies:payment.enterCoupon', 'Enter coupon code')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || validatingCoupon || loadingProducts}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingCoupon ? t('agencies:featuredDialog.validating', 'Validating...') : t('agencies:payment.apply', 'Apply')}
                </button>
              </div>
            </div>

            {/* Coupon Applied Success */}
            {couponApplied && finalPrice !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">{t('agencies:featuredDialog.couponAppliedSuccess', 'Coupon Applied Successfully!')}</p>
                </div>
                <div className="text-sm text-green-700">
                  <p>{t('agencies:featuredDialog.originalPrice', 'Original Price:')} <span className="line-through">€{durationOptions[selectedDuration].price}</span></p>
                  <p>{t('agencies:featuredDialog.discount', 'Discount:')} <span className="font-bold">-€{discountAmount}</span></p>
                  <p className="text-lg font-bold mt-1">
                    {t('agencies:featuredDialog.finalPriceLabel', 'Final Price:')} {finalPrice === 0 ? (
                      <span className="text-green-600">{t('common:free', 'FREE')}!</span>
                    ) : (
                      <span>€{finalPrice}</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                <XMarkIcon className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-neutral-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={loading || loadingProducts}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-primary text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                {loading ? t('agencies:featuredDialog.processing', 'Processing...') : couponApplied && finalPrice !== null
                  ? finalPrice === 0
                    ? t('agencies:featuredDialog.activateForFree', 'Activate for FREE')
                    : t('agencies:featuredDialog.subscribePrice', 'Subscribe - €{{price}}', { price: finalPrice })
                  : t('agencies:featuredDialog.subscribePrice', 'Subscribe - €{{price}}', { price: durationOptions[selectedDuration].price })}
              </button>
            </div>

            <p className="text-xs text-neutral-500 text-center mt-4">
              {t('agencies:featuredDialog.bySubscribing', 'By subscribing, you agree to our terms and conditions.')}
              {couponApplied && finalPrice !== null ? (
                finalPrice === 0 ? (
                  <span className="font-semibold text-green-600"> {t('agencies:featuredDialog.noPaymentRequired', 'No payment required - 100% discount applied!')}</span>
                ) : (
                  <span> {t('agencies:featuredDialog.chargedPerPeriod', 'You will be charged €{{price}} per {{period}}.', { price: finalPrice, period: durationOptions[selectedDuration].label })}</span>
                )
              ) : (
                <span> {t('agencies:featuredDialog.chargedPerPeriod', 'You will be charged €{{price}} per {{period}}.', { price: durationOptions[selectedDuration].price, period: durationOptions[selectedDuration].label })}</span>
              )}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default FeaturedSubscriptionDialog;
