/**
 * TEST: Renewal & the monthly listing allowance
 *
 * Scenario (from the original bug report): a user on a 30-listings-a-month
 * plan creates 20 listings, then renews. What can they create next?
 *
 * This suite used to test a cumulative model: allowed = months since the
 * cycle started × allowance, through `getMaxAllowedListings` and
 * `subscription.subscriptionCycleStartDate`. Both are gone. The model is now
 * a monthly counter (services/listingLimitService.ts): the allowance is per
 * calendar month and does not add up, the counter starts again at 0 each new
 * month or when the plan is renewed (renewal sets `listingsCreatedThisMonth`
 * to 0, as `resetMonthlyCounter` does), and listings already published stay
 * up. These tests pin that model with the same scenario.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import User from '../models/User';
import Product from '../models/Product';
import listingLimitService from '../services/listingLimitService';
import { createMockUser } from './setup';

const PLAN = 'agency_monthly_test';
const ALLOWANCE = 30;

let seq = 0;

const startOfLastMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
};

/** A user on the 30-a-month plan who has created `created` listings since `monthResetDate`. */
const planUser = (created: number, monthResetDate: Date) =>
  User.create(
    createMockUser({
      email: `renewal-${Date.now()}-${++seq}@example.com`,
      role: 'agent',
      subscriptionPlan: PLAN,
      subscription: {
        tier: 'agency_agent',
        status: 'active',
        listingsLimit: ALLOWANCE,
        listingsCreatedThisMonth: created,
        monthResetDate,
      },
    })
  );

describe('Renewal and the monthly listing allowance', () => {
  beforeEach(async () => {
    await Product.create({
      productId: PLAN,
      name: 'Agency Monthly',
      tier: 'agency',
      listingsLimit: ALLOWANCE,
      billingPeriod: 'monthly',
      price: 99,
      currency: 'EUR',
      isActive: true,
      isVisible: true,
      features: [],
      targetRole: 'agent',
      displayOrder: 1,
      highlighted: false,
    });
  });

  it('reads the monthly allowance from the plan', async () => {
    await expect(listingLimitService.getMonthlyAllowance(PLAN)).resolves.toBe(ALLOWANCE);
    await expect(listingLimitService.getMonthlyAllowance('no_such_plan')).rejects.toThrow('Product not found');
  });

  it('day 1: after creating 20 of 30, 10 are left and more can be created', async () => {
    const user = await planUser(20, new Date());

    const usage = await listingLimitService.getMonthlyUsage(String(user._id));
    expect(usage).toMatchObject({ monthlyAllowance: ALLOWANCE, created: 20, remaining: 10 });
    await expect(listingLimitService.canCreateListing(String(user._id))).resolves.toBe(true);
  });

  it('with all 30 used this month, no more can be created', async () => {
    const user = await planUser(ALLOWANCE, new Date());

    const usage = await listingLimitService.getMonthlyUsage(String(user._id));
    expect(usage.remaining).toBe(0);
    await expect(listingLimitService.canCreateListing(String(user._id))).resolves.toBe(false);
  });

  it('renewing resets the counter, so the full 30 are available again the same day', async () => {
    const user = await planUser(ALLOWANCE, new Date());

    // What renewal does to the counter.
    await listingLimitService.resetMonthlyCounter(String(user._id));

    const usage = await listingLimitService.getMonthlyUsage(String(user._id));
    expect(usage).toMatchObject({ monthlyAllowance: ALLOWANCE, created: 0, remaining: ALLOWANCE });
    await expect(listingLimitService.canCreateListing(String(user._id))).resolves.toBe(true);
  });

  it('a new calendar month starts fresh without any reset job, and does not stack to 60', async () => {
    const user = await planUser(ALLOWANCE, startOfLastMonth());

    const usage = await listingLimitService.getMonthlyUsage(String(user._id));
    expect(usage).toMatchObject({ monthlyAllowance: ALLOWANCE, created: 0, remaining: ALLOWANCE });
    await expect(listingLimitService.canCreateListing(String(user._id))).resolves.toBe(true);
  });

  it('isMonthBoundaryPassed: same month no, last month yes, never reset yes', () => {
    expect(listingLimitService.isMonthBoundaryPassed(new Date())).toBe(false);
    expect(listingLimitService.isMonthBoundaryPassed(startOfLastMonth())).toBe(true);
    expect(listingLimitService.isMonthBoundaryPassed(undefined)).toBe(true);
  });
});
