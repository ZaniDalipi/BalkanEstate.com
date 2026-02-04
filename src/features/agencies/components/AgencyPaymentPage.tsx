import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { createAgency } from '@/src/features/agencies/api/agencyApi';
import Footer from '@/components/shared/Footer';
import PaymentComingSoon from '@/src/components/shared/PaymentComingSoon';
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
} from '@/constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  productId: 'seller_enterprise_yearly',
  features: [
    '500 Active Listings',
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
  const [enterprisePlan, setEnterprisePlan] = useState<EnterprisePlan>(DEFAULT_ENTERPRISE_PLAN);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const pendingAgencyData = state.pendingAgencyData;

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
            setEnterprisePlan({
              name: enterprise.name || 'Enterprise',
              price: enterprise.price || 999,
              interval: enterprise.billingPeriod === 'monthly' ? 'month' : 'year',
              productId: enterprise.productId || 'seller_enterprise_yearly',
              features: enterprise.features || DEFAULT_ENTERPRISE_PLAN.features,
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
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: couponCode,
          productId: enterprisePlan.productId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setAppliedCoupon({
          code: couponCode,
          discount: data.discountPercent || data.discountAmount || 0,
        });
      } else {
        setError(data.message || t('payment.invalidCoupon', 'Invalid coupon code'));
      }
    } catch (err) {
      setError(t('payment.couponError', 'Failed to validate coupon'));
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
      const token = localStorage.getItem('balkan_estate_token');

      // Create Stripe checkout session
      const response = await fetch(`${API_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: enterprisePlan.productId,
          couponCode: appliedCoupon?.code,
          successUrl: `${window.location.origin}/create-agency/confirm`,
          cancelUrl: `${window.location.origin}/create-agency/payment`,
          metadata: {
            agencyCreation: true,
            agencyData: JSON.stringify(pendingAgencyData),
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.message || t('payment.error', 'Failed to initiate payment'));
      }
    } catch (err) {
      // Error removed
      setError(t('payment.error', 'Failed to initiate payment. Please try again.'));
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
                    className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="px-4 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
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
                  <span>{t('payment.unlimitedProperties', '500 Listings')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <ChartBarIcon className="w-5 h-5 text-amber-500" />
                  <span>{t('payment.fullAnalytics', 'Full Analytics')}</span>
                </div>
              </div>
            </div>

            {/* Coming Soon Notice */}
            <PaymentComingSoon
              title={t('payment.comingSoon.title', 'Payments Coming Soon')}
              message={t('payment.comingSoon.message', 'We are setting up our payment system. Contact us to set up your agency manually.')}
              className="mt-6"
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AgencyPaymentPage;
