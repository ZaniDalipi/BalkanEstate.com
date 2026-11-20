/**
 * Which products a 100%-off code may turn into a subscription.
 *
 * The free-coupon route grants a recurring plan through the subscription
 * service. Everything else that has a product id (agency featuring, residence
 * passes, the free tier, the agency-agent seat) has its own flow, and granting
 * it here as a "subscription" used to end the user's real plan.
 */

/** Tiers the subscription service knows how to grant. */
export const COUPON_GRANTABLE_TIERS = ['pro', 'buyer', 'agency'] as const;

/** Billing periods of a recurring plan. */
export const COUPON_GRANTABLE_PERIODS = ['monthly', 'yearly'] as const;

/**
 * Agency featuring is sold as `featured_agency_<n>days` products
 * (see utils/featuredSubscriptionUtils.ts) and lives in its own model.
 */
export const FEATURED_AGENCY_PRODUCT_PREFIX = 'featured_agency_';

export interface CouponPlanFields {
  productId: string;
  type?: string;
  tier?: string;
  price: number;
  billingPeriod?: string;
  isActive?: boolean;
}

export const isCouponGrantablePlan = (product: CouponPlanFields): boolean =>
  product.isActive !== false &&
  (product.type === undefined || product.type === 'subscription') &&
  product.price > 0 &&
  (COUPON_GRANTABLE_TIERS as readonly string[]).includes(product.tier ?? '') &&
  (COUPON_GRANTABLE_PERIODS as readonly string[]).includes(product.billingPeriod ?? '') &&
  !product.productId.startsWith(FEATURED_AGENCY_PRODUCT_PREFIX);

/** What is left to pay after a discount, in euros, rounded to the cent and never below zero. */
export const remainingAfterDiscount = (price: number, discount: number): number =>
  Math.max(0, Math.round((price - discount) * 100) / 100);
