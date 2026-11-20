process.env.SKIP_TEST_DB = 'true';

import { isCouponGrantablePlan, remainingAfterDiscount } from '../utils/couponPlanRules';

const plan = (overrides: Record<string, unknown> = {}) => ({
  productId: 'pro_monthly',
  type: 'subscription',
  tier: 'pro',
  price: 25,
  billingPeriod: 'monthly',
  isActive: true,
  ...overrides,
});

describe('isCouponGrantablePlan', () => {
  it.each([
    ['Pro monthly', plan()],
    ['Pro yearly', plan({ productId: 'pro_yearly', billingPeriod: 'yearly', price: 200 })],
    ['Buyer monthly', plan({ productId: 'buyer_monthly', tier: 'buyer', price: 3 })],
    ['Enterprise', plan({ productId: 'agency_yearly', tier: 'agency', billingPeriod: 'yearly', price: 1000 })],
  ])('accepts a paid recurring plan: %s', (_label, product) => {
    expect(isCouponGrantablePlan(product)).toBe(true);
  });

  it.each([
    ['the free tier', plan({ productId: 'free_tier', tier: 'free', price: 0 })],
    ['the €0 agency-agent seat', plan({ productId: 'agency_agent_yearly', price: 0 })],
    ['a residence pass', plan({ productId: 'residence_pass_yearly', tier: 'residence', billingPeriod: 'yearly', price: 149 })],
    ['agency featuring, even when billed monthly', plan({ productId: 'featured_agency_28days', tier: 'agency', price: 24.99 })],
    ['a weekly item', plan({ productId: 'featured_agency_7days', tier: 'agency', billingPeriod: 'weekly', price: 6.99 })],
    ['a product with no tier (how auto-created ones look)', plan({ productId: 'x_enterprise', tier: undefined })],
    ['a one-off product', plan({ type: 'consumable' })],
    ['an inactive plan', plan({ isActive: false })],
  ])('refuses %s', (_label, product) => {
    expect(isCouponGrantablePlan(product)).toBe(false);
  });
});

describe('remainingAfterDiscount', () => {
  it('is zero when the discount covers the price', () => {
    expect(remainingAfterDiscount(25, 25)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(remainingAfterDiscount(25, 30)).toBe(0);
  });

  it('rounds to the cent', () => {
    expect(remainingAfterDiscount(24.99, 0.1)).toBe(24.89);
  });

  it('leaves the rest to pay for a partial discount', () => {
    expect(remainingAfterDiscount(25, 5)).toBe(20);
  });
});
