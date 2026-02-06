import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';
import { apiRequest } from '@/src/shared/api';
import { UserRole } from '@/types';
import { usePricingPageData, type Product } from '../hooks/usePricingData';

// Helper to build localized path
export const buildLocalizedPath = (path: string): string => {
  const currentLang = window.location.pathname.split('/')[1] || 'en';
  const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
  const lang = validLangs.includes(currentLang) ? currentLang : 'en';
  return `/${lang}${path === '/' ? '' : path}`;
};

export interface UserListing {
  id: string;
  address: string;
  price: number;
  imageUrl: string;
}

// Format limit value for display (-1 = unlimited)
export const formatLimit = (value?: number): string => {
  if (value === undefined || value === null) return '0';
  if (value === -1) return 'Unlimited';
  return value.toString();
};

export function usePricingPage() {
  const { t } = useTranslation(['pricing', 'common']);
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer' | 'listing' | 'agency'>('seller');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    productId: string;
  } | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);

  // Coupon activation modal states
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState(false);
  const [selectedCouponPlan, setSelectedCouponPlan] = useState<Product | null>(null);

  // Listing promotion states
  const [selectedPromoTier, setSelectedPromoTier] = useState<'featured' | 'highlight' | 'premium' | null>(null);
  const [selectedListing, setSelectedListing] = useState<UserListing | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<7 | 30 | 90>(30);
  const [selectedAgencyDuration, setSelectedAgencyDuration] = useState<7 | 30 | 90>(30);
  const [includeMapMarker, setIncludeMapMarker] = useState(false);

  // Use React Query for real-time data fetching
  const {
    products,
    isLoadingProducts: loading,
    productsError,
    listingPromotionPlans,
    agencyFeaturePlans,
    isLoadingPromotionPlans: loadingPlans,
    userListings,
    isLoadingUserListings: loadingListings,
    isRefetching,
  } = usePricingPageData(activeTab, state.isAuthenticated);

  // Convert error to string for display
  const error = productsError ? t('pricing:error.loadFailed', 'Failed to load pricing plans') : null;

  // Sales team contact info - imported from shared config
  const salesEmail = CONTACT_CONFIG.email.sales;
  const salesPhone = CONTACT_CONFIG.phone.primary;

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
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'login' },
      });
      return;
    }

    // Open coupon activation modal
    setSelectedCouponPlan(product);
    setCouponCode('');
    setCouponError(null);
    setCouponSuccess(false);
    setShowCouponModal(true);
  };

  const handleCouponActivation = async () => {
    if (!couponCode.trim() || !selectedCouponPlan) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const response = await apiRequest<{
        message: string;
        subscription: {
          id: string;
          productId: string;
          status: string;
          startDate: string;
          expirationDate: string;
        };
        user: {
          id: string;
          email: string;
          proSubscription: any;
        };
      }>('/subscriptions/activate-coupon', {
        method: 'POST',
        body: {
          couponCode: couponCode.trim(),
          productId: selectedCouponPlan.productId,
        },
        requiresAuth: true,
      });

      setCouponSuccess(true);

      // Update local user state
      if (response.user?.proSubscription) {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            isSubscribed: true,
            subscriptionPlan: selectedCouponPlan.productId,
            proSubscription: response.user.proSubscription,
          },
        });
      }

      // Show success and close after delay
      setTimeout(() => {
        setShowCouponModal(false);
        setCouponSuccess(false);
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'success',
            title: t('pricing:couponModal.successTitle', 'Subscription Activated!'),
            message: t('pricing:couponModal.successMessage', 'Your subscription has been activated successfully. Enjoy your plan!'),
          },
        });
      }, 2000);
    } catch (err: any) {
      setCouponError(err.message || t('pricing:couponModal.errorGeneric', 'Failed to activate discount code. Please try again.'));
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    // Log removed
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
    // Error removed
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
    // Payment integration pending
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
    // Payment integration pending
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

  return {
    // Translation
    t,
    // Context & state
    state,
    dispatch,
    // Tab state
    activeTab,
    setActiveTab,
    // Payment state
    showPaymentWindow,
    setShowPaymentWindow,
    selectedPlan,
    setSelectedPlan,
    showContactOptions,
    setShowContactOptions,
    // Listing promotion state
    selectedPromoTier,
    setSelectedPromoTier,
    selectedListing,
    setSelectedListing,
    selectedDuration,
    setSelectedDuration,
    selectedAgencyDuration,
    setSelectedAgencyDuration,
    includeMapMarker,
    setIncludeMapMarker,
    // Data from React Query
    products,
    loading,
    error,
    loadingPlans,
    userListings,
    loadingListings,
    isRefetching,
    // Contact info
    salesEmail,
    salesPhone,
    // Products
    enterpriseProduct,
    proYearlyProduct,
    proMonthlyProduct,
    buyerProduct,
    sellerProducts,
    // Helper functions
    getPromotionPrice,
    getAgencyPrice,
    formatLimit,
    getBadgeColor,
    getBillingLabel,
    getUserRole,
    // Coupon modal state
    showCouponModal,
    setShowCouponModal,
    couponCode,
    setCouponCode,
    couponLoading,
    couponError,
    setCouponError,
    couponSuccess,
    selectedCouponPlan,
    // Handlers
    handleBack,
    handleLegalNavigation,
    handlePlanSelection,
    handleCouponActivation,
    handlePaymentSuccess,
    handlePaymentError,
    handlePromoteListing,
    handleSelectListingForPromotion,
    handlePurchasePromotion,
    handleAgencyFeature,
  };
}
