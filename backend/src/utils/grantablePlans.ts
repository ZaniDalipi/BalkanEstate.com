/**
 * Which products can be granted as a subscription plan: through a 100%-off
 * code, a payment order the team marks paid, or (later) an online payment.
 *
 * Everything else that has a product id (agency featuring, residence passes,
 * the free tier, the agency-agent seat) has its own flow, and granting it as a
 * "subscription" used to end the user's real plan.
 */

/** Tiers the grant service knows how to give. */
export const GRANTABLE_TIERS = ['pro', 'buyer', 'agency'] as const;

/** Billing periods of a recurring plan. */
export const GRANTABLE_PERIODS = ['monthly', 'yearly'] as const;

/**
 * Agency featuring is sold as `featured_agency_<n>days` products
 * (see utils/featuredSubscriptionUtils.ts) and lives in its own model.
 */
export const FEATURED_AGENCY_PRODUCT_PREFIX = 'featured_agency_';

export interface GrantablePlanFields {
  productId: string;
  type?: string;
  tier?: string;
  price: number;
  billingPeriod?: string;
  isActive?: boolean;
}

export const isGrantablePlan = (product: GrantablePlanFields): boolean =>
  product.isActive !== false &&
  (product.type === undefined || product.type === 'subscription') &&
  product.price > 0 &&
  (GRANTABLE_TIERS as readonly string[]).includes(product.tier ?? '') &&
  (GRANTABLE_PERIODS as readonly string[]).includes(product.billingPeriod ?? '') &&
  !product.productId.startsWith(FEATURED_AGENCY_PRODUCT_PREFIX);
