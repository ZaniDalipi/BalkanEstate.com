import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { API_URL } from '@/src/shared/api/config';
import { tokenService } from '@/src/shared/api/tokenService';

// Types
export interface Product {
  id: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod?: 'monthly' | 'yearly' | 'one_time' | string;
  trialPeriodDays?: number;
  features: string[];
  targetRole: 'buyer' | 'seller' | 'agent' | 'all' | string;
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted?: boolean;
  cardStyle?: 'default' | 'premium' | 'dark';
  durationDays?: number;
  listingsLimit?: number;
  promotionCoupons?: number;
  // Promotion coupon breakdown
  premiumCoupons?: number;
  highlightedCoupons?: number;
  featuredCoupons?: number;
  // Agency-specific
  agentCoupons?: number;
  teamMembersLimit?: number;
  // AI & Insights
  savedSearchesLimit?: number;
  aiMessagesLimit?: number;
  aiInsightsLimit?: number;
  imageDescriptionLimit?: number;
  // Other
  maxActiveSubscriptions?: number;
}

export interface PromotionPlan {
  id: string;
  name: string;
  tier: string;
  category: 'listing' | 'agency';
  description?: string;
  icon?: string;
  features: string[];
  pricing: {
    duration7?: number;
    duration14?: number;
    duration28?: number;
    duration30?: number;
    duration90?: number;
  };
  visibilityMultiplier?: string;
  displayOrder?: number;
  badge?: string;
  highlighted?: boolean;
  cardStyle?: {
    gradientFrom?: string;
    gradientTo?: string;
    borderColor?: string;
    iconBgColor?: string;
    priceColor?: string;
  };
  isSpecialOffer?: boolean;
  availableFrom?: string;
  availableTo?: string;
  originalPriceMultiplier?: number;
  offerLabel?: string;
  isActive: boolean;
}

// Fetch products/subscription plans
async function fetchProducts(role: string): Promise<Product[]> {
  const response = await fetch(`${API_URL}/products?role=${role}`);
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  return data.products || [];
}

// Fetch promotion plans
async function fetchPromotionPlans(): Promise<PromotionPlan[]> {
  const response = await fetch(`${API_URL}/promotion-plans`);
  if (!response.ok) throw new Error('Failed to fetch promotion plans');
  const data = await response.json();
  return data.plans || [];
}

// Fetch user listings
async function fetchUserListings(token: string): Promise<any[]> {
  const response = await fetch(`${API_URL}/properties/my/listings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch listings');
  const data = await response.json();
  return (data.properties || []).map((p: any) => ({
    id: p.id || p._id,
    address: p.address || p.title || 'No address',
    price: p.price || 0,
    imageUrl: p.imageUrl || p.images?.[0] || '',
  }));
}

/**
 * Hook to fetch subscription products with real-time updates
 */
export function useProducts(role: string) {
  return useQuery({
    queryKey: ['products', role],
    queryFn: () => fetchProducts(role),
    staleTime: 5 * 60 * 1000, // 5 minutes — products rarely change mid-session
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
  });
}

/**
 * Hook to fetch promotion plans with real-time updates
 */
export function usePromotionPlans() {
  return useQuery({
    queryKey: ['promotionPlans'],
    queryFn: fetchPromotionPlans,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
  });
}

/**
 * Hook to fetch user listings
 */
export function useUserListings(enabled: boolean) {
  const token = typeof window !== 'undefined' ? tokenService.getAccessToken() : null;

  return useQuery({
    queryKey: ['userListings'],
    queryFn: () => fetchUserListings(token!),
    enabled: enabled && !!token,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch all pricing data
 * Useful when admin makes changes
 */
export function useInvalidatePricingData() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
    invalidateProducts: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    invalidatePromotionPlans: () => {
      queryClient.invalidateQueries({ queryKey: ['promotionPlans'] });
    },
  };
}

/**
 * Combined hook for all pricing page data with real-time updates
 */
export function usePricingPageData(activeTab: string, isAuthenticated: boolean) {
  const queryClient = useQueryClient();

  // Subscription products
  const productsQuery = useProducts(activeTab);

  // Seller products are needed outside the seller tab too: the Enterprise plan is
  // seeded with targetRole 'seller', but the agency tab offers it as well. Shares the
  // ['products', 'seller'] cache key with the prefetch below, so it costs no extra request.
  const sellerProductsQuery = useProducts('seller');

  // Promotion plans (for listing and agency tabs)
  const promotionPlansQuery = usePromotionPlans();

  // User listings (only for listing tab when authenticated)
  const userListingsQuery = useUserListings(
    activeTab === 'listing' && isAuthenticated
  );

  // Prefetch other tabs for faster navigation
  useEffect(() => {
    const roles = ['seller', 'buyer', 'listing', 'agency'];
    roles.forEach(role => {
      if (role !== activeTab) {
        queryClient.prefetchQuery({
          queryKey: ['products', role],
          queryFn: () => fetchProducts(role),
          staleTime: 5 * 1000,
        });
      }
    });
  }, [activeTab, queryClient]);

  // Derived data - separate regular plans from special offers
  const allPlans = promotionPlansQuery.data || [];

  const listingPromotionPlans = allPlans.filter(
    (p) => p.category === 'listing' && !p.isSpecialOffer
  );

  const agencyFeaturePlans = allPlans.filter(
    (p) => p.category === 'agency' && !p.isSpecialOffer
  );

  const specialOffers = allPlans.filter((p) => p.isSpecialOffer);

  return {
    // Products/Subscription Plans
    products: productsQuery.data || [],
    sellerRoleProducts: sellerProductsQuery.data || [],
    isLoadingProducts: productsQuery.isLoading,
    isRefetchingProducts: productsQuery.isRefetching,
    productsError: productsQuery.error,
    refetchProducts: productsQuery.refetch,

    // Promotion Plans
    listingPromotionPlans,
    agencyFeaturePlans,
    specialOffers,
    isLoadingPromotionPlans: promotionPlansQuery.isLoading,
    isRefetchingPromotionPlans: promotionPlansQuery.isRefetching,
    promotionPlansError: promotionPlansQuery.error,
    refetchPromotionPlans: promotionPlansQuery.refetch,

    // User Listings
    userListings: userListingsQuery.data || [],
    isLoadingUserListings: userListingsQuery.isLoading,

    // Combined loading state
    isLoading: productsQuery.isLoading || promotionPlansQuery.isLoading,
    isRefetching: productsQuery.isRefetching || promotionPlansQuery.isRefetching,

    // Manual refetch all
    refetchAll: () => {
      productsQuery.refetch();
      promotionPlansQuery.refetch();
      if (activeTab === 'listing' && isAuthenticated) {
        userListingsQuery.refetch();
      }
    },
  };
}
