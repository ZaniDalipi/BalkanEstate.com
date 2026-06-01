import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { createAgency } from '@/src/features/agencies/api/agencyApi';
import Footer from '@/components/shared/Footer';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  HomeIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@/constants';
import { apiRequest } from '@/src/shared/api';
import { validatePaymentRedirectUrl } from '@/src/utils/security';
import { replacePlaceholders } from '@/src/shared/utils/featurePlaceholders';

interface EnterprisePlan {
  name: string;
  price: number;
  interval: 'month' | 'year';
  productId: string;
  features: string[];
}

const DEFAULT_ENTERPRISE_PLAN: EnterprisePlan = {
  name: 'Enterprise',
  price: 999,
  interval: 'year',
  productId: 'agency_yearly',
  features: [
    '1000 Active Listings per Year',
    'Create & Manage Your Agency',
    '5 Agent Invitation Coupons',
    'Unlimited Saved Searches',
    'Full Analytics Dashboard',
    'Priority Support',
    '10 Monthly Promotion Coupons',
    'Team Management Tools',
  ],
};

const AgencyPaymentPage: React.FC = () => {
  const { t } = useTranslation(['agencies', 'common']);
  const { state, dispatch } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [enterprisePlan, setEnterprisePlan] = useState<EnterprisePlan>(DEFAULT_ENTERPRISE_PLAN);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const pendingAgencyData = state.pendingAgencyData;

  // Detect if user already has an Enterprise subscription and can skip payment
  const hasEnterpriseSubscription =
    state.currentUser?.subscription?.tier === 'agency_owner' ||
    state.currentUser?.subscriptionPlan?.toLowerCase().includes('enterprise') ||
    state.currentUser?.subscriptionPlan?.toLowerCase().includes('agency') ||
    state.currentUser?.isEnterpriseTier;

  const hasActiveSubscription =
    state.currentUser?.subscriptionStatus === 'active' ||
    state.currentUser?.subscriptionStatus === 'trial' ||
    state.currentUser?.subscriptionStatus === 'grace';

  const isConfirmMode = hasEnterpriseSubscription && hasActiveSubscription;

  // Redirect if no pending agency data
  useEffect(() => {
    if (!pendingAgencyData) {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'createAgency' });
      window.history.pushState({}, '', '/create-agency');
    }
  }, [pendingAgencyData, dispatch]);

  // Fetch Enterprise plan from database (single source of truth)
  useEffect(() => {
    const fetchEnterprisePlan = async () => {
      setLoadingPlan(true);
      try {
        const response = await fetch(`${API_URL}/products?role=seller`);
        if (response.ok) {
          const data = await response.json();
          const products = data.products || [];

          const enterprise = products.find((p: any) =>
            p.productId?.toLowerCase().includes('enterprise') ||
            p.name?.toLowerCase().includes('enterprise')
          );

          if (enterprise) {
            const rawFeatures: string[] = enterprise.features || DEFAULT_ENTERPRISE_PLAN.features;
            setEnterprisePlan({
              name: enterprise.name || 'Enterprise',
              price: enterprise.price || 999,
              interval: enterprise.billingPeriod === 'monthly' ? 'month' : 'year',
              productId: enterprise.productId || 'seller_enterprise_yearly',
              features: rawFeatures.map((f: string) => replacePlaceholders(f, enterprise)),
            });
          }
        }
      } catch (err) {
        // Error removed
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchEnterprisePlan();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setApplyingCoupon(true);
    setError('');

    try {
      const data = await apiRequest<any>('/coupons/validate', {
        method: 'POST',
        body: { code: couponCode, productId: enterprisePlan.productId },
        requiresAuth: true,
      });

      if (data.valid) {
        setAppliedCoupon({
          code: couponCode,
          discount: data.discountPercent || data.discountAmount || 0,
        });
      } else {
        setError(data.message || t('payment.invalidCoupon', 'Invalid coupon code'));
      }
    } catch (err: any) {
      setError(err.message || t('payment.couponError', 'Failed to validate coupon'));
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const calculateFinalPrice = () => {
    if (!appliedCoupon) return enterprisePlan.price;
    const discount = (enterprisePlan.price * appliedCoupon.discount) / 100;
    return Math.max(0, enterprisePlan.price - discount);
  };

  const handlePayment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest<any>('/payments/create-checkout-session', {
        method: 'POST',
        body: {
          productId: enterprisePlan.productId,
          couponCode: appliedCoupon?.code,
          successUrl: `${window.location.origin}/create-agency/confirm`,
          cancelUrl: `${window.location.origin}/create-agency/payment`,
          metadata: {
            agencyCreation: true,
            agencyData: JSON.stringify(pendingAgencyData),
          },
        },
        requiresAuth: true,
      });

      if (data.url) {
        // Redirect to payment checkout (validated against allowlist)
        const validatedUrl = validatePaymentRedirectUrl(data.url);
        if (validatedUrl) {
          window.location.href = validatedUrl;
        } else {
          setError(t('payment:errors.redirectBlocked', 'Payment redirect was blocked for security reasons. Please try again.'));
        }
      } else {
        setError(data.message || t('payment.error', 'Failed to initiate payment'));
      }
    } catch (err: any) {
      setError(err.message || t('payment.error', 'Failed to initiate payment. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle direct agency creation when user already has Enterprise subscription
  const handleCreateAgency = async () => {
    if (!pendingAgencyData) return;

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const agencyData = {
        ...pendingAgencyData,
        yearsInBusiness: pendingAgencyData.yearsInBusiness
          ? parseInt(pendingAgencyData.yearsInBusiness)
          : undefined,
      };

      const data = await createAgency(agencyData);

      // Clear pending data
      dispatch({ type: 'SET_PENDING_AGENCY_DATA', payload: null });

      // Immediately refresh user data so the creator has access to the dashboard right away
      try {
        const userData = await apiRequest<any>('/auth/me', { requiresAuth: true });
        dispatch({ type: 'SET_CURRENT_USER', payload: userData });
      } catch {
        // Non-critical - still show success
      }

      let msg = `Your agency "${pendingAgencyData.name}" has been created successfully!`;
      if (data.agentCoupons?.generated) {
        if (data.agentCoupons.emailSent) {
          msg += ' 5 agent registration codes have been sent to your email.';
        } else {
          const codesList = data.agentCoupons.codes?.map((c: any) => c.code).join(', ');
          msg += ` Your 5 agent codes: ${codesList || '(check agency dashboard)'}`;
        }
      }
      setSuccessMessage(msg);

      // Navigate to agency details after a brief moment to show success message
      const agencySlug = data.agency?.slug;
      setTimeout(() => {
        if (agencySlug) {
          dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencySlug });
          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agencies' });
          window.history.pushState({}, '', `/agencies/${agencySlug}`);
        } else {
          dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agency-dashboard' });
          window.history.pushState({}, '', '/agency-dashboard');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create agency. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'createAgency' });
    window.history.pushState({}, '', '/create-agency');
  };

  if (!pendingAgencyData) {
    return null;
  }

  const finalPrice = calculateFinalPrice();

  // ─── CONFIRM MODE: User already has Enterprise subscription ───────────────
  if (isConfirmMode) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 50%, #eef2ff 100%)' }}>
        {/* Header */}
        <div
          className="relative overflow-hidden py-12 sm:py-16"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #312e81 100%)' }}
        >
          <div
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{ top: 40, left: '10%', width: 288, height: 288, background: 'rgba(245,158,11,0.18)' }}
          />
          <div
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{ bottom: 40, right: '10%', width: 384, height: 384, background: 'rgba(249,115,22,0.15)', animationDelay: '1s' }}
          />
          <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 mb-6 transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>{t('payment.backToDetails', 'Back to Agency Details')}</span>
            </button>
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
            >
              <BuildingOfficeIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
              {t('confirm.title', 'Create Your Agency')}
            </h1>
            <p className="text-lg" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {t('confirm.subtitle', 'Your Enterprise subscription is active. Review the details and confirm.')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {successMessage ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-neutral-100">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-neutral-800 mb-2">Agency Created!</h2>
              <p className="text-neutral-600 mb-6">{successMessage}</p>
              <p className="text-sm text-neutral-500">Redirecting to agencies page...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800 mb-6">
                {t('confirm.reviewDetails', 'Review Agency Details')}
              </h2>

              {/* Agency Preview */}
              <div className="rounded-xl p-5 mb-6 border border-amber-200" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}>
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-800 text-lg">{pendingAgencyData.name}</h3>
                    <p className="text-sm text-neutral-600">{pendingAgencyData.city}, {pendingAgencyData.country}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {pendingAgencyData.phone && (
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-xs uppercase tracking-wide">Phone</span>
                      <span className="text-neutral-700 font-medium">{pendingAgencyData.phone}</span>
                    </div>
                  )}
                  {pendingAgencyData.email && (
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-xs uppercase tracking-wide">Email</span>
                      <span className="text-neutral-700 font-medium">{pendingAgencyData.email}</span>
                    </div>
                  )}
                  {pendingAgencyData.licenseNumber && (
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-xs uppercase tracking-wide">License</span>
                      <span className="text-neutral-700 font-medium">{pendingAgencyData.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enterprise benefits reminder */}
              <div className="rounded-xl p-4 mb-6 border border-slate-700" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
                <p className="text-amber-400 font-semibold text-sm mb-2">✓ Enterprise Plan Active</p>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• 5 agent registration codes will be emailed to you</li>
                  <li>• Monthly listing promotion coupons included</li>
                  <li>• 7-day featured agency trial starts immediately</li>
                </ul>
              </div>

              {/* Error display */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGoBack}
                  className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-xl hover:bg-neutral-50 font-medium transition-colors"
                >
                  {t('common:back', 'Back')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateAgency}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 text-white rounded-xl font-semibold transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Creating...
                    </span>
                  ) : t('confirm.createAgency', 'Create My Agency')}
                </button>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    );
  }
  // ─── END CONFIRM MODE ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-12 sm:py-16">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="payment-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#payment-grid)" />
          </svg>
        </div>

        <div className="absolute top-10 left-[10%] w-72 h-72 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t('payment.backToDetails', 'Back to Agency Details')}</span>
          </button>

          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <CreditCardIcon className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4">
            {t('payment.title', 'Complete Your Purchase')}
          </h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            {t('payment.subtitle', 'Subscribe to Enterprise plan to create your agency')}
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-neutral-100">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-green-600">{t('payment.steps.details', 'Agency Details')}</span>
            </div>
            <div className="w-12 h-1 bg-green-500 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center">
                <CreditCardIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-amber-600">{t('payment.steps.payment', 'Payment')}</span>
            </div>
            <div className="w-12 h-1 bg-neutral-200 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-400 flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-neutral-400">{t('payment.steps.confirmation', 'Confirmation')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-800 mb-6">
              {t('payment.orderSummary', 'Order Summary')}
            </h2>

            {/* Agency Preview */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 mb-6 border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <BuildingOfficeIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-800">{pendingAgencyData.name}</h3>
                  <p className="text-sm text-neutral-600">{pendingAgencyData.city}, {pendingAgencyData.country}</p>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="border-t border-neutral-100 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-600">{enterprisePlan.name} Plan</span>
                <span className="font-semibold">€{enterprisePlan.price}/{enterprisePlan.interval}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center mb-2 text-green-600">
                  <span className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4" />
                    Coupon ({appliedCoupon.code})
                  </span>
                  <span>-{appliedCoupon.discount}%</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-neutral-100 mt-4">
                <span className="font-bold text-lg">{t('payment.total', 'Total')}</span>
                <span className="font-bold text-2xl text-primary">€{finalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Input */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                {t('payment.couponCode', 'Have a coupon code?')}
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="font-medium">{appliedCoupon.code}</span>
                    <span className="text-sm">(-{appliedCoupon.discount}%)</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    {t('common:remove', 'Remove')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder={t('payment.enterCoupon', 'Enter coupon code')}
                    className="flex-1 min-w-0 px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    onKeyDown={(e) => e.key === 'Enter' && !applyingCoupon && couponCode.trim() && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="flex-shrink-0 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {applyingCoupon ? '...' : t('payment.apply', 'Apply')}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Plan Features */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-neutral-100">
            <h2 className="text-xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-amber-500" />
              {t('payment.whatsIncluded', "What's Included")}
            </h2>

            <div className="space-y-4">
              {enterprisePlan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-neutral-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="mt-8 pt-6 border-t border-neutral-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                  <span>{t('payment.securePayment', 'Secure Payment')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <UsersIcon className="w-5 h-5 text-blue-500" />
                  <span>{t('payment.teamSupport', 'Team Support')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <HomeIcon className="w-5 h-5 text-purple-500" />
                  <span>{t('payment.unlimitedProperties', '1000 Listings per Year')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <ChartBarIcon className="w-5 h-5 text-amber-500" />
                  <span>{t('payment.fullAnalytics', 'Full Analytics')}</span>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <div className="mt-6">
              <button
                onClick={handlePayment}
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>{t('payment.processing', 'Processing...')}</span>
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="w-5 h-5" />
                    <span>{finalPrice === 0 ? t('payment.activateFree', 'Activate Free') : t('payment.payNow', `Pay €${finalPrice.toFixed(2)}/${enterprisePlan.interval}`)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgencyPaymentPage;
