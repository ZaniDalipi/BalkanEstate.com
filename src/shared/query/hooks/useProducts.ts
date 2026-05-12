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

  const prices = {
    // Agencies
    enterprise: {
      productId: 'seller_enterprise_yearly',
      price: sellerProducts.find(p => p.productId === 'seller_enterprise_yearly')?.price,
      billingPeriod: sellerProducts.find(p => p.productId === 'seller_enterprise_yearly')?.billingPeriod,
      name: sellerProducts.find(p => p.productId === 'seller_enterprise_yearly')?.name,
      features: sellerProducts.find(p => p.productId === 'seller_enterprise_yearly')?.features,
    },

    // Sellers
    sellerPro: {
      productId: 'seller_pro_monthly',
      monthlyPrice: sellerProducts.find(p => p.productId === 'seller_pro_monthly')?.price,
      monthlyBillingPeriod: sellerProducts.find(p => p.productId === 'seller_pro_monthly')?.billingPeriod,
      yearlyPrice: sellerProducts.find(p => p.productId === 'seller_pro_yearly')?.price,
      yearlyBillingPeriod: sellerProducts.find(p => p.productId === 'seller_pro_yearly')?.billingPeriod,
      monthlyName: sellerProducts.find(p => p.productId === 'seller_pro_monthly')?.name,
      yearlyName: sellerProducts.find(p => p.productId === 'seller_pro_yearly')?.name,
      monthlyFeatures: sellerProducts.find(p => p.productId === 'seller_pro_monthly')?.features,
      yearlyFeatures: sellerProducts.find(p => p.productId === 'seller_pro_yearly')?.features,
    },

    sellerFree: {
      productId: 'seller_free',
      price: sellerProducts.find(p => p.productId === 'seller_free')?.price ?? 0,
      features: sellerProducts.find(p => p.productId === 'seller_free')?.features,
    },

    // Agents
    agentPro: {
      productId: 'agent_pro',
      monthlyPrice: agentProducts.find(p => p.productId === 'agent_pro_monthly')?.price,
      monthlyBillingPeriod: agentProducts.find(p => p.productId === 'agent_pro_monthly')?.billingPeriod,
      yearlyPrice: agentProducts.find(p => p.productId === 'agent_pro_yearly')?.price,
      yearlyBillingPeriod: agentProducts.find(p => p.productId === 'agent_pro_yearly')?.billingPeriod,
      monthlyName: agentProducts.find(p => p.productId === 'agent_pro_monthly')?.name,
      yearlyName: agentProducts.find(p => p.productId === 'agent_pro_yearly')?.name,
      monthlyFeatures: agentProducts.find(p => p.productId === 'agent_pro_monthly')?.features,
      yearlyFeatures: agentProducts.find(p => p.productId === 'agent_pro_yearly')?.features,
    },

    agencyAgent: {
      productId: 'agent_agency_coupon',
      price: agentProducts.find(p => p.productId === 'agent_agency_coupon')?.price ?? 0,
      features: agentProducts.find(p => p.productId === 'agent_agency_coupon')?.features,
    },

    // Buyers
    buyerFree: {
      productId: 'buyer_free',
      price: buyerProducts.find(p => p.productId === 'buyer_free')?.price ?? 0,
      features: buyerProducts.find(p => p.productId === 'buyer_free')?.features,
    },

    buyerPro: {
      productId: 'buyer_pro',
      price: buyerProducts.find(p => p.productId === 'buyer_pro')?.price,
      billingPeriod: buyerProducts.find(p => p.productId === 'buyer_pro')?.billingPeriod,
      trialPeriodDays: buyerProducts.find(p => p.productId === 'buyer_pro')?.trialPeriodDays,
      name: buyerProducts.find(p => p.productId === 'buyer_pro')?.name,
      features: buyerProducts.find(p => p.productId === 'buyer_pro')?.features,
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
