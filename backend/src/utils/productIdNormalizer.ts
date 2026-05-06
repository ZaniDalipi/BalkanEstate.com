/**
 * Product ID Normalizer
 *
 * Normalize product IDs from old (legacy) to canonical IDs.
 * This ensures backward compatibility while consolidating IDs:
 * - seller_pro_monthly → pro_monthly
 * - seller_pro_yearly → pro_yearly
 * - seller_enterprise_yearly → agency_yearly
 *
 * Existing users with old IDs continue to work; new/updated subscriptions use canonical IDs
 */

export const normalizeProductId = (productId: string | undefined | null): string | undefined => {
  if (!productId) return undefined;

  const idMap: Record<string, string> = {
    seller_pro_monthly: 'pro_monthly',
    seller_pro_yearly: 'pro_yearly',
    seller_enterprise_yearly: 'agency_yearly',
  };

  return idMap[productId] || productId;
};
