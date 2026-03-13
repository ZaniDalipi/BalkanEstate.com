import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useNavigationDirection } from '@/src/components/ui/ViewTransition';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';
import { UserRole } from '@/types';
import { usePricingPageData, type Product } from '../hooks/usePricingData';

// Helper to build localized path
export const buildLocalizedPath = (path: string): string => {
  const currentLang = window.location.pathname.split('/')[1] || 'en';
  const validLangs = ['en', 'sq', 'sr', 'mk', 'bs', 'hr', 'bg', 'ro', 'el', 'me'];
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
  const { state, dispatch, checkAuthStatus } = useAppContext();
  const { setDirection } = useNavigationDirection();
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer' | 'listing' | 'agency'>('seller');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year' | 'once';
    productId: string;
  } | null>(null);
  const [showContactOptions, setShowContactOptions] = useState(false);

  // Listing promotion states
  const [selectedPromoTier, setSelectedPromoTier] = useState<'featured' | 'highlight' | 'premium' | null>(null);
  const [selectedListing, setSelectedListing] = useState<UserListing | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<7 | 30 | 90>(30);
  const [selectedAgencyDuration, setSelectedAgencyDuration] = useState<7 | 14 | 28 | 90>(28);
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

  // Default/fallback agency feature pricing (duration-based like listing promotions)
  const defaultAgencyFeaturePricing: Record<string, Record<number, number>> = {
    featured: { 7: 6.99, 14: 11.99, 28: 24.99, 90: 49.99 },
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

  // Get agency feature pricing (duration-based like listing promotions)
  const getAgencyPrice = (tier: string, duration: number): number => {
    const plan = agencyFeaturePlans.find(p => p.tier === tier);
    if (plan?.pricing) {
      const key = `duration${duration}` as 'duration7' | 'duration14' | 'duration28' | 'duration30' | 'duration90';
      return plan.pricing[key] ?? defaultAgencyFeaturePricing[tier]?.[duration] ?? 0;
    }
    return defaultAgencyFeaturePricing[tier]?.[duration] ?? 0;
  };

  const handleBack = () => {
    setDirection('back');
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

  // Get the current user's active seller plan level (0=none/free, 1=monthly, 2=yearly, 3=enterprise)
  const getCurrentSellerPlanLevel = (): number => {
    const user = state.currentUser;
    if (!user) return 0;

    const isActive =
      user.subscriptionStatus === 'active' ||
      user.subscriptionStatus === 'trial' ||
      user.subscriptionStatus === 'grace' ||
      user.subscription?.status === 'active' ||
      user.subscription?.status === 'trial';

    if (!isActive) return 0;

    const plan = ((user.subscription as any)?.plan || user.subscriptionPlan || '').toLowerCase();
    const tier = user.subscription?.tier || '';

    if (plan.includes('enterprise') || tier === 'agency_owner') return 3;
    if ((plan.includes('pro_yearly') || plan.includes('yearly')) && !plan.includes('buyer')) return 2;
    if ((plan.includes('pro_monthly') || plan.includes('monthly')) && !plan.includes('buyer')) return 1;

    return 0;
  };

  // Get the plan level of a target product (0=buyer/other, 1=monthly, 2=yearly, 3=enterprise)
  const getProductPlanLevel = (productId: string): number => {
    const id = productId.toLowerCase();
    if (id.includes('enterprise')) return 3;
    if (id.includes('yearly')) return 2;
    if (id.includes('monthly') && !id.includes('buyer')) return 1;
    return 0;
  };

  const handlePlanSelection = (product: Product) => {
    // Require authentication to proceed
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

    // Role-based plan access: sellers/agents get seller plans, buyers get buyer plans, enterprise requires agent
    const userRole = state.currentUser.role;
    const isBuyerPlan = product.productId.toLowerCase().includes('buyer');
    const isSellerPlan = !isBuyerPlan; // monthly, yearly, enterprise are all seller-track plans

    if (isBuyerPlan && userRole !== UserRole.BUYER) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'info',
          title: t('pricing:role.buyerPlanOnly', 'Buyer Plan'),
          message: t(
            'pricing:role.buyerPlanOnlyMessage',
            'This plan is for buyers. Please switch to a Buyer account in your profile settings to subscribe.'
          ),
        },
      });
      return;
    }

    if (isSellerPlan && userRole === UserRole.BUYER) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'info',
          title: t('pricing:role.sellerPlanOnly', 'Seller Plan'),
          message: t(
            'pricing:role.sellerPlanOnlyMessage',
            'This plan is for sellers and agents. Please switch to a Private Seller or Agent account in your profile settings to subscribe.'
          ),
        },
      });
      return;
    }

    // Enforce upgrade path: monthly → yearly → enterprise (no downgrades or same-tier)
    const targetLevel = getProductPlanLevel(product.productId);
    if (targetLevel > 0) {
      const currentLevel = getCurrentSellerPlanLevel();

      if (currentLevel >= 3) {
        // Enterprise users can't switch to anything else
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'info',
            title: t('pricing:upgrade.alreadyEnterprise', 'You Have the Top Plan'),
            message: t(
              'pricing:upgrade.alreadyEnterpriseMessage',
              'You already have the Enterprise plan — the highest tier available. Manage your subscription from your account settings.'
            ),
          },
        });
        return;
      }

      if (currentLevel >= 2 && targetLevel <= 2) {
        // Yearly users can only upgrade to enterprise
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'info',
            title: t('pricing:upgrade.yearlyActive', 'Yearly Plan Active'),
            message: t(
              'pricing:upgrade.yearlyActiveMessage',
              'You already have a Yearly plan. You can only upgrade to the Enterprise plan.'
            ),
          },
        });
        return;
      }

      if (currentLevel >= 1 && targetLevel <= 1) {
        // Monthly users can't re-select monthly
        dispatch({
          type: 'SHOW_ALERT',
          payload: {
            type: 'info',
            title: t('pricing:upgrade.monthlyActive', 'Monthly Plan Active'),
            message: t(
              'pricing:upgrade.monthlyActiveMessage',
              'You already have a Monthly plan. You can upgrade to the Yearly or Enterprise plan.'
            ),
          },
        });
        return;
      }
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

    // Open payment window - supports coupon activation even while self-service payments are coming soon
    setSelectedPlan({
      name: product.name,
      price: product.price,
      interval: product.billingPeriod === 'yearly' ? 'year' : 'month',
      productId: product.productId,
    });
    setShowPaymentWindow(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentWindow(false);
    setSelectedPlan(null);

    // Refresh user data to get updated subscription state (buttons will now reflect new plan)
    try {
      await checkAuthStatus();
    } catch {
      // Non-critical: UI will update on next page load
    }

    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: t('pricing:success.title', 'Success!'),
        message: t(
          'pricing:success.subscriptionActivatedWithReceipt',
          'Your subscription has been activated. A receipt has been sent to your email.'
        ),
      },
    });
  };

  const handlePaymentError = (error: string) => {
    setShowPaymentWindow(false);
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'error',
        title: t('pricing:error.paymentFailed', 'Payment Failed'),
        message: error || t(
          'pricing:error.paymentFailedMessage',
          'Something went wrong with your payment. Please try again or contact support.'
        ),
      },
    });
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

  const handleAgencyFeature = (tier: string) => {
    if (!state.isAuthenticated) {
      dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true, view: 'login' } });
      return;
    }

    // Must have an agency to feature it
    if (!state.currentUser?.agencyId) {
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'warning',
          title: t('pricing:agency.needAgency', "Don't have an agency yet?"),
          message: t(
            'pricing:agency.needAgencyDescription',
            'Subscribe to our Enterprise plan to create your agency and unlock these features.'
          ),
        },
      });
      return;
    }

    // Open PaymentWindow for agency featuring (one-time payment, coupon supported)
    const plan = agencyFeaturePlans.find(p => p.tier === tier);
    const planName = plan?.name || 'Featured Agency';
    const price = getAgencyPrice(tier, selectedAgencyDuration);
    const durationLabel = selectedAgencyDuration === 7 ? '1 Week'
      : selectedAgencyDuration === 14 ? '2 Weeks'
      : selectedAgencyDuration === 28 ? '4 Weeks'
      : '90 Days';
    setSelectedPlan({
      name: `${planName} - ${durationLabel}`,
      price,
      interval: 'once' as any,
      productId: `${tier}_agency_${selectedAgencyDuration}days`,
    });
    setShowPaymentWindow(true);
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

  // Determine if a given product is the user's currently active plan
  const isActivePlan = (productId: string): boolean => {
    const user = state.currentUser;
    if (!user) return false;

    const isActive =
      user.subscriptionStatus === 'active' ||
      user.subscriptionStatus === 'trial' ||
      user.subscriptionStatus === 'grace' ||
      user.subscription?.status === 'active' ||
      user.subscription?.status === 'trial';

    if (!isActive) return false;

    const plan = ((user.subscription as any)?.plan || user.subscriptionPlan || '').toLowerCase();
    const tier = user.subscription?.tier || '';
    const id = productId.toLowerCase();

    // Enterprise
    if (id.includes('enterprise') && (plan.includes('enterprise') || tier === 'agency_owner')) return true;
    // Seller Pro Yearly
    if ((id.includes('pro_yearly') || (id.includes('yearly') && !id.includes('enterprise'))) &&
        !id.includes('buyer') &&
        (plan.includes('pro_yearly') || plan.includes('yearly')) &&
        !plan.includes('enterprise') && !plan.includes('buyer')) return true;
    // Seller Pro Monthly
    if ((id.includes('pro_monthly') || (id.includes('monthly') && !id.includes('buyer'))) &&
        !id.includes('buyer') &&
        (plan.includes('pro_monthly') || plan.includes('monthly')) &&
        !plan.includes('yearly') && !plan.includes('enterprise') && !plan.includes('buyer')) return true;
    // Buyer
    if (id.includes('buyer') && plan.includes('buyer')) return true;

    return false;
  };

  // Determine if a plan button should be disabled (current plan OR downgrade)
  const isPlanDisabled = (productId: string): boolean => {
    const targetLevel = getProductPlanLevel(productId);

    // Seller plans: disabled if target level <= current level (can't downgrade or re-select)
    if (targetLevel > 0) {
      const currentLevel = getCurrentSellerPlanLevel();
      if (currentLevel > 0 && targetLevel <= currentLevel) return true;
    }

    // Buyer plan: disabled if already has active buyer plan
    if (productId.toLowerCase().includes('buyer') && isActivePlan(productId)) return true;

    return false;
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
    // Promotion plans data
    agencyFeaturePlans,
    // Helper functions
    getPromotionPrice,
    getAgencyPrice,
    formatLimit,
    getBadgeColor,
    getBillingLabel,
    getUserRole,
    isActivePlan,
    isPlanDisabled,
    // Handlers
    handleBack,
    handleLegalNavigation,
    handlePlanSelection,
    handlePaymentSuccess,
    handlePaymentError,
    handlePromoteListing,
    handleSelectListingForPromotion,
    handlePurchasePromotion,
    handleAgencyFeature,
  };
}
