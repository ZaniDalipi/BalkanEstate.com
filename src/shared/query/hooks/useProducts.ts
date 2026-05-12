/**
 * Public Product Hooks - Reactive data management for product/pricing display
 *
 * These hooks are used by public-facing components like PricingPlans and
 * PromotionOfferModal. They share query keys with admin hooks so that when
 * admin modifies products, all components automatically update.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchProduct, Product } from '@/utils/api';
import { productKeys } from '../queryKeys';

/**
 * usePublicProducts - Fetches visible products for display
 *
 * @param role - Optional filter by target role (buyer, seller, agent)
 * @returns React Query result with products array
 */
export function usePublicProducts(role?: 'buyer' | 'seller' | 'agent') {
  return useQuery({
    queryKey: productKeys.publicByRole(role),
    queryFn: () => fetchProducts(role),
    staleTime: 30 * 1000, // 30 seconds - same as admin for consistency
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * useSellerProducts - Fetches products for seller pricing pages
 *
 * Used by: PricingPlans.tsx, SubscriptionModal.tsx
 */
export function useSellerProducts() {
  return usePublicProducts('seller');
}

/**
 * useBuyerProducts - Fetches products for buyer pricing pages
 */
export function useBuyerProducts() {
  return usePublicProducts('buyer');
}

/**
 * useProduct - Fetches a single product by productId
 *
 * @param productId - The product ID to fetch
 * @returns React Query result with single product
 */
export function useProduct(productId: string) {
  return useQuery({
    queryKey: productKeys.publicProduct(productId),
    queryFn: () => fetchProduct(productId),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    enabled: !!productId, // Only fetch if productId is provided
  });
}

/**
 * usePromotionProduct - Fetches the listing promotion product specifically
 *
 * Used by: PromotionOfferModal.tsx
 */
export function usePromotionProduct() {
  const { data: products = [], ...rest } = useSellerProducts();

  // Find the 15-day promotion product
  const promotionProduct = products.find(
    (p: Product) => p.productId === 'listing_promotion_15days'
  );

  return {
    ...rest,
    data: promotionProduct,
    products, // Also expose all products for fallback
  };
}

/**
 * useAgentProducts - Fetches products for agent pricing pages
 */
export function useAgentProducts() {
  return usePublicProducts('agent');
}

/**
 * useHowItWorksPrices - Aggregates all pricing information for "How it Works" page
 *
 * Fetches products for all roles (seller, buyer, agent) and formats them
 * into a structured object with fallback support from i18n translations
 *
 * Returns prices with dynamic DB values, falling back to i18n if not available
 */
export function useHowItWorksPrices() {
  const { data: sellerProducts = [], isLoading: sellerLoading } = useSellerProducts();
  const { data: buyerProducts = [], isLoading: buyerLoading } = useBuyerProducts();
  const { data: agentProducts = [], isLoading: agentLoading } = useAgentProducts();

  const isLoading = sellerLoading || buyerLoading || agentLoading;

  // Helper to find product by ID
  const findProductById = (products: Product[], productId: string) =>
    products.find(p => p.productId === productId);

  const prices = {
    // Agencies
    enterprise: {
      productId: 'seller_enterprise_yearly',
      product: findProductById(sellerProducts, 'seller_enterprise_yearly'),
      price: findProductById(sellerProducts, 'seller_enterprise_yearly')?.price,
      billingPeriod: findProductById(sellerProducts, 'seller_enterprise_yearly')?.billingPeriod,
      name: findProductById(sellerProducts, 'seller_enterprise_yearly')?.name,
      features: findProductById(sellerProducts, 'seller_enterprise_yearly')?.features,
      listingsLimit: findProductById(sellerProducts, 'seller_enterprise_yearly')?.listingsLimit,
      teamMembersLimit: findProductById(sellerProducts, 'seller_enterprise_yearly')?.teamMembersLimit,
      promotionCoupons: findProductById(sellerProducts, 'seller_enterprise_yearly')?.promotionCoupons,
    },

    // Sellers
    sellerPro: {
      productId: 'seller_pro_monthly',
      productMonthly: findProductById(sellerProducts, 'seller_pro_monthly'),
      productYearly: findProductById(sellerProducts, 'seller_pro_yearly'),
      monthlyPrice: findProductById(sellerProducts, 'seller_pro_monthly')?.price,
      monthlyBillingPeriod: findProductById(sellerProducts, 'seller_pro_monthly')?.billingPeriod,
      yearlyPrice: findProductById(sellerProducts, 'seller_pro_yearly')?.price,
      yearlyBillingPeriod: findProductById(sellerProducts, 'seller_pro_yearly')?.billingPeriod,
      monthlyName: findProductById(sellerProducts, 'seller_pro_monthly')?.name,
      yearlyName: findProductById(sellerProducts, 'seller_pro_yearly')?.name,
      monthlyFeatures: findProductById(sellerProducts, 'seller_pro_monthly')?.features,
      yearlyFeatures: findProductById(sellerProducts, 'seller_pro_yearly')?.features,
      listingsLimit: findProductById(sellerProducts, 'seller_pro_monthly')?.listingsLimit,
      promotionCoupons: findProductById(sellerProducts, 'seller_pro_monthly')?.promotionCoupons,
    },

    sellerFree: {
      productId: 'seller_free',
      product: findProductById(sellerProducts, 'seller_free'),
      price: findProductById(sellerProducts, 'seller_free')?.price ?? 0,
      features: findProductById(sellerProducts, 'seller_free')?.features,
      listingsLimit: findProductById(sellerProducts, 'seller_free')?.listingsLimit,
    },

    // Agents
    agentPro: {
      productId: 'agent_pro',
      productMonthly: findProductById(agentProducts, 'agent_pro_monthly'),
      productYearly: findProductById(agentProducts, 'agent_pro_yearly'),
      monthlyPrice: findProductById(agentProducts, 'agent_pro_monthly')?.price,
      monthlyBillingPeriod: findProductById(agentProducts, 'agent_pro_monthly')?.billingPeriod,
      yearlyPrice: findProductById(agentProducts, 'agent_pro_yearly')?.price,
      yearlyBillingPeriod: findProductById(agentProducts, 'agent_pro_yearly')?.billingPeriod,
      monthlyName: findProductById(agentProducts, 'agent_pro_monthly')?.name,
      yearlyName: findProductById(agentProducts, 'agent_pro_yearly')?.name,
      monthlyFeatures: findProductById(agentProducts, 'agent_pro_monthly')?.features,
      yearlyFeatures: findProductById(agentProducts, 'agent_pro_yearly')?.features,
      listingsLimit: findProductById(agentProducts, 'agent_pro_monthly')?.listingsLimit,
      promotionCoupons: findProductById(agentProducts, 'agent_pro_monthly')?.promotionCoupons,
    },

    agencyAgent: {
      productId: 'agent_agency_coupon',
      product: findProductById(agentProducts, 'agent_agency_coupon'),
      price: findProductById(agentProducts, 'agent_agency_coupon')?.price ?? 0,
      features: findProductById(agentProducts, 'agent_agency_coupon')?.features,
      listingsLimit: findProductById(agentProducts, 'agent_agency_coupon')?.listingsLimit,
    },

    // Buyers
    buyerFree: {
      productId: 'buyer_free',
      product: findProductById(buyerProducts, 'buyer_free'),
      price: findProductById(buyerProducts, 'buyer_free')?.price ?? 0,
      features: findProductById(buyerProducts, 'buyer_free')?.features,
    },

    buyerPro: {
      productId: 'buyer_pro',
      product: findProductById(buyerProducts, 'buyer_pro'),
      price: findProductById(buyerProducts, 'buyer_pro')?.price,
      billingPeriod: findProductById(buyerProducts, 'buyer_pro')?.billingPeriod,
      trialPeriodDays: findProductById(buyerProducts, 'buyer_pro')?.trialPeriodDays,
      name: findProductById(buyerProducts, 'buyer_pro')?.name,
      features: findProductById(buyerProducts, 'buyer_pro')?.features,
    },
  };

  return {
    prices,
    isLoading,
    sellerProducts,
    buyerProducts,
    agentProducts,
  };
}

// Re-export Product type for convenience
export type { Product } from '@/utils/api';
