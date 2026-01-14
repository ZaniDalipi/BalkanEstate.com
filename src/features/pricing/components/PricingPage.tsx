import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import PaymentWindow from '@/components/shared/PaymentWindow';
import Footer from '@/components/shared/Footer';
import {
  FloatingSphere,
  GlossyPill,
  AbstractBlob,
  GlassyDonut,
  SoftCone,
  Decorative3DStyles
} from '@/components/shared/Decorative3D';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BoltIcon,
  CheckIcon,
  ArrowLeftIcon,
  SparklesIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  LockClosedIcon
} from '@/constants';

// Helper to build localized path
const buildLocalizedPath = (path: string): string => {
  const currentLang = window.location.pathname.split('/')[1] || 'en';
  const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
  const lang = validLangs.includes(currentLang) ? currentLang : 'en';
  return `/${lang}${path === '/' ? '' : path}`;
};

interface Product {
  id: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod?: string;
  trialPeriodDays?: number;
  features: string[];
  targetRole: 'buyer' | 'seller' | 'agent' | 'all';
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  durationDays?: number;
  listingsLimit?: number;
  promotionCoupons?: number;
  savedSearchesLimit?: number;
  aiMessagesLimit?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Format limit value for display (-1 = unlimited)
const formatLimit = (value?: number): string => {
  if (value === undefined || value === null) return '0';
  if (value === -1) return 'Unlimited';
  return value.toString();
};

const PricingPage: React.FC = () => {
  const { t } = useTranslation(['pricing', 'common']);
  const { state, dispatch } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    productId: string;
  } | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);

  // Sales team contact info
  const salesEmail = 'sales@balkanestateai.com';
  const salesPhone = '+389 71 967 915';

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/products?role=${activeTab}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(t('pricing:error.loadFailed', 'Failed to load pricing plans'));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [activeTab, t]);

  const handleBack = () => {
    window.history.pushState({}, '', buildLocalizedPath('/'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleLegalNavigation = (page: 'terms' | 'privacy' | 'refund') => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: page });
    window.history.pushState({}, '', buildLocalizedPath(`/${page}`));
  };

  const handlePlanSelection = (product: Product) => {
    if (!state.isAuthenticated || !state.currentUser) {
      dispatch({
        type: 'SET_PENDING_SUBSCRIPTION',
        payload: {
          planName: product.name,
          planPrice: product.price,
          planInterval: product.billingPeriod === 'yearly' ? 'year' : 'month',
          modalType: activeTab,
        },
      });
      dispatch({
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'login' },
      });
      return;
    }

    setSelectedPlan({
      name: product.name,
      price: product.price,
      interval: product.billingPeriod === 'yearly' ? 'year' : 'month',
      productId: product.productId,
    });

    if (product.productId.includes('enterprise') && !state.pendingAgencyData) {
      dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
    } else {
      setShowPaymentWindow(true);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    setShowPaymentWindow(false);
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: t('pricing:success.title', 'Success!'),
        message: t('pricing:success.subscriptionActivated', 'Your subscription has been activated.'),
      },
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'red': return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'green': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'blue': return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'amber': return 'bg-gradient-to-r from-amber-500 to-orange-500';
      case 'purple': return 'bg-gradient-to-r from-purple-500 to-purple-600';
      default: return 'bg-gradient-to-r from-primary to-indigo-600';
    }
  };

  const getBillingLabel = (billingPeriod?: string) => {
    switch (billingPeriod) {
      case 'yearly': return '/year';
      case 'monthly': return '/month';
      case 'weekly': return '/week';
      default: return '';
    }
  };

  const getUserRole = (): 'buyer' | 'private_seller' | 'agent' => {
    if (!state.currentUser) return 'private_seller';
    return state.currentUser.role === 'agent' ? 'agent' : 'private_seller';
  };

  // Separate enterprise from other products
  const enterpriseProduct = products.find(p => p.productId.includes('enterprise'));
  const proYearlyProduct = products.find(p => p.productId.includes('pro_yearly') || p.productId.includes('yearly') && !p.productId.includes('enterprise'));
  const proMonthlyProduct = products.find(p => p.productId.includes('pro_monthly') || p.productId.includes('monthly'));
  const buyerProduct = products.find(p => p.productId.includes('buyer'));

  // Seller products in correct order
  const sellerProducts = [proYearlyProduct, proMonthlyProduct].filter(Boolean) as Product[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-safe relative">
      {/* 3D Decorative Background Elements - fixed positioning so they don't block scroll */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top right sphere */}
        <div className="absolute -top-10 right-[5%] opacity-40 hidden lg:block">
          <FloatingSphere size="xl" color="cyan" />
        </div>

        {/* Bottom left sphere */}
        <div className="absolute bottom-[20%] -left-10 opacity-30 hidden lg:block">
          <FloatingSphere size="lg" color="pink" animate={false} />
        </div>

        {/* Abstract blob - top left */}
        <div className="absolute top-[15%] left-[8%] opacity-20 hidden xl:block">
          <AbstractBlob variant={2} color="purple" />
        </div>

        {/* Glossy pill - right side */}
        <div className="absolute top-[40%] -right-6 opacity-25 hidden lg:block rotate-[-15deg]">
          <GlossyPill orientation="vertical" size="lg" color="blue" />
        </div>

        {/* Donut shape - bottom */}
        <div className="absolute bottom-[10%] right-[20%] opacity-25 hidden xl:block">
          <GlassyDonut size="lg" color="purple" />
        </div>

        {/* Soft cone - left */}
        <div className="absolute bottom-[35%] left-[3%] opacity-30 hidden lg:block">
          <SoftCone size="lg" color="peach" />
        </div>

        {/* Small accent spheres */}
        <div className="absolute top-[60%] right-[30%] opacity-35 hidden md:block">
          <FloatingSphere size="sm" color="purple" />
        </div>

        {/* Gradient overlays */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/20 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-pink-200/15 via-rose-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium text-sm sm:text-base">{t('common:back', 'Back')}</span>
            </button>
            <h1 className="text-base sm:text-xl font-bold text-gray-900">{t('pricing:pageTitle', 'Pricing Plans')}</h1>
            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <SparklesIcon className="w-4 h-4" />
            <span>Simple, transparent pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t('pricing:title', 'Choose Your Plan')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            {t('pricing:subtitle', 'Get your property in front of thousands of potential buyers with our flexible pricing options.')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <div className="bg-gray-100 p-1.5 rounded-2xl inline-flex shadow-inner">
            <button
              onClick={() => setActiveTab('seller')}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'seller'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing:tabs.forSellers', 'For Sellers')}
            </button>
            <button
              onClick={() => setActiveTab('buyer')}
              className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'buyer'
                  ? 'bg-white text-gray-900 shadow-lg'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('pricing:tabs.forBuyers', 'For Buyers')}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
              </div>
              <p className="mt-4 text-gray-600">{t('pricing:loading', 'Loading pricing plans...')}</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <div className="bg-red-50 rounded-2xl p-8 max-w-md mx-auto">
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                {t('common:tryAgain', 'Try Again')}
              </button>
            </div>
          </div>
        )}

        {/* Seller Plans */}
        {!loading && !error && activeTab === 'seller' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">

            {/* Pro Yearly - Most Popular */}
            {proYearlyProduct && (
              <div className="relative order-1 lg:order-1 pt-4 lg:-translate-y-4">
                {/* Badge - Outside the card */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    MOST POPULAR
                  </span>
                </div>

                <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border-2 border-emerald-400 shadow-xl h-full">
                  <div className="text-center pt-2">
                    <h3 className="text-2xl font-bold text-gray-900">{proYearlyProduct.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{proYearlyProduct.description || 'Best value for serious sellers'}</p>
                    <div className="mt-6">
                      <span className="text-5xl font-extrabold text-gray-900">€{proYearlyProduct.price}</span>
                      <span className="text-lg text-gray-600">/year</span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-600 font-medium">Save 33% vs monthly</p>
                  </div>

                  {/* Key Metrics */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.listingsLimit)}</p>
                      <p className="text-xs text-gray-600">Listings/Year</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.promotionCoupons)}</p>
                      <p className="text-xs text-gray-600">Promo Coupons/Mo</p>
                    </div>
                  </div>

                  {/* Features - with fallback */}
                  <ul className="mt-6 space-y-3 flex-grow">
                    {(proYearlyProduct.features && proYearlyProduct.features.length > 1
                      ? proYearlyProduct.features.slice(0, 6)
                      : [
                          '250 listings per year',
                          '3 promo coupons/month',
                          'Unlimited AI chat',
                          'Unlimited saved searches',
                          'Advanced analytics',
                          'Priority support',
                        ]
                    ).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                          <CheckIcon className="w-3 h-3 text-emerald-600" />
                        </div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelection(proYearlyProduct)}
                    className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300 text-base"
                  >
                    Get Started - €{proYearlyProduct.price}/year
                  </button>
                </div>
              </div>
            )}

            {/* Pro Monthly */}
            {proMonthlyProduct && (
              <div className="relative order-2 lg:order-2 pt-4">
                <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-white border border-gray-200 shadow-lg h-full">
                  <div className="text-center pt-2">
                    <h3 className="text-2xl font-bold text-gray-900">{proMonthlyProduct.name}</h3>
                    <p className="mt-2 text-sm text-gray-600">{proMonthlyProduct.description || 'Great for getting started'}</p>
                    <div className="mt-6">
                      <span className="text-5xl font-extrabold text-gray-900">€{proMonthlyProduct.price}</span>
                      <span className="text-lg text-gray-600">/month</span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{formatLimit(proMonthlyProduct.listingsLimit)}</p>
                      <p className="text-xs text-gray-600">Listings/Month</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{formatLimit(proMonthlyProduct.promotionCoupons)}</p>
                      <p className="text-xs text-gray-600">Promo Coupons/Mo</p>
                    </div>
                  </div>

                  {/* Features - with fallback */}
                  <ul className="mt-6 space-y-3 flex-grow">
                    {(proMonthlyProduct.features && proMonthlyProduct.features.length > 1
                      ? proMonthlyProduct.features.slice(0, 5)
                      : [
                          '20 listings per month',
                          '3 promo coupons/month',
                          'Unlimited AI chat',
                          'Unlimited saved searches',
                          'Basic analytics',
                        ]
                    ).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                          <CheckIcon className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelection(proMonthlyProduct)}
                    className="w-full mt-8 py-4 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-300 hover:border-primary hover:text-primary hover:shadow-lg transition-all duration-300 text-base"
                  >
                    Get Started - €{proMonthlyProduct.price}/month
                  </button>
                </div>
              </div>
            )}

            {/* Enterprise - For Teams */}
            {enterpriseProduct && (
              <div className="relative order-3 lg:order-3 pt-4">
                {/* Badge - Outside the card to prevent clipping */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    BEST FOR TEAMS
                  </span>
                </div>

                <div className="rounded-3xl p-6 sm:p-8 flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl h-full relative overflow-hidden">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="text-center pt-2 relative z-10">
                    <div className="flex items-center justify-center gap-2">
                      <BuildingOfficeIcon className="w-7 h-7 text-amber-400" />
                      <h3 className="text-2xl font-bold">{enterpriseProduct.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      {enterpriseProduct.description || 'Complete solution for real estate agencies'}
                    </p>
                    <div className="mt-6">
                      <span className="text-5xl font-extrabold">€{enterpriseProduct.price}</span>
                      <span className="text-lg text-gray-400">/year</span>
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="mt-6 grid grid-cols-2 gap-3 relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <p className="text-2xl font-bold text-amber-400">{formatLimit(enterpriseProduct.listingsLimit)}</p>
                      <p className="text-xs text-gray-400">Listings</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <p className="text-2xl font-bold text-amber-400">5</p>
                      <p className="text-xs text-gray-400">Team Members</p>
                    </div>
                  </div>

                  {/* Features - with fallback */}
                  <ul className="mt-6 space-y-3 flex-grow relative z-10">
                    {(enterpriseProduct.features && enterpriseProduct.features.length > 1
                      ? enterpriseProduct.features.slice(0, 6)
                      : [
                          '500 listings (expandable)',
                          '5 team members included',
                          'Agency branding page',
                          '5 promo coupons/month',
                          'Unlimited AI & insights',
                          'Dedicated account manager',
                        ]
                    ).map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center mt-0.5">
                          <CheckIcon className="w-3 h-3 text-amber-400" />
                        </div>
                        <span className="text-sm text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelection(enterpriseProduct)}
                    className="w-full mt-8 py-4 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all duration-300 text-base relative z-10"
                  >
                    Get Started - €{enterpriseProduct.price}/year
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buyer Plans */}
        {!loading && !error && activeTab === 'buyer' && (
          <div className="max-w-md mx-auto">
            {buyerProduct ? (
              <div className="relative rounded-3xl p-8 flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-2 border-blue-300 shadow-xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    BUYER PRO
                  </span>
                </div>

                <div className="text-center pt-4">
                  <h3 className="text-2xl font-bold text-gray-900">{buyerProduct.name}</h3>
                  <p className="mt-2 text-sm text-gray-600">{buyerProduct.description}</p>
                  <div className="mt-6">
                    <span className="text-5xl font-extrabold text-gray-900">€{buyerProduct.price}</span>
                    <span className="text-lg text-gray-600">/month</span>
                  </div>
                </div>

                <ul className="mt-8 space-y-4 flex-grow">
                  {buyerProduct.features?.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                        <CheckIcon className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelection(buyerProduct)}
                  className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 text-base"
                >
                  Get Started - €{buyerProduct.price}/month
                </button>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-600">No buyer plans available at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* No Products */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
              <p className="text-gray-600">{t('pricing:noPlans', 'No pricing plans available. Please run the seed script.')}</p>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-16 sm:mt-20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <ShieldCheckIcon className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.moneyBack', '30-Day Money Back')}</h4>
              <p className="text-sm text-gray-600 mt-1">Full refund if not satisfied</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <ChartBarIcon className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.moreViews', '3x More Views')}</h4>
              <p className="text-sm text-gray-600 mt-1">Premium listings get more exposure</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <BoltIcon className="w-7 h-7 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.instantActivation', 'Instant Activation')}</h4>
              <p className="text-sm text-gray-600 mt-1">Start selling immediately</p>
            </div>
          </div>
        </div>

        {/* Legal Links - Required for Paddle Domain Approval */}
        <div className="mt-12 sm:mt-16">
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl border border-gray-200 p-6 sm:p-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <LockClosedIcon className="w-5 h-5 text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {t('pricing:legal.title', 'Secure Payments & Policies')}
              </h4>
            </div>
            <p className="text-sm text-gray-600 text-center mb-6">
              {t('pricing:legal.description', 'All payments are processed securely by Paddle. By subscribing, you agree to our policies:')}
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              <button
                onClick={() => handleLegalNavigation('terms')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
              >
                <DocumentTextIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                  {t('pricing:legal.termsOfService', 'Terms of Service')}
                </span>
              </button>
              <button
                onClick={() => handleLegalNavigation('privacy')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
              >
                <LockClosedIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                  {t('pricing:legal.privacyPolicy', 'Privacy Policy')}
                </span>
              </button>
              <button
                onClick={() => handleLegalNavigation('refund')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
              >
                <ShieldCheckIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                  {t('pricing:legal.refundPolicy', 'Refund Policy')}
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              {t('pricing:legal.paddleNote', 'Payments handled by Paddle.com as Merchant of Record. VAT/taxes included where applicable.')}
            </p>
          </div>
        </div>

        {/* FAQ or Contact CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Have questions?
          </p>
          <div className="relative inline-block">
            <button
              onClick={() => setShowContactOptions(!showContactOptions)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact our sales team
              <svg className={`w-4 h-4 transition-transform ${showContactOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showContactOptions && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[280px] z-20 animate-fade-in">
                <a
                  href={`mailto:${salesEmail}?subject=BalkanEstate%20Pricing%20Inquiry`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Send us an email</p>
                    <p className="text-xs text-gray-500">{salesEmail}</p>
                  </div>
                </a>
                <a
                  href={`tel:${salesPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Give us a call</p>
                    <p className="text-xs text-gray-500">{salesPhone}</p>
                  </div>
                </a>
              </div>
            )}
          </div>

          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: translate(-50%, 10px); }
              to { opacity: 1; transform: translate(-50%, 0); }
            }
            .animate-fade-in {
              animation: fade-in 0.2s ease-out;
            }
          `}</style>
        </div>
      </div>

      <Footer />

      {/* Payment Window */}
      {selectedPlan && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => {
            setShowPaymentWindow(false);
            setSelectedPlan(null);
          }}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          planInterval={selectedPlan.interval}
          userRole={getUserRole()}
          userEmail={state.currentUser?.email}
          userCountry={state.currentUser?.country || 'RS'}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          productId={selectedPlan.productId}
        />
      )}
    </div>
  );
};

export default PricingPage;
