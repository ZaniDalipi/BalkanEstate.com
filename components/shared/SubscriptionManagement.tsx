import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon, SparklesIcon, HomeIcon, ChartBarIcon } from '../../constants';
import { useAppContext } from '../../context/AppContext';
import { User } from '../../types';
import PaymentWindow from './PaymentWindow';
import { replacePlaceholders, ProductValues } from '../../src/shared/utils/featurePlaceholders';
import { API_URL } from '../../src/shared/api/config';

interface SubscriptionManagementProps {
  userId: string;
}

// Subscription data from backend
interface SubscriptionData {
  _id: string;
  userId: string;
  store: string;
  productId: string;
  purchaseToken?: string;
  transactionId?: string;
  startDate: string;
  renewalDate: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'trial' | 'grace' | 'canceled' | 'pending_cancellation';
  autoRenewing: boolean;
  price: number;
  currency: string;
  isAcknowledged: boolean;
  willCancelAt?: string;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Product data from backend
interface ProductData {
  id: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'weekly' | 'quarterly' | 'one_time';
  features: string[];
  targetRole: string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  cardStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
  // Limit fields for placeholder replacement
  listingsLimit?: number;
  promotionCoupons?: number;
  premiumCoupons?: number;
  highlightedCoupons?: number;
  featuredCoupons?: number;
  agentCoupons?: number;
  teamMembersLimit?: number;
  savedSearchesLimit?: number;
  aiMessagesLimit?: number;
  aiInsightsLimit?: number;
  imageDescriptionLimit?: number;
  durationDays?: number;
}

// Plan structure for UI
interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  periodMonths: number;
  features: string[];
  listingLimit: number;
  color: string;
  tier: number;
  badge?: string;
  badgeColor?: string;
  highlighted?: boolean;
  // Dynamic feature limits
  savedSearchesLimit?: number | 'unlimited';
  promotionCouponsMonthly?: number | 'shared';
  aiMessagesLimit?: number | 'unlimited';
  analyticsLevel?: 'basic' | 'advanced' | 'full';
  supportType?: 'email' | 'priority' | 'agency';
}

// Default free plan (not in products DB)
const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  price: 0,
  period: 'forever',
  periodMonths: 0,
  features: ['3 active listings', '3 saved searches', '3 AI messages', '3 generate insights', 'Basic property details'],
  listingLimit: 3,
  color: 'from-gray-400 to-gray-500',
  tier: 0,
  savedSearchesLimit: 3,
  promotionCouponsMonthly: 0,
  aiMessagesLimit: 3,
  analyticsLevel: 'basic',
  supportType: 'email',
};

// Agency agent plan (obtained via coupon redemption, not purchasable)
const AGENCY_AGENT_PLAN: Plan = {
  id: 'agency_agent_yearly',
  name: 'Agency Pro',
  price: 0,
  period: 'year',
  periodMonths: 12,
  features: ['25 active listings', 'Unlimited saved searches', 'Unlimited AI chat', 'Full analytics', 'Agency team support'],
  listingLimit: 25,
  color: 'from-emerald-500 to-teal-600',
  tier: 2,
  badge: 'Agency Member',
  badgeColor: 'emerald',
  savedSearchesLimit: 'unlimited',
  promotionCouponsMonthly: 'shared',
  aiMessagesLimit: 'unlimited',
  analyticsLevel: 'full',
  supportType: 'agency',
};

// Map billing period to months
const PERIOD_TO_MONTHS: Record<string, number> = {
  monthly: 1,
  yearly: 12,
  weekly: 0.25,
  quarterly: 3,
  one_time: 0,
};

// Map product IDs to listing limits (NEW MONETIZATION SYSTEM)
// NOTE: These match the new product seeder values
const LISTING_LIMITS: Record<string, number> = {
  free: 3,
  seller_pro_monthly: 20,  // 20 listings per month
  seller_pro_yearly: 250,  // 250 listings per year
  seller_enterprise_yearly: 500, // 500 listings for enterprise
  // New tiers (from new monetization system)
  free_tier: 3,
  pro_monthly: 20,  // 20 listings per month
  pro_yearly: 250,  // 250 listings per year
  agency_yearly: 500,  // 500 listings for enterprise
  buyer_monthly: 0,  // Buyers don't create listings
  // Agency agent tier (joined via coupon)
  agency_agent_yearly: 25,  // 25 listings per year for agency agents
};

// Map product IDs to gradient colors
const PLAN_COLORS: Record<string, string> = {
  free: 'from-gray-400 to-gray-500',
  buyer_monthly: 'from-blue-500 to-indigo-600',   // Buyer Pro
  buyer_pro_monthly: 'from-blue-500 to-indigo-600',
  buyer_pro_yearly: 'from-indigo-500 to-purple-600',
  seller_pro_monthly: 'from-blue-500 to-blue-600',
  seller_pro_yearly: 'from-purple-500 to-purple-600',
  seller_enterprise_yearly: 'from-amber-500 to-orange-600',
  agency_agent_yearly: 'from-emerald-500 to-teal-600',
};

// Map product IDs to tiers
const PLAN_TIERS: Record<string, number> = {
  free: 0,
  buyer_monthly: 1,          // Buyer Pro
  buyer_pro_monthly: 1,
  buyer_pro_yearly: 2,
  seller_pro_monthly: 1,
  seller_pro_yearly: 2,
  seller_enterprise_yearly: 3,
  agency_agent_yearly: 2,
};

// Gift/Coupon icon component
const GiftIconComponent: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);

// Team Icon component
const TeamIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

// Copy icon component
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// Agent coupon data interface
interface AgentCouponData {
  code: string;
  status: 'available' | 'used' | 'expired';
  generatedAt: string;
  expiresAt: string;
  usedBy?: { name: string; email: string } | null;
  usedAt?: string;
}

interface AgencyTeamData {
  agencyId: string;
  invitationCode: string;
  totalAgents: number;
  maxAgents: number;
  agentCoupons: {
    coupons: AgentCouponData[];
    available: number;
    used: number;
    canGenerateMore: boolean;
  } | null;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ userId }) => {
  const { t } = useTranslation('subscription');
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [selectedUpgrade, setSelectedUpgrade] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Agency team tracking state
  const [agencyTeamData, setAgencyTeamData] = useState<AgencyTeamData | null>(null);
  const [loadingAgencyData, setLoadingAgencyData] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [generatingCoupons, setGeneratingCoupons] = useState(false);

  // Payment window state
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    productId: string;
  } | null>(null);

  const user = state.currentUser as User;

  // Fetch products from database — include buyer plans so subscription displays correctly
  const fetchProducts = useCallback(async () => {
    try {
      // Fetch both seller and buyer products so we can display any plan correctly
      const [sellerRes, buyerRes] = await Promise.all([
        fetch(`${API_URL}/products?role=seller`),
        fetch(`${API_URL}/products?role=buyer`),
      ]);
      const allProducts: ProductData[] = [];
      if (sellerRes.ok) {
        const d = await sellerRes.json();
        if (d.products) allProducts.push(...d.products);
      }
      if (buyerRes.ok) {
        const d = await buyerRes.json();
        if (d.products) {
          // Avoid duplicates
          const existingIds = new Set(allProducts.map(p => p.productId));
          d.products.forEach((p: ProductData) => {
            if (!existingIds.has(p.productId)) allProducts.push(p);
          });
        }
      }
      if (allProducts.length > 0) {
        setProducts(allProducts);
      }
    } catch {
      // Silently continue with empty products
    }
  }, []);

  // Fetch subscription data from backend
  const fetchSubscription = useCallback(async () => {
    try {
      const token = localStorage.getItem('balkan_estate_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/subscriptions/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert product to plan structure - using actual DB values
  const productToPlan = useCallback((product: ProductData): Plan => {
    const tier = PLAN_TIERS[product.productId] || 0;
    const isPro = tier >= 1;
    const isEnterprise = tier >= 3;

    // Use actual product values from DB, with fallbacks only for missing data
    const savedSearches = product.savedSearchesLimit;
    const promoCoupons = product.promotionCoupons;
    const aiMessages = product.aiMessagesLimit;

    return {
      id: product.productId,
      name: product.name,
      price: product.price,
      period: product.billingPeriod === 'yearly' ? 'year' : product.billingPeriod === 'monthly' ? 'month' : product.billingPeriod,
      periodMonths: PERIOD_TO_MONTHS[product.billingPeriod] || 1,
      features: product.features,
      // Use actual DB values for all limits
      listingLimit: product.listingsLimit ?? LISTING_LIMITS[product.productId] ?? 3,
      color: PLAN_COLORS[product.productId] || 'from-gray-400 to-gray-500',
      tier: tier,
      badge: product.badge,
      badgeColor: product.badgeColor,
      highlighted: product.highlighted,
      // Use actual DB values - (-1 means unlimited)
      savedSearchesLimit: savedSearches === -1 ? 'unlimited' : (savedSearches ?? 3),
      promotionCouponsMonthly: promoCoupons ?? 0,
      aiMessagesLimit: aiMessages === -1 ? 'unlimited' : (aiMessages ?? 3),
      // These are tier-based features (not stored in DB)
      analyticsLevel: isEnterprise ? 'full' : isPro ? 'advanced' : 'basic',
      supportType: isEnterprise ? 'priority' : isPro ? 'priority' : 'email',
    };
  }, []);

  // Build plans object from products
  const plans = useMemo(() => {
    const plansMap: Record<string, Plan> = {
      free: FREE_PLAN,
      agency_agent_yearly: AGENCY_AGENT_PLAN,  // Non-purchasable, obtained via coupon
    };
    products.forEach(product => {
      plansMap[product.productId] = productToPlan(product);
    });
    return plansMap;
  }, [products, productToPlan]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
    fetchSubscription();

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchSubscription, 30000);

    return () => clearInterval(interval);
  }, [fetchProducts, fetchSubscription, refreshKey]);

  // Listen for payment success events
  useEffect(() => {
    const handlePaymentSuccess = () => {
      // Refresh subscription data after successful payment
      setRefreshKey(prev => prev + 1);
      fetchSubscription();
    };

    window.addEventListener('paymentSuccess', handlePaymentSuccess);
    window.addEventListener('subscriptionUpdated', handlePaymentSuccess);

    return () => {
      window.removeEventListener('paymentSuccess', handlePaymentSuccess);
      window.removeEventListener('subscriptionUpdated', handlePaymentSuccess);
    };
  }, [fetchSubscription]);

  // Fetch agency team data if user is an agency owner
  useEffect(() => {
    const fetchAgencyTeamData = async () => {
      // Check if user has an agency (is agency owner)
      if (!user?.agencyId) return;

      setLoadingAgencyData(true);
      try {
        const token = localStorage.getItem('balkan_estate_token');
        if (!token) return;

        // Fetch agency details first to get invitation code
        const agencyResponse = await fetch(`${API_URL}/agencies/${user.agencyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!agencyResponse.ok) return;
        const agencyData = await agencyResponse.json();
        const agency = agencyData.agency;

        // Fetch agency coupons
        const couponsResponse = await fetch(`${API_URL}/agencies/${user.agencyId}/coupons`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        let agentCoupons = null;
        if (couponsResponse.ok) {
          const couponsData = await couponsResponse.json();
          agentCoupons = couponsData.agentCoupons;
        }

        setAgencyTeamData({
          agencyId: String(agency._id),
          invitationCode: agency.invitationCode || '',
          totalAgents: agency.totalAgents || agency.agents?.length || 0,
          maxAgents: 6, // Agency plan includes owner + 5 agents via coupons
          agentCoupons,
        });
      } catch (error) {
      } finally {
        setLoadingAgencyData(false);
      }
    };

    fetchAgencyTeamData();
  }, [user?.agencyId, refreshKey]);

  // Handle copying code to clipboard
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
    }
  };

  // Handle generating new agent coupons
  const handleGenerateCoupons = async () => {
    if (!agencyTeamData?.agencyId) return;

    setGeneratingCoupons(true);
    try {
      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/agencies/${agencyTeamData.agencyId}/coupons/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh the data
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await response.json();
        setActionError(data.message || 'Failed to generate coupons');
      }
    } catch (error) {
      setActionError('Failed to generate coupons');
    } finally {
      setGeneratingCoupons(false);
    }
  };

  // Calculate actual days in the subscription period based on calendar
  const calculateActualDays = (startDate: Date, endDate: Date): number => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Calculate subscription details with calendar-based days
  const subscriptionDetails = useMemo(() => {
    if (!subscription) return null;

    const now = new Date();
    const startDate = new Date(subscription.startDate);
    const expirationDate = new Date(subscription.expirationDate);
    const renewalDate = new Date(subscription.renewalDate);

    // Calculate actual days based on calendar (handles 28, 29, 30, 31 day months)
    const totalDays = calculateActualDays(startDate, expirationDate);
    const daysUsed = Math.max(0, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    const currentPlanKey = subscription.productId || 'free';
    const currentPlan = plans[currentPlanKey] || FREE_PLAN;

    // Calculate daily rate based on actual subscription price and days
    const actualPrice = subscription.price || currentPlan.price;
    const dailyRate = totalDays > 0 ? actualPrice / totalDays : 0;
    const usedValue = dailyRate * Math.min(daysUsed, totalDays);
    const remainingValue = Math.max(0, actualPrice - usedValue);
    const progressPercent = totalDays > 0 ? Math.min(100, (daysUsed / totalDays) * 100) : 0;

    // Check if this is a coupon/free subscription
    const isCoupon = subscription.price === 0 && currentPlanKey !== 'free';

    return {
      daysRemaining,
      daysUsed,
      totalDays,
      usedValue,
      remainingValue,
      dailyRate,
      progressPercent,
      currentPlan,
      currentPlanKey,
      isActive: subscription.status === 'active' && daysRemaining > 0,
      isExpired: subscription.status === 'expired' || expirationDate < now,
      isCoupon,
      autoRenewing: subscription.autoRenewing,
      price: subscription.price,
      currency: subscription.currency || 'EUR',
      expirationDate,
      startDate,
      renewalDate,
    };
  }, [subscription, plans]);

  // Get current product for placeholder replacement
  const currentProduct = useMemo((): ProductValues | null => {
    if (!subscription) return null;
    const product = products.find(p => p.productId === subscription.productId);
    if (!product) return null;
    return {
      listingsLimit: product.listingsLimit,
      promotionCoupons: product.promotionCoupons,
      premiumCoupons: product.premiumCoupons,
      highlightedCoupons: product.highlightedCoupons,
      featuredCoupons: product.featuredCoupons,
      agentCoupons: product.agentCoupons,
      teamMembersLimit: product.teamMembersLimit,
      savedSearchesLimit: product.savedSearchesLimit,
      aiMessagesLimit: product.aiMessagesLimit,
      aiInsightsLimit: product.aiInsightsLimit,
      imageDescriptionLimit: product.imageDescriptionLimit,
      price: product.price,
      durationDays: product.durationDays,
    };
  }, [subscription, products]);

  // Calculate upgrade price with pro-rated discount
  const calculateUpgradePrice = useCallback((targetPlanKey: string) => {
    if (!subscriptionDetails) return { originalPrice: 0, discount: 0, finalPrice: 0, savings: '' };

    const targetPlan = plans[targetPlanKey];
    if (!targetPlan) return { originalPrice: 0, discount: 0, finalPrice: 0, savings: '' };

    const originalPrice = targetPlan.price;

    // No discount for free users or expired subscriptions
    if (subscriptionDetails.currentPlanKey === 'free' || subscriptionDetails.isExpired) {
      return { originalPrice, discount: 0, finalPrice: originalPrice, savings: '' };
    }

    // No discount for coupon users (they paid 0)
    if (subscriptionDetails.isCoupon) {
      return { originalPrice, discount: 0, finalPrice: originalPrice, savings: '' };
    }

    const credit = subscriptionDetails.remainingValue;
    const discount = Math.min(credit, originalPrice * 0.5);
    const finalPrice = Math.max(0, originalPrice - discount);
    const savings = discount > 0 ? `You save €${discount.toFixed(2)} from your current plan!` : '';

    return { originalPrice, discount, finalPrice, savings };
  }, [subscriptionDetails, plans]);

  // Get available upgrade options
  const upgradeOptions = useMemo(() => {
    if (!subscriptionDetails || products.length === 0) return [];

    return Object.entries(plans)
      .filter(([key, plan]) => {
        if (key === 'free') return false;
        // agency_agent_yearly is NOT purchasable - only obtained via agency coupon redemption
        if (key === 'agency_agent_yearly') return false;
        // Hide Enterprise plan if user already owns/manages an agency
        if (key === 'agency_yearly' && user?.agencyId) return false;
        if (key === subscriptionDetails.currentPlanKey) return false;
        if (subscriptionDetails.currentPlanKey === 'seller_pro_monthly' && key === 'seller_pro_yearly') return true;
        return plan.tier > subscriptionDetails.currentPlan.tier;
      })
      .map(([key, plan]) => ({
        key,
        plan,
        pricing: calculateUpgradePrice(key),
      }))
      .sort((a, b) => a.plan.tier - b.plan.tier);
  }, [subscriptionDetails, plans, products, calculateUpgradePrice]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'grace': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-gray-100 text-gray-800';
      case 'pending_cancellation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending_cancellation': return 'CANCELLING';
      case 'canceled': return 'CANCELLED';
      case 'active': return 'ACTIVE';
      case 'expired': return 'EXPIRED';
      case 'trial': return 'TRIAL';
      case 'grace': return 'GRACE PERIOD';
      default: return status?.toUpperCase() || 'FREE';
    }
  };

  const handleUpgradeClick = (planKey: string) => {
    setSelectedUpgrade(planKey);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = () => {
    if (selectedUpgrade) {
      const plan = plans[selectedUpgrade];
      if (plan) {
        // Set up payment details
        setSelectedPlanForPayment({
          name: plan.name,
          price: calculateUpgradePrice(selectedUpgrade).finalPrice,
          interval: plan.period === 'year' ? 'year' : 'month',
          productId: selectedUpgrade,
        });
        // Open payment window
        setShowPaymentWindow(true);
      }
    }
    setShowUpgradeModal(false);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setShowPaymentWindow(false);
    setSelectedPlanForPayment(null);
    // Refresh subscription data
    fetchSubscription();
    // Dispatch event for other components
    window.dispatchEvent(new Event('subscriptionUpdated'));
    window.dispatchEvent(new Event('paymentSuccess'));
  };

  const handlePaymentError = (error: string) => {
    setActionError(error);
  };

  // Manual refresh button - syncs subscription counters
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Call backend sync endpoint to recount properties
      const token = localStorage.getItem('balkan_estate_token');
      const syncResponse = await fetch(`${API_URL}/auth/sync-stats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (syncResponse.ok) {
      }

      // Re-fetch current user to get updated subscription data
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (meResponse.ok) {
        const data = await meResponse.json();
        // Update user in context
        dispatch({ type: 'UPDATE_USER', payload: data.user });
      }

      // Trigger re-fetch of subscription data
      setRefreshKey(prev => prev + 1);
      fetchSubscription();
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // Helper to refresh user data in context
  const refreshUserContext = async (token: string) => {
    try {
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (meResponse.ok) {
        const data = await meResponse.json();
        dispatch({ type: 'UPDATE_USER', payload: data.user });
      }
    } catch (error) {
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    if (!subscription) return;

    try {
      setCancelling(true);
      setActionError(null);

      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/subscriptions/${subscription._id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setShowCancelModal(false);
        // Refresh subscription data
        fetchSubscription();
        // CRITICAL: Also refresh user context so RoleSelector gets updated
        if (token) await refreshUserContext(token);
        // Dispatch event for other components
        window.dispatchEvent(new Event('subscriptionUpdated'));
      } else {
        const data = await response.json();
        setActionError(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      setActionError('An error occurred while cancelling your subscription');
    } finally {
      setCancelling(false);
    }
  };

  // Restore subscription (undo cancellation) - with confirmation
  const handleRestoreSubscription = async () => {
    if (!subscription) return;

    // Show confirmation dialog
    const confirmed = window.confirm(t('management.validation.confirmRestore'));
    if (!confirmed) return;

    try {
      setRestoring(true);
      setActionError(null);

      const token = localStorage.getItem('balkan_estate_token');
      const response = await fetch(`${API_URL}/subscriptions/${subscription._id}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh subscription data
        fetchSubscription();
        // CRITICAL: Also refresh user context so RoleSelector gets updated
        if (token) await refreshUserContext(token);
        // Dispatch event for other components
        window.dispatchEvent(new Event('subscriptionUpdated'));
        // Show success message
        alert(t('management.validation.restoreSuccess'));
      } else {
        const data = await response.json();
        setActionError(data.message || t('management.validation.restoreError'));
      }
    } catch (error) {
      setActionError(t('management.validation.restoreError'));
    } finally {
      setRestoring(false);
    }
  };

  // Toggle auto-renewal on/off - with confirmation
  const handleToggleAutoRenewal = async () => {
    if (!subscription) return;

    // Show confirmation dialog
    const action = subscription.autoRenewing
      ? t('management.validation.disableAutoRenewal')
      : t('management.validation.enableAutoRenewal');
    const confirmed = window.confirm(t('management.validation.confirmToggleAutoRenewal', { action }));
    if (!confirmed) return;

    try {
      setTogglingAutoRenew(true);
      setActionError(null);

      const token = localStorage.getItem('balkan_estate_token');

      // If auto-renewing is ON, we want to turn it OFF (cancel)
      // If auto-renewing is OFF, we want to turn it ON (restore)
      const endpoint = subscription.autoRenewing
        ? `${API_URL}/subscriptions/${subscription._id}/cancel`
        : `${API_URL}/subscriptions/${subscription._id}/restore`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh subscription data
        fetchSubscription();
        // CRITICAL: Also refresh user context so RoleSelector gets updated
        if (token) await refreshUserContext(token);
        // Dispatch event for other components
        window.dispatchEvent(new Event('subscriptionUpdated'));
        // Show success message
        const status = subscription.autoRenewing
          ? t('management.validation.disabled')
          : t('management.validation.enabled');
        alert(t('management.validation.toggleAutoRenewalSuccess', { status }));
      } else {
        const data = await response.json();
        setActionError(data.message || t('management.validation.toggleAutoRenewalError'));
      }
    } catch (error) {
      setActionError(t('management.validation.toggleAutoRenewalError'));
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  // Check if subscription is pending cancellation or cancelled but not yet expired
  const isPendingCancellation = subscription?.status === 'pending_cancellation';
  const isCancelledButActive = subscription?.status === 'canceled' && subscriptionDetails && !subscriptionDetails.isExpired;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-neutral-600 font-medium">Loading your subscription...</p>
        </div>
      </div>
    );
  }

  // Show "No Active Subscription" only if there's truly no subscription
  // OR if the subscription is cancelled AND expired
  const showNoSubscription = !subscription || !subscriptionDetails ||
    (subscription?.status === 'canceled' && subscriptionDetails?.isExpired) ||
    (subscription?.status === 'expired');

  if (showNoSubscription && !isCancelledButActive) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-primary-light/5 to-white rounded-2xl shadow-lg border border-neutral-200/50 p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl -z-10"></div>

          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 mb-2">
              <XCircleIcon className="w-10 h-10 text-neutral-400" />
            </div>

            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">No Active Subscription</h3>
              <p className="text-neutral-600 text-lg max-w-md mx-auto">
                Unlock premium features and take your experience to the next level
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto pt-4">
              {['250 Listings/Year', '3 Promo Coupons/Month', 'Unlimited AI Chat', '20 Insights/Month'].map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-200">
                  <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-neutral-700">{benefit}</span>
                </div>
              ))}
            </div>

            <a
              href="/subscribe"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-300 mt-4 cursor-pointer"
            >
              <SparklesIcon className="w-5 h-5" />
              View Plans & Pricing
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-800">Subscription Management</h2>
        <button
          onClick={handleRefresh}
          className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Current Subscription Card */}
      <div className={`bg-gradient-to-br ${subscriptionDetails.currentPlan.color} rounded-2xl p-6 text-white shadow-xl relative overflow-hidden`}>
        {/* Coupon Badge - positioned to not overlap with content */}
        {subscriptionDetails.isCoupon && (
          <div className="absolute top-0 left-0 right-0 flex justify-center -mt-0">
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-yellow-400 text-yellow-900 rounded-b-lg shadow-md">
              <GiftIconComponent className="w-4 h-4" />
              <span className="text-xs font-bold">COUPON APPLIED</span>
            </div>
          </div>
        )}

        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${subscriptionDetails.isCoupon ? 'mt-4' : ''}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                <ChartBarIcon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold truncate">{subscriptionDetails.currentPlan.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(subscription.status)}`}>
                    {getStatusLabel(subscription.status)}
                  </span>
                  {subscriptionDetails.isCoupon && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      FREE TRIAL
                    </span>
                  )}
                  {isPendingCancellation && (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                      Ends {formatDate(subscriptionDetails.expirationDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-white/80 text-sm">
              {subscriptionDetails.isCoupon ? (
                'Free coupon subscription'
              ) : subscriptionDetails.currentPlan.price > 0 ? (
                `€${subscriptionDetails.price}/${subscriptionDetails.currentPlan.period}`
              ) : (
                'Free forever'
              )}
            </p>
          </div>

          {/* Days remaining progress */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 min-w-[200px] md:min-w-[220px] flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">Time Remaining</span>
              <span className="text-2xl font-bold">{subscriptionDetails.daysRemaining}</span>
            </div>
            <div className="text-xs text-white/70 text-right mb-2">
              {subscriptionDetails.daysRemaining === 1 ? 'day left' : 'days left'}
            </div>
            <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500 relative"
                style={{ width: `${100 - subscriptionDetails.progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-white/70 mt-2">
              <span>{subscriptionDetails.daysUsed} used</span>
              <span>{subscriptionDetails.totalDays} total</span>
            </div>
          </div>
        </div>

        {/* Subscription dates */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-white/70">Started</span>
            <p className="font-semibold">{formatDate(subscriptionDetails.startDate)}</p>
          </div>
          <div>
            <span className="text-white/70">Expires</span>
            <p className="font-semibold">{formatDate(subscriptionDetails.expirationDate)}</p>
          </div>
          <div>
            <span className="text-white/70">Auto-Renew</span>
            <p className="font-semibold flex items-center gap-1">
              {subscriptionDetails.autoRenewing ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-green-300" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="w-4 h-4 text-red-300" />
                  <span>Disabled</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Plan features */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-sm text-white/70 mb-2">Your plan includes:</p>
          <div className="flex flex-wrap gap-2">
            {subscriptionDetails.currentPlan.features.map((feature, idx) => (
              <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 rounded-full text-xs">
                <CheckCircleIcon className="w-3 h-3" />
                {currentProduct ? replacePlaceholders(feature, currentProduct) : feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Listing Limit Info */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HomeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800">Listing Limit</p>
              <p className="text-sm text-neutral-500">
                {user.subscription?.activeListingsCount || user.listingsCount || 0} of {currentProduct?.listingsLimit ?? subscriptionDetails.currentPlan.listingLimit} listings used
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-800">
              {(currentProduct?.listingsLimit ?? subscriptionDetails.currentPlan.listingLimit) - (user.subscription?.activeListingsCount || user.listingsCount || 0)}
            </p>
            <p className="text-xs text-neutral-500">remaining</p>
          </div>
        </div>
        <div className="mt-3 w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, ((user.subscription?.activeListingsCount || user.listingsCount || 0) / (currentProduct?.listingsLimit ?? subscriptionDetails.currentPlan.listingLimit)) * 100)}%` }}
          />
        </div>
      </div>

      {/* What's Included in Your Plan - Prominent Feature Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-primary" />
          {t('management.whatsIncluded.title', { plan: subscriptionDetails.currentPlan.name })}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Listings - from DB product */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <HomeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-neutral-800">
                {currentProduct?.listingsLimit ?? subscriptionDetails.currentPlan.listingLimit} Active Listings
              </p>
              <p className="text-sm text-neutral-500">
                {subscriptionDetails.currentPlan.period === 'year' ? 'Per year' : subscriptionDetails.currentPlan.period === 'month' ? 'Per month' : 'Total available'}
              </p>
            </div>
          </div>

          {/* Saved Searches - from DB product */}
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-800">
                {(currentProduct?.savedSearchesLimit ?? -1) === -1 || subscriptionDetails.currentPlan.savedSearchesLimit === 'unlimited'
                  ? 'Unlimited Saved Searches'
                  : `${currentProduct?.savedSearchesLimit ?? subscriptionDetails.currentPlan.savedSearchesLimit ?? 3} Saved Searches`}
              </p>
              <p className="text-sm text-neutral-500">
                {t('management.whatsIncluded.savedSearchesDesc')}
              </p>
            </div>
          </div>

          {/* Promotion Coupons - from DB product */}
          {(() => {
            const promoCoupons = currentProduct?.promotionCoupons ?? 0;
            const isShared = subscriptionDetails.currentPlan.promotionCouponsMonthly === 'shared';
            const hasPromoCoupons = promoCoupons > 0 || isShared;
            return (
              <div className={`flex items-start gap-3 p-3 ${hasPromoCoupons ? 'bg-amber-50' : 'bg-neutral-50'} rounded-lg`}>
                <div className={`p-2 ${hasPromoCoupons ? 'bg-amber-100' : 'bg-neutral-100'} rounded-lg flex-shrink-0`}>
                  <GiftIconComponent className={`w-5 h-5 ${hasPromoCoupons ? 'text-amber-600' : 'text-neutral-400'}`} />
                </div>
                <div>
                  <p className={`font-semibold ${hasPromoCoupons ? 'text-neutral-800' : 'text-neutral-400'}`}>
                    {isShared
                      ? 'Shared Agency Pool'
                      : promoCoupons > 0
                        ? `${promoCoupons} Promotion Coupons/Month`
                        : t('management.whatsIncluded.noPromotionCoupons')}
                  </p>
                  <p className="text-sm text-neutral-500">
                    {isShared
                      ? 'Use promotion coupons from agency pool'
                      : promoCoupons > 0
                        ? t('management.whatsIncluded.promotionCouponsDesc')
                        : t('management.whatsIncluded.upgradeForPromotion')}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Analytics - from plan */}
          <div className={`flex items-start gap-3 p-3 ${subscriptionDetails.currentPlan.analyticsLevel !== 'basic' ? 'bg-green-50' : 'bg-neutral-50'} rounded-lg`}>
            <div className={`p-2 ${subscriptionDetails.currentPlan.analyticsLevel !== 'basic' ? 'bg-green-100' : 'bg-neutral-100'} rounded-lg flex-shrink-0`}>
              <ChartBarIcon className={`w-5 h-5 ${subscriptionDetails.currentPlan.analyticsLevel !== 'basic' ? 'text-green-600' : 'text-neutral-400'}`} />
            </div>
            <div>
              <p className={`font-semibold ${subscriptionDetails.currentPlan.analyticsLevel !== 'basic' ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {subscriptionDetails.currentPlan.analyticsLevel === 'full'
                  ? 'Full Analytics'
                  : subscriptionDetails.currentPlan.analyticsLevel === 'advanced'
                    ? t('management.whatsIncluded.advancedAnalytics')
                    : t('management.whatsIncluded.basicAnalytics')}
              </p>
              <p className="text-sm text-neutral-500">
                {subscriptionDetails.currentPlan.analyticsLevel !== 'basic'
                  ? t('management.whatsIncluded.advancedAnalyticsDesc')
                  : t('management.whatsIncluded.basicAnalyticsDesc')}
              </p>
            </div>
          </div>

          {/* Support - from plan */}
          <div className={`flex items-start gap-3 p-3 ${subscriptionDetails.currentPlan.supportType !== 'email' ? 'bg-indigo-50' : 'bg-neutral-50'} rounded-lg`}>
            <div className={`p-2 ${subscriptionDetails.currentPlan.supportType !== 'email' ? 'bg-indigo-100' : 'bg-neutral-100'} rounded-lg flex-shrink-0`}>
              <svg className={`w-5 h-5 ${subscriptionDetails.currentPlan.supportType !== 'email' ? 'text-indigo-600' : 'text-neutral-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className={`font-semibold ${subscriptionDetails.currentPlan.supportType !== 'email' ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {subscriptionDetails.currentPlan.supportType === 'agency'
                  ? 'Agency Team Support'
                  : subscriptionDetails.currentPlan.supportType === 'priority'
                    ? t('management.whatsIncluded.prioritySupport')
                    : t('management.whatsIncluded.emailSupport')}
              </p>
              <p className="text-sm text-neutral-500">
                {subscriptionDetails.currentPlan.supportType === 'agency'
                  ? 'Get help from your agency admin'
                  : subscriptionDetails.currentPlan.supportType === 'priority'
                    ? t('management.whatsIncluded.prioritySupportDesc')
                    : t('management.whatsIncluded.emailSupportDesc')}
              </p>
            </div>
          </div>

          {/* Verified Badge - Pro only */}
          <div className={`flex items-start gap-3 p-3 ${subscriptionDetails.currentPlan.tier >= 1 ? 'bg-cyan-50' : 'bg-neutral-50'} rounded-lg`}>
            <div className={`p-2 ${subscriptionDetails.currentPlan.tier >= 1 ? 'bg-cyan-100' : 'bg-neutral-100'} rounded-lg flex-shrink-0`}>
              <CheckCircleIcon className={`w-5 h-5 ${subscriptionDetails.currentPlan.tier >= 1 ? 'text-cyan-600' : 'text-neutral-400'}`} />
            </div>
            <div>
              <p className={`font-semibold ${subscriptionDetails.currentPlan.tier >= 1 ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {subscriptionDetails.currentPlan.tier >= 1
                  ? t('management.whatsIncluded.verifiedBadge')
                  : t('management.whatsIncluded.noBadge')}
              </p>
              <p className="text-sm text-neutral-500">
                {subscriptionDetails.currentPlan.tier >= 1
                  ? t('management.whatsIncluded.verifiedBadgeDesc')
                  : t('management.whatsIncluded.noBadgeDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA for free users */}
        {subscriptionDetails.currentPlan.tier === 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-neutral-800">{t('management.whatsIncluded.wantMoreFeatures')}</p>
                <p className="text-sm text-neutral-600">{t('management.whatsIncluded.upgradeToProDesc')}</p>
              </div>
              <a
                href="/subscribe"
                className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
              >
                <SparklesIcon className="w-4 h-4" />
                {t('management.upgradeNow')}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Team Members Section - Only show for agency owners */}
      {agencyTeamData && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          {/* Header with count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TeamIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-neutral-800">Team Members</p>
                <p className="text-sm text-neutral-500">
                  {agencyTeamData.totalAgents} of {agencyTeamData.maxAgents} agents registered
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-neutral-800">
                {agencyTeamData.maxAgents - agencyTeamData.totalAgents}
              </p>
              <p className="text-xs text-neutral-500">slots remaining</p>
            </div>
          </div>
          <div className="mt-3 w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (agencyTeamData.totalAgents / agencyTeamData.maxAgents) * 100)}%` }}
            />
          </div>

          {/* Invitation Code */}
          {agencyTeamData.invitationCode && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-sm font-medium text-neutral-700 mb-2">Agency Invitation Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                  <code className="text-sm font-mono text-neutral-800">{agencyTeamData.invitationCode}</code>
                  <button
                    onClick={() => handleCopyCode(agencyTeamData.invitationCode)}
                    className="p-1.5 text-neutral-500 hover:text-primary hover:bg-neutral-100 rounded-md transition-colors"
                    title="Copy code"
                  >
                    {copiedCode === agencyTeamData.invitationCode ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Share this code with agents to let them join your agency
              </p>
            </div>
          )}

          {/* Agent Coupons Section */}
          {agencyTeamData.agentCoupons && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-neutral-700">Agent Subscription Coupons</p>
                  <p className="text-xs text-neutral-500">
                    {agencyTeamData.agentCoupons.available} available • {agencyTeamData.agentCoupons.used} used
                  </p>
                </div>
                {agencyTeamData.agentCoupons.canGenerateMore && (
                  <button
                    onClick={handleGenerateCoupons}
                    disabled={generatingCoupons}
                    className="text-sm text-primary hover:text-primary-dark font-medium disabled:opacity-50"
                  >
                    {generatingCoupons ? 'Generating...' : '+ Generate Coupons'}
                  </button>
                )}
              </div>

              {/* Available coupons list */}
              {agencyTeamData.agentCoupons.coupons.filter(c => c.status === 'available').length > 0 ? (
                <div className="space-y-2">
                  {agencyTeamData.agentCoupons.coupons
                    .filter(c => c.status === 'available')
                    .map((coupon, idx) => (
                      <div
                        key={idx}
                        className="bg-green-50 border border-green-200 rounded-lg px-2 sm:px-3 py-2"
                      >
                        {/* Mobile: stacked layout, Desktop: side by side */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                            <code className="text-xs sm:text-sm font-mono text-green-800 truncate">{coupon.code}</code>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 pl-4 sm:pl-0">
                            <span className="text-xs text-green-600 whitespace-nowrap">
                              <span className="hidden sm:inline">Expires: </span>
                              {new Date(coupon.expiresAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-md transition-colors flex-shrink-0"
                              title="Copy coupon"
                            >
                              {copiedCode === coupon.code ? (
                                <CheckCircleIcon className="w-4 h-4" />
                              ) : (
                                <CopyIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-neutral-50 rounded-lg">
                  <p className="text-sm text-neutral-500">No available coupons</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Generate coupons to invite agents to your agency
                  </p>
                </div>
              )}

              {/* Used coupons list */}
              {agencyTeamData.agentCoupons.coupons.filter(c => c.status === 'used').length > 0 && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-sm font-medium text-neutral-700 mb-2">Redeemed Coupons</p>
                  <div className="space-y-2">
                    {agencyTeamData.agentCoupons.coupons
                      .filter(c => c.status === 'used')
                      .map((coupon, idx) => (
                        <div
                          key={idx}
                          className="bg-amber-50 border border-amber-200 rounded-lg px-2 sm:px-3 py-2"
                        >
                          {/* Mobile: stacked layout, Desktop: side by side */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                              <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0"></span>
                              <code className="text-xs sm:text-sm font-mono text-amber-800">{coupon.code}</code>
                              <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold bg-amber-200 text-amber-800 rounded">
                                USED
                              </span>
                            </div>
                            <span className="text-xs text-amber-700 pl-3.5 sm:pl-0">
                              {coupon.usedAt ? new Date(coupon.usedAt).toLocaleDateString() : 'Redeemed'}
                            </span>
                          </div>
                          {coupon.usedBy && (
                            <div className="mt-1.5 pl-3.5 sm:pl-4 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs text-amber-700">
                              <span className="font-medium truncate">{coupon.usedBy.name}</span>
                              <span className="hidden sm:inline text-amber-500">•</span>
                              <span className="truncate text-amber-600 sm:text-amber-700">{coupon.usedBy.email}</span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info about agent benefits */}
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs text-purple-700">
                <strong>Agent Benefits:</strong> Each agent gets 20 active listings per month with their subscription coupon.
                Agents can use the agency promotion pool for featured listings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Coupon Info Card */}
      {subscriptionDetails.isCoupon && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <GiftIconComponent className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h4 className="font-semibold text-yellow-900">Coupon Subscription</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You're enjoying this plan for free through a coupon code. When your free period ends,
                you can continue by subscribing to a paid plan.
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                Coupon value: FREE • Expires: {formatDate(subscriptionDetails.expirationDate)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Cancellation Notice */}
      {isPendingCancellation && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900">Subscription Cancellation Pending</h4>
              <p className="text-sm text-orange-700 mt-1">
                Your subscription will be cancelled at the end of your billing period on{' '}
                <span className="font-semibold">{formatDate(subscriptionDetails.expirationDate)}</span>.
                You'll continue to have access to all features until then.
              </p>
              <button
                onClick={handleRestoreSubscription}
                disabled={restoring}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Restoring...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Keep My Subscription
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Subscription Notice - still active until expiration */}
      {isCancelledButActive && !isPendingCancellation && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">Subscription Cancelled</h4>
              <p className="text-sm text-red-700 mt-1">
                Your subscription has been cancelled but you still have access until{' '}
                <span className="font-semibold">{formatDate(subscriptionDetails?.expirationDate || null)}</span>.
                After this date, you'll be downgraded to the free plan.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/subscribe"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Resubscribe
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Settings */}
      {!isPendingCancellation && !isCancelledButActive && subscriptionDetails.isActive && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Subscription Settings
          </h3>

          {/* Error message */}
          {actionError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {actionError}
            </div>
          )}

          <div className="space-y-4">
            {/* Auto-Renew Toggle - Mobile friendly layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-neutral-100 gap-3">
              <div className="flex-1">
                <p className="font-medium text-neutral-800">Auto-Renewal</p>
                <p className="text-sm text-neutral-500">
                  {subscriptionDetails.autoRenewing
                    ? `Renews on ${formatDate(subscriptionDetails.renewalDate)}`
                    : `Expires on ${formatDate(subscriptionDetails.expirationDate)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${subscriptionDetails.autoRenewing ? 'text-green-600' : 'text-neutral-500'}`}>
                  {subscriptionDetails.autoRenewing ? 'ON' : 'OFF'}
                </span>
                <button
                  onClick={handleToggleAutoRenewal}
                  disabled={togglingAutoRenew}
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    subscriptionDetails.autoRenewing
                      ? 'bg-green-500 focus:ring-green-500'
                      : 'bg-neutral-300 focus:ring-neutral-400'
                  } ${togglingAutoRenew ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  role="switch"
                  aria-checked={subscriptionDetails.autoRenewing}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      subscriptionDetails.autoRenewing ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                  {togglingAutoRenew && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Payment Method Info - Mobile friendly */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 border-b border-neutral-100 gap-2">
              <div>
                <p className="font-medium text-neutral-800">Payment Source</p>
                <p className="text-sm text-neutral-500 capitalize">{subscription.store || 'Web'} Payment</p>
              </div>
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 capitalize w-fit">
                {subscription.store || 'Web'}
              </span>
            </div>

            {/* Cancel Subscription - Mobile friendly */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
              <div>
                <p className="font-medium text-neutral-800">Cancel Subscription</p>
                <p className="text-sm text-neutral-500">
                  You'll keep access until {formatDate(subscriptionDetails.expirationDate)}
                </p>
              </div>
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 sm:border-0 text-center"
              >
                Cancel Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {upgradeOptions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-neutral-800 mb-4">Upgrade Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upgradeOptions.map(({ key, plan, pricing }) => {
              // Enhanced features for Enterprise plan
              const isEnterprise = key.includes('enterprise') || key.includes('agency_yearly');
              const displayFeatures = isEnterprise ? [
                '500 Active Listings',
                'Create Your Own Agency',
                '5 Agent Invitation Coupons',
                'Unlimited Saved Searches',
                'Full Analytics Dashboard',
                'Priority Support',
                '10 Monthly Promotion Coupons',
                'Team Management Tools',
              ] : plan.features;

              return (
                <div
                  key={key}
                  className={`bg-white rounded-xl border-2 ${plan.highlighted || isEnterprise ? 'border-primary' : 'border-neutral-200'} hover:border-primary transition-colors overflow-hidden shadow-sm hover:shadow-md relative`}
                >
                  {/* Badge */}
                  {(plan.badge || isEnterprise) && (
                    <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white ${isEnterprise ? 'bg-amber-500' : plan.badgeColor === 'red' ? 'bg-red-500' : plan.badgeColor === 'green' ? 'bg-green-500' : 'bg-amber-500'} rounded-bl-lg`}>
                      {isEnterprise ? 'Best for Agencies' : plan.badge}
                    </div>
                  )}
                  <div className={`bg-gradient-to-r ${plan.color} p-4 text-white`}>
                    <h4 className="font-bold text-lg">{plan.name}</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      {pricing.discount > 0 && (
                        <span className="text-sm line-through text-white/60">€{pricing.originalPrice}</span>
                      )}
                      <span className="text-2xl font-bold">€{pricing.finalPrice.toFixed(2)}</span>
                      <span className="text-sm text-white/80">/{plan.period}</span>
                    </div>
                    {pricing.savings && (
                      <p className="text-xs mt-1 bg-white/20 px-2 py-0.5 rounded-full inline-block">
                        {pricing.savings}
                      </p>
                    )}
                    {isEnterprise && (
                      <p className="text-xs mt-2 text-white/80">
                        Build and manage your real estate agency
                      </p>
                    )}
                  </div>
                  <div className="p-4">
                    <ul className="space-y-2 mb-4">
                      {displayFeatures.slice(0, isEnterprise ? 8 : displayFeatures.length).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-neutral-700">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleUpgradeClick(key)}
                      className={`w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r ${plan.color} hover:opacity-90 transition-opacity`}
                    >
                      {isEnterprise ? 'Start Your Agency' : 'Upgrade Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pro-rated Calculator Info */}
      {!subscriptionDetails.isCoupon && subscriptionDetails.currentPlan.price > 0 && subscriptionDetails.isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Pro-rated Upgrade Pricing</h4>
              <p className="text-sm text-blue-700 mt-1">
                When you upgrade, we calculate the unused value from your current plan (€{subscriptionDetails.remainingValue.toFixed(2)} remaining)
                and apply it as a discount to your new plan.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Daily rate: €{subscriptionDetails.dailyRate.toFixed(2)}/day •
                Days used: {subscriptionDetails.daysUsed} of {subscriptionDetails.totalDays} •
                Credit available: €{subscriptionDetails.remainingValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && selectedUpgrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-neutral-800 mb-4">Confirm Upgrade</h3>
            {(() => {
              const plan = plans[selectedUpgrade];
              const pricing = calculateUpgradePrice(selectedUpgrade);
              if (!plan) return null;
              return (
                <>
                  <div className="bg-neutral-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-neutral-600 mb-2">Upgrading to:</p>
                    <p className="text-lg font-bold text-neutral-800">{plan.name}</p>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-neutral-600">Original Price</span>
                        <span className="font-medium">€{pricing.originalPrice}</span>
                      </div>
                      {pricing.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Pro-rated Credit</span>
                          <span className="font-medium">-€{pricing.discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-neutral-200">
                        <span>Total Due</span>
                        <span className="text-primary">€{pricing.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  {pricing.discount > 0 && (
                    <p className="text-sm text-green-600 mb-4">{pricing.savings}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowUpgradeModal(false)}
                      className="flex-1 py-2.5 rounded-lg font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmUpgrade}
                      className="flex-1 py-2.5 rounded-lg font-bold text-white bg-primary hover:bg-primary-dark transition-colors"
                    >
                      Pay €{pricing.finalPrice.toFixed(2)}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 ${subscriptionDetails?.isCoupon ? 'bg-yellow-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                {subscriptionDetails?.isCoupon ? (
                  <GiftIconComponent className="w-8 h-8 text-yellow-600" />
                ) : (
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-neutral-800 mb-2">
                {subscriptionDetails?.isCoupon ? 'Cancel Free Trial?' : 'Cancel Subscription?'}
              </h3>
              <p className="text-neutral-600">
                Are you sure you want to cancel your <span className="font-semibold">{subscriptionDetails?.currentPlan.name}</span> {subscriptionDetails?.isCoupon ? 'free trial' : 'subscription'}?
              </p>
            </div>

            {/* Different content for coupon vs paid */}
            {subscriptionDetails?.isCoupon ? (
              // Coupon/free trial subscription - continues until expiration
              <div className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-200">
                <h4 className="text-sm font-semibold text-yellow-800 mb-2">What happens when you cancel:</h4>
                <ul className="space-y-2 text-sm text-yellow-700">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Your free trial continues until <span className="font-semibold">{formatDate(subscriptionDetails?.expirationDate || null)}</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You'll keep all premium features until then</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You won't be charged after the trial ends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span>After expiration, you'll revert to the free plan (3 listings max)</span>
                  </li>
                </ul>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-yellow-600">
                    <span className="font-semibold">Note:</span> If you don't cancel, you'll automatically be subscribed to the paid plan at the end of your trial and your payment method will be charged.
                  </p>
                </div>
              </div>
            ) : (
              // Paid subscription - offer refund
              <>
                <div className="bg-neutral-50 rounded-xl p-4 mb-4">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-2">What happens when you cancel:</h4>
                  <ul className="space-y-2 text-sm text-neutral-600">
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>You'll keep access until <span className="font-medium">{formatDate(subscriptionDetails?.expirationDate || null)}</span></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>Your listings will remain active during this time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>After that, you'll revert to the free plan (3 listings max)</span>
                    </li>
                  </ul>
                </div>

                {/* Refund information for paid subscriptions */}
                {subscriptionDetails && subscriptionDetails.remainingValue > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Refund Available
                    </h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between text-green-700">
                        <span>Days remaining:</span>
                        <span className="font-medium">{subscriptionDetails.daysRemaining} of {subscriptionDetails.totalDays}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>Pro-rated refund:</span>
                        <span className="font-bold text-green-800">€{subscriptionDetails.remainingValue.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      If you cancel now and request a refund, we'll refund the unused portion of your subscription to your original payment method.
                    </p>
                  </div>
                )}
              </>
            )}

            {actionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {actionError}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {/* For paid subscriptions, show two cancel options */}
              {!subscriptionDetails?.isCoupon && subscriptionDetails && subscriptionDetails.remainingValue > 0 ? (
                <>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelling}
                    className="w-full py-2.5 rounded-lg font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors disabled:opacity-50 text-sm"
                  >
                    Cancel at end of billing period
                  </button>
                  <button
                    onClick={() => {
                      // Cancel with refund - would trigger refund process
                      handleCancelSubscription();
                    }}
                    disabled={cancelling}
                    className="w-full py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        Cancel now & get €{subscriptionDetails.remainingValue.toFixed(2)} refund
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  className={`w-full py-2.5 rounded-lg font-bold text-white ${subscriptionDetails?.isCoupon ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-red-600 hover:bg-red-700'} transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                >
                  {cancelling ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    subscriptionDetails?.isCoupon ? 'Yes, Cancel Auto-Renewal' : 'Yes, Cancel'
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setActionError(null);
                }}
                className="w-full py-2.5 rounded-lg font-semibold text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                {subscriptionDetails?.isCoupon ? 'Keep Auto-Renewal' : 'Keep Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Window for Upgrades */}
      {selectedPlanForPayment && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => {
            setShowPaymentWindow(false);
            setSelectedPlanForPayment(null);
          }}
          planName={selectedPlanForPayment.name}
          planPrice={selectedPlanForPayment.price}
          planInterval={selectedPlanForPayment.interval}
          userRole={user?.role === 'agent' ? 'agent' : 'private_seller'}
          userEmail={user?.email}
          userCountry={user?.country}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          productId={selectedPlanForPayment.productId}
        />
      )}
    </div>
  );
};

export default SubscriptionManagement;
