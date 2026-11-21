/**
 * Which account tier a plan gives, read from the product's own `tier` field
 * instead of guessing from words in its id ("pro", "agency", "enterprise").
 */

export type UserPlanTier = 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';

/**
 * The agency-agent seat is seeded with tier 'pro' but is the seat an agency
 * gives its agents (scripts/seedProducts.ts).
 */
export const AGENCY_AGENT_PRODUCT_ID = 'agency_agent_yearly';

export function tierForProduct(product: { productId: string; tier?: string }): UserPlanTier | null {
  if (product.productId === AGENCY_AGENT_PRODUCT_ID) return 'agency_agent';
  switch (product.tier) {
    case 'pro':
      return 'pro';
    case 'agency':
      return 'agency_owner';
    case 'buyer':
      return 'buyer';
    case 'free':
      return 'free';
    default:
      return null;
  }
}
