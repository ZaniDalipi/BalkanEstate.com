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
  PageTransition,
  Animated,
  SlideIn,
  FadeIn,
  Skeleton,
} from '@/src/components/ui/Animations';
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
  LockClosedIcon,
  ExclamationTriangleIcon
} from '@/constants';
import { UserRole } from '@/types';

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

interface UserListing {
  id: string;
  address: string;
  price: number;
  imageUrl: string;
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
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer' | 'listing' | 'agency'>('seller');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    productId: string;
  } | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);

  // Listing promotion states
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedPromoTier, setSelectedPromoTier] = useState<'featured' | 'highlight' | 'premium' | null>(null);
  const [selectedListing, setSelectedListing] = useState<UserListing | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<7 | 30 | 90>(30);
  const [selectedAgencyDuration, setSelectedAgencyDuration] = useState<7 | 30 | 90>(30);
  const [includeMapMarker, setIncludeMapMarker] = useState(false);

  // Promotion plans from API
  const [listingPromotionPlans, setListingPromotionPlans] = useState<any[]>([]);
  const [agencyFeaturePlans, setAgencyFeaturePlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Sales team contact info
  const salesEmail = 'sales@balkanestateai.com';
  const salesPhone = '+389 71 967 915';

  // Default/fallback promotion pricing (used if API fails or returns no data)
  const defaultPromotionPricing: Record<string, Record<number, number>> = {
    featured: { 7: 9, 30: 29, 90: 69 },
    highlight: { 7: 19, 30: 49, 90: 119 },
    premium: { 7: 39, 30: 99, 90: 229 },
  };

  // Default/fallback agency feature pricing (using duration-based pricing now)
  const defaultAgencyFeaturePricing: Record<string, Record<number, number>> = {
    featured: { 7: 19, 30: 49, 90: 119 },
    addon: { 7: 9, 30: 25, 90: 59 },
  };

  // Get dynamic pricing from API or fallback to defaults
  const getPromotionPrice = (tier: string, duration: number): number => {
    const plan = listingPromotionPlans.find(p => p.tier === tier);
    if (plan?.pricing) {
      const key = `duration${duration}` as 'duration7' | 'duration30' | 'duration90';
      return plan.pricing[key] ?? defaultPromotionPricing[tier]?.[duration] ?? 0;
    }
    return defaultPromotionPricing[tier]?.[duration] ?? 0;
  };

  // Get agency feature pricing (now uses duration-based pricing like listing promotions)
  const getAgencyPrice = (tier: string, duration: number): number => {
    const plan = agencyFeaturePlans.find(p => p.tier === tier);
    if (plan?.pricing) {
      const key = `duration${duration}` as 'duration7' | 'duration30' | 'duration90';
      return plan.pricing[key] ?? defaultAgencyFeaturePricing[tier]?.[duration] ?? 0;
    }
    return defaultAgencyFeaturePricing[tier]?.[duration] ?? 0;
  };

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

  // Fetch promotion plans from API
  useEffect(() => {
    const fetchPromotionPlans = async () => {
      if (activeTab !== 'listing' && activeTab !== 'agency') return;

      setLoadingPlans(true);
      try {
        const response = await fetch(`${API_URL}/promotion-plans`);
        if (response.ok) {
          const data = await response.json();
          const plans = data.plans || [];
          setListingPromotionPlans(plans.filter((p: any) => p.category === 'listing'));
          setAgencyFeaturePlans(plans.filter((p: any) => p.category === 'agency'));
        }
      } catch (err) {
        console.error('Error fetching promotion plans:', err);
        // Fall back to defaults - no error shown to user
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPromotionPlans();
  }, [activeTab]);

  // Fetch user listings when on listing tab
  useEffect(() => {
    const fetchUserListings = async () => {
      if (activeTab !== 'listing' || !state.isAuthenticated) return;

      setLoadingListings(true);
      try {
        const token = localStorage.getItem('balkan_estate_token');
        const response = await fetch(`${API_URL}/properties/my/listings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserListings(
            (data.properties || []).map((p: any) => ({
              id: p._id || p.id,
              address: p.address || p.title || 'No address',
              price: p.price || 0,
              imageUrl: p.imageUrl || p.images?.[0] || '',
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching listings:', err);
      } finally {
        setLoadingListings(false);
      }
    };
    fetchUserListings();
  }, [activeTab, state.isAuthenticated]);

  const handleBack = () => {
    window.history.pushState({}, '', buildLocalizedPath('/'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleLegalNavigation = (page: 'terms' | 'privacy' | 'refund') => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: page });
    window.history.pushState({}, '', buildLocalizedPath(`/${page}`));
  };

  // Check if user is an agent (database as single source of truth)
  const isUserAgent = (): boolean => {
    const user = state.currentUser;
    if (!user) return false;

    return (
      user.availableRoles?.includes(UserRole.AGENT) ||
      user.role === UserRole.AGENT ||
      !!user.agentId ||
      !!user.licenseNumber
    );
  };

  // Check if user already has an agency
  const userHasAgency = (): boolean => {
    const user = state.currentUser;
    return !!(user?.agencyId);
  };

  // Check if user already has Enterprise subscription
  const hasEnterpriseSubscription = (): boolean => {
    const user = state.currentUser;
    if (!user) return false;

    const isEnterpriseTier =
      user.subscription?.tier === 'agency_owner' ||
      user.subscriptionPlan?.toLowerCase().includes('enterprise') ||
      user.subscriptionPlan?.toLowerCase().includes('agency');

    const isActiveSubscription =
      user.subscriptionStatus === 'active' ||
      user.subscriptionStatus === 'trial' ||
      user.subscriptionStatus === 'grace';

    return !!(isEnterpriseTier && isActiveSubscription);
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

    // For Enterprise plan, perform all checks
    const isEnterprisePlan = product.productId.includes('enterprise');

    if (isEnterprisePlan) {
      // Check 1: Must be an agent first
      if (!isUserAgent()) {
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'warning',
            title: t('pricing:enterprise.agentRequired', 'Agent Status Required'),
            message: t(
              'pricing:enterprise.agentRequiredMessage',
              'Only registered agents can create an agency. Please switch to Agent account type in your profile first.'
            ),
          },
        });
        dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'profile' });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
        window.history.pushState({}, '', buildLocalizedPath('/account'));
        return;
      }

      // Check 2: Cannot create agency if already have one
      if (userHasAgency()) {
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'info',
            title: t('pricing:enterprise.alreadyHaveAgency', 'You Already Have an Agency'),
            message: t(
              'pricing:enterprise.viewYourAgency',
              'You already have an agency. Visit your account to manage it.'
            ),
          },
        });
        dispatch({ type: 'SET_ACCOUNT_TAB', payload: 'agency' });
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'account' });
        window.history.pushState({}, '', buildLocalizedPath('/account/agency'));
        return;
      }

      // Check 3: If already has Enterprise subscription, skip payment
      if (hasEnterpriseSubscription()) {
        dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
        return;
      }

      // No Enterprise subscription yet - open modal to fill agency details, then go to payment
      dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
      return;
    }

    // For non-Enterprise plans (Pro Monthly, Pro Yearly, Buyer), proceed to payment directly
    setSelectedPlan({
      name: product.name,
      price: product.price,
      interval: product.billingPeriod === 'yearly' ? 'year' : 'month',
      productId: product.productId,
    });
    setShowPaymentWindow(true);
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

  // Listing promotion handlers
  const handlePromoteListing = (tier: 'featured' | 'highlight' | 'premium') => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    setSelectedPromoTier(tier);
  };

  const handleSelectListingForPromotion = (listing: UserListing) => {
    setSelectedListing(listing);
  };

  const handlePurchasePromotion = () => {
    if (!selectedListing || !selectedPromoTier) return;
    // TODO: Integrate with payment system
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'info',
        title: t('pricing:listing.comingSoon', 'Coming Soon'),
        message: t('pricing:listing.promotionComingSoon', 'Listing promotion will be available soon!'),
      },
    });
  };

  const handleAgencyFeature = (tier: 'spotlight' | 'homepage' | 'premium') => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }
    // TODO: Integrate with payment system
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'info',
        title: t('pricing:agency.comingSoon', 'Coming Soon'),
        message: t('pricing:agency.featureComingSoon', 'Agency featuring will be available soon!'),
      },
    });
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
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <SlideIn direction="down" duration="normal">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <SparklesIcon className="w-4 h-4" />
                <span>{t('pricing:simpleTransparent', 'Simple, transparent pricing')}</span>
              </div>
            </SlideIn>
            <Animated variant="fadeInUp" delay={100}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
                {t('pricing:title', 'Choose Your Plan')}
              </h2>
            </Animated>
            <Animated variant="fadeInUp" delay={200}>
              <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                {t('pricing:subtitle', 'Get your property in front of thousands of potential buyers with our flexible pricing options.')}
              </p>
            </Animated>
          </div>

        {/* Tab Switcher - Clean Pill Style */}
        <div className="flex justify-center mb-10 sm:mb-14">
          {/* Desktop: Single row with all tabs */}
          <div className="hidden sm:inline-flex bg-gray-100 p-1.5 rounded-full shadow-lg">
            {[
              {
                value: 'seller',
                label: t('pricing:tabs.forSellers', 'For Sellers'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                ),
              },
              {
                value: 'buyer',
                label: t('pricing:tabs.forBuyers', 'For Buyers'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                ),
              },
              {
                value: 'listing',
                label: t('pricing:tabs.listingHighlight', 'Highlight'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
              },
              {
                value: 'agency',
                label: t('pricing:tabs.agencyFeature', 'Agency'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as 'seller' | 'buyer' | 'listing' | 'agency')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile: Stacked 2x2 grid for better touch targets */}
          <div className="sm:hidden w-full max-w-sm">
            <div className="bg-gray-100 p-1.5 rounded-2xl shadow-lg">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'seller', label: t('pricing:tabs.forSellers', 'For Sellers') },
                  { value: 'buyer', label: t('pricing:tabs.forBuyers', 'For Buyers') },
                  { value: 'listing', label: t('pricing:tabs.listingHighlight', 'Highlight') },
                  { value: 'agency', label: t('pricing:tabs.agencyFeature', 'Agency') },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as 'seller' | 'buyer' | 'listing' | 'agency')}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeTab === tab.value
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* Loading State with Skeletons */}
          {loading && (
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 shadow-lg" style={{ animationDelay: `${i * 100}ms` }}>
                    <Skeleton variant="rectangular" height={24} className="rounded-lg mb-4 w-1/2 mx-auto" />
                    <Skeleton variant="text" className="w-3/4 mx-auto mb-2" />
                    <Skeleton variant="rectangular" height={48} className="rounded-lg w-2/3 mx-auto my-6" />
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Skeleton variant="rounded" height={60} />
                      <Skeleton variant="rounded" height={60} />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} variant="text" className={j === 4 ? 'w-1/2' : 'w-full'} />
                      ))}
                    </div>
                    <Skeleton variant="rounded" height={48} className="mt-6" />
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {/* Error State */}
          {error && (
            <Animated variant="scaleIn">
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
            </Animated>
          )}

          {/* Seller Plans */}
          {!loading && !error && activeTab === 'seller' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-stretch">

              {/* Pro Yearly - Most Popular */}
              {proYearlyProduct && (
                <Animated variant="fadeInUp" delay={0} className="relative order-1 lg:order-1 pt-4 lg:-translate-y-4">
                {/* Badge - Outside the card */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {t('pricing:badges.mostPopular', 'MOST POPULAR')}
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
                    <p className="mt-2 text-sm text-emerald-600 font-medium">{t('pricing:plans.proYearly.saveVsMonthly', 'Save 33% vs monthly')}</p>
                  </div>

                  {/* Key Metrics */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.listingsLimit)}</p>
                      <p className="text-xs text-gray-600">{t('pricing:metrics.listingsYear', 'Listings/Year')}</p>
                    </div>
                    <div className="bg-white/80 rounded-xl p-3 text-center border border-emerald-100">
                      <p className="text-2xl font-bold text-emerald-600">{formatLimit(proYearlyProduct.promotionCoupons)}</p>
                      <p className="text-xs text-gray-600">{t('pricing:metrics.promoCouponsMonth', 'Promo Coupons/Mo')}</p>
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
                    className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all duration-300 text-base press-effect"
                  >
                    {t('pricing:buttons.getStarted', 'Get Started')} - €{proYearlyProduct.price}{t('pricing:billing.perYear', '/year')}
                  </button>
                </div>
              </Animated>
            )}

            {/* Pro Monthly */}
            {proMonthlyProduct && (
              <Animated variant="fadeInUp" delay={100} className="relative order-2 lg:order-2 pt-4">
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
                      <p className="text-xs text-gray-600">{t('pricing:metrics.listingsMonth', 'Listings/Month')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{formatLimit(proMonthlyProduct.promotionCoupons)}</p>
                      <p className="text-xs text-gray-600">{t('pricing:metrics.promoCouponsMonth', 'Promo Coupons/Mo')}</p>
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
                    className="w-full mt-8 py-4 rounded-xl font-bold text-gray-700 bg-white border-2 border-gray-300 hover:border-primary hover:text-primary hover:shadow-lg transition-all duration-300 text-base press-effect"
                  >
                    {t('pricing:buttons.getStarted', 'Get Started')} - €{proMonthlyProduct.price}{t('pricing:billing.perMonth', '/month')}
                  </button>
                </div>
              </Animated>
            )}

            {/* Enterprise - For Teams */}
            {enterpriseProduct && (
              <Animated variant="fadeInUp" delay={200} className="relative order-3 lg:order-3 pt-4">
                {/* Badge - Outside the card to prevent clipping */}
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg whitespace-nowrap">
                    <UserGroupIcon className="w-3.5 h-3.5" />
                    {t('pricing:badges.bestForTeams', 'BEST FOR TEAMS')}
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
                      <p className="text-xs text-gray-400">{t('pricing:metrics.listings', 'Listings')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
                      <p className="text-2xl font-bold text-amber-400">5</p>
                      <p className="text-xs text-gray-400">{t('pricing:metrics.teamMembers', 'Team Members')}</p>
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
                    className="w-full mt-8 py-4 rounded-xl font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all duration-300 text-base relative z-10 press-effect"
                  >
                    {t('pricing:buttons.getStarted', 'Get Started')} - €{enterpriseProduct.price}{t('pricing:billing.perYear', '/year')}
                  </button>
                </div>
              </Animated>
            )}
          </div>
        )}

        {/* Buyer Plans */}
        {!loading && !error && activeTab === 'buyer' && (
          <Animated variant="fadeInUp" className="max-w-md mx-auto">
            {buyerProduct ? (
              <div className="relative rounded-3xl p-8 flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-2 border-blue-300 shadow-xl hover-lift">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                    <SparklesIcon className="w-3.5 h-3.5" />
                    {t('pricing:badges.buyerPro', 'BUYER PRO')}
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
                  {t('pricing:buttons.getStarted', 'Get Started')} - €{buyerProduct.price}{t('pricing:billing.perMonth', '/month')}
                </button>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-600">No buyer plans available at the moment.</p>
              </div>
            )}
          </Animated>
        )}

        {/* Listing Highlight / Promotion */}
        {activeTab === 'listing' && (
          <Animated variant="fadeInUp" className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('pricing:listing.title', 'Listing Promotion Plans')}</h3>
              <p className="mt-2 text-gray-600">{t('pricing:listing.subtitle', 'Boost your property listings to get more visibility and inquiries')}</p>
            </div>

            {/* Duration Selector - like Agency section */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-100 p-1 rounded-full inline-flex">
                {[
                  { value: 7, label: t('pricing:duration.7days', '7 days') },
                  { value: 30, label: t('pricing:duration.30days', '30 days') },
                  { value: 90, label: t('pricing:duration.90days', '90 days') },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDuration(option.value as 7 | 30 | 90)}
                    className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      selectedDuration === option.value
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listing selection modal/section */}
            {selectedPromoTier && (
              <div className="mb-8 bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-gray-900">
                    Select a listing to promote with {selectedPromoTier.charAt(0).toUpperCase() + selectedPromoTier.slice(1)}
                  </h4>
                  <button
                    onClick={() => { setSelectedPromoTier(null); setSelectedListing(null); }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {!state.isAuthenticated ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">{t('pricing:listing.loginRequired', 'Please log in to see your listings')}</p>
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } })}
                      className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                    >
                      {t('common:login', 'Log In')}
                    </button>
                  </div>
                ) : loadingListings ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
                  </div>
                ) : userListings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">{t('pricing:listing.noListings', 'You don\'t have any listings yet')}</p>
                    <button
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'create-listing' });
                        window.history.pushState({}, '', buildLocalizedPath('/create-listing'));
                      }}
                      className="px-6 py-2.5 bg-secondary text-white rounded-xl font-medium hover:bg-opacity-90 transition-colors"
                    >
                      {t('pricing:listing.createListing', '+ Create Listing')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Duration selector */}
                    <div className="mb-4 flex items-center gap-2 justify-center">
                      <span className="text-sm text-gray-600">Duration:</span>
                      {[7, 30, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => setSelectedDuration(days as 7 | 30 | 90)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedDuration === days
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>

                    {/* Listings grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
                      {userListings.map((listing) => (
                        <button
                          key={listing.id}
                          onClick={() => handleSelectListingForPromotion(listing)}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            selectedListing?.id === listing.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={listing.imageUrl}
                            alt={listing.address}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{listing.address}</p>
                            <p className="text-sm text-primary font-bold">€{listing.price.toLocaleString()}</p>
                          </div>
                          {selectedListing?.id === listing.id && (
                            <CheckIcon className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Purchase button */}
                    {selectedListing && (
                      <div className="mt-6 flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div>
                          <p className="text-sm text-gray-600">Promoting: <span className="font-medium text-gray-900">{selectedListing.address}</span></p>
                          <p className="text-lg font-bold text-gray-900">
                            €{getPromotionPrice(selectedPromoTier, selectedDuration)} for {selectedDuration} days
                          </p>
                        </div>
                        <button
                          onClick={handlePurchasePromotion}
                          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                        >
                          {t('pricing:listing.purchase', 'Purchase')}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Promotion Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Featured */}
              <div
                className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPromoTier === 'featured'
                    ? 'bg-purple-100 border-2 border-purple-400 shadow-xl scale-[1.02]'
                    : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 hover:shadow-lg hover:scale-[1.01]'
                }`}
                onClick={() => handlePromoteListing('featured')}
              >
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.featured.title', 'Featured')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.featured.description', 'Priority in search')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-purple-600">€{getPromotionPrice('featured', selectedDuration)}</span>
                  <span className="text-sm text-gray-500">+</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
                <ul className="mt-4 space-y-2 flex-grow">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.topOfSearch', 'Top of search')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.featuredBadge', 'Featured badge')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-purple-500">✓</span> {t('pricing:listing.tiers.featured.visibility', '2x visibility')}
                  </li>
                </ul>
              </div>

              {/* Highlight - Popular */}
              <div
                className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPromoTier === 'highlight'
                    ? 'bg-cyan-100 border-2 border-cyan-400 shadow-xl scale-[1.02]'
                    : 'bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-2 border-cyan-300 hover:shadow-lg hover:scale-[1.01]'
                }`}
                onClick={() => handlePromoteListing('highlight')}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <SparklesIcon className="w-3 h-3" />
                    {t('pricing:badges.popular', 'Popular')}
                  </span>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center mb-4 mt-2">
                  <span className="text-2xl">💎</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.highlight.title', 'Highlight')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.highlight.description', 'Stand out')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-cyan-600">€{getPromotionPrice('highlight', selectedDuration)}</span>
                  <span className="text-sm text-gray-500">+</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
                <ul className="mt-4 space-y-2 flex-grow">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.featuredBenefits', 'Featured benefits')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.coloredHighlight', 'Colored highlight')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-cyan-500">✓</span> {t('pricing:listing.tiers.highlight.visibility', '3x visibility')}
                  </li>
                </ul>
              </div>

              {/* Premium */}
              <div
                className={`relative rounded-3xl p-6 flex flex-col cursor-pointer transition-all duration-300 ${
                  selectedPromoTier === 'premium'
                    ? 'bg-amber-100 border-2 border-amber-400 shadow-xl scale-[1.02]'
                    : 'bg-gradient-to-br from-amber-50 to-yellow-100/50 border border-amber-200 hover:shadow-lg hover:scale-[1.01]'
                }`}
                onClick={() => handlePromoteListing('premium')}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900">{t('pricing:listing.tiers.premium.title', 'Premium')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:listing.tiers.premium.description', 'Homepage featured')}</p>
                <div className="mt-4">
                  <span className="text-3xl font-extrabold text-amber-600">€{getPromotionPrice('premium', selectedDuration)}</span>
                  <span className="text-sm text-gray-500">+</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedDuration} {t('pricing:listing.days', 'days')}</p>
                <ul className="mt-4 space-y-2 flex-grow">
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.highlightBenefits', 'Highlight benefits')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.homepageCarousel', 'Homepage carousel')}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-amber-500">✓</span> {t('pricing:listing.tiers.premium.visibility', '5x visibility')}
                  </li>
                </ul>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">💡</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{t('pricing:listing.howItWorks', 'How it works:')}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('pricing:listing.howItWorksDescription', 'Click on a promotion tier above to get started, or create a listing first.')}
                  </p>
                </div>
              </div>
            </div>
          </Animated>
        )}

        {/* Agency Feature */}
        {activeTab === 'agency' && (
          <Animated variant="fadeInUp" className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('pricing:agency.title', 'Featured Agency')}</h3>
              <p className="mt-2 text-gray-600">{t('pricing:agency.subtitle', 'Get your agency featured everywhere on the platform for 1 week')}</p>
            </div>

            {/* Single Featured Agency Package - 7 days */}
            <div className="relative rounded-3xl p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {t('pricing:agency.oneWeek', '1 WEEK')}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center gap-6 pt-4">
                {/* Left: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl">🏢</span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-gray-900">{t('pricing:agency.featuredTitle', 'Featured Agency')}</h4>
                      <p className="text-sm text-gray-600">{t('pricing:agency.featuredDescription', 'Shown everywhere on the platform')}</p>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {[
                      t('pricing:agency.benefits.featuredInDirectory', 'Featured in agency directory'),
                      t('pricing:agency.benefits.priorityInSearch', 'Priority in search results'),
                      t('pricing:agency.benefits.homepageCarousel', 'Homepage agency carousel'),
                      t('pricing:agency.benefits.featuredBadge', 'Featured badge on profile'),
                      t('pricing:agency.benefits.boostedVisibility', 'Boosted visibility everywhere (3x)'),
                      t('pricing:agency.benefits.mapMarker', 'Agency marker on property map'),
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                        <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                          <CheckIcon className="w-3 h-3 text-amber-700" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right: Pricing */}
                <div className="md:w-56 bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-amber-600">
                      €{getAgencyPrice('featured', 7)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{t('pricing:agency.perWeek', 'per week')}</p>
                    <p className="text-xs text-amber-600 font-medium mt-2">{t('pricing:agency.showsEverywhere', 'Shows everywhere!')}</p>
                  </div>

                  <button
                    onClick={() => handleAgencyFeature('featured' as any)}
                    className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                  >
                    {t('pricing:buttons.getFeatured', 'Get Featured')}
                  </button>
                </div>
              </div>
            </div>

            {/* Note for non-agency users */}
            {(!state.currentUser?.agencyId) && (
              <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{t('pricing:agency.needAgency', 'Don\'t have an agency yet?')}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('pricing:agency.needAgencyDescription', 'Subscribe to our Enterprise plan to create your agency and unlock these features.')}
                    </p>
                    <button
                      onClick={() => setActiveTab('seller')}
                      className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors press-effect"
                    >
                      {t('pricing:agency.viewEnterprise', 'View Enterprise Plan')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Animated>
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
            <Animated variant="fadeInUp" delay={0} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <ShieldCheckIcon className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.moneyBack', '30-Day Money Back')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.moneyBackDesc', 'Full refund if not satisfied')}</p>
            </Animated>
            <Animated variant="fadeInUp" delay={100} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <ChartBarIcon className="w-7 h-7 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.moreViews', '3x More Views')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.moreViewsDesc', 'Premium listings get more exposure')}</p>
            </Animated>
            <Animated variant="fadeInUp" delay={200} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <BoltIcon className="w-7 h-7 text-amber-600" />
              </div>
              <h4 className="font-bold text-gray-900">{t('pricing:benefits.instantActivation', 'Instant Activation')}</h4>
              <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.instantActivationDesc', 'Start selling immediately')}</p>
            </Animated>
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
            {t('pricing:contact.haveQuestions', 'Have questions?')}
          </p>
          <div className="relative inline-block">
            <button
              onClick={() => setShowContactOptions(!showContactOptions)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {t('pricing:contact.contactSales', 'Contact our sales team')}
              <svg className={`w-4 h-4 transition-transform ${showContactOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Contact popup - positioned above button with smooth fade */}
            <div
              className={`absolute bottom-full left-1/2 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[280px] z-20 transition-all duration-200 ease-out ${
                showContactOptions
                  ? 'opacity-100 visible -translate-x-1/2 translate-y-0'
                  : 'opacity-0 invisible -translate-x-1/2 translate-y-2 pointer-events-none'
              }`}
            >
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
                  <p className="text-sm font-semibold text-gray-900">{t('pricing:contact.sendEmail', 'Send us an email')}</p>
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
                  <p className="text-sm font-semibold text-gray-900">{t('pricing:contact.giveCall', 'Give us a call')}</p>
                  <p className="text-xs text-gray-500">{salesPhone}</p>
                </div>
              </a>
            </div>
          </div>
        </div>
        </div>
      </PageTransition>

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
