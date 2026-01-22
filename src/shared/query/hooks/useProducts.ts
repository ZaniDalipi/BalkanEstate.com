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

// Re-export Product type for convenience
export type { Product } from '@/utils/api';
