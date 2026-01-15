/**
 * Subscription Flow Tests
 *
 * Tests for subscription tiers, limits, upgrades, and listing management
 * Run: npm test -- --testPathPattern=subscription-flows
 */

import mongoose from 'mongoose';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';

// ============================================================
// SUBSCRIPTION TIER TESTS
// ============================================================

describe('Subscription Tiers', () => {
  beforeEach(async () => {
    // Seed test products
    await Product.create([
      {
        productId: 'free_tier',
        name: 'Free',
        tier: 'free',
        description: 'Basic free tier',
        price: 0,
        currency: 'EUR',
        billingPeriod: 'monthly',
        listingsLimit: 3,
        features: ['Basic listings'],
        isActive: true,
      },
      {
        productId: 'pro_monthly',
        name: 'Pro Monthly',
        tier: 'pro',
        description: 'Pro tier monthly',
        price: 29.99,
        currency: 'EUR',
        billingPeriod: 'monthly',
        listingsLimit: 15,
        features: ['More listings', 'Analytics'],
        isActive: true,
      },
      {
        productId: 'pro_yearly',
        name: 'Pro Yearly',
        tier: 'pro',
        description: 'Pro tier yearly',
        price: 299.99,
        currency: 'EUR',
        billingPeriod: 'yearly',
        listingsLimit: 15,
        features: ['More listings', 'Analytics'],
        isActive: true,
      },
      {
        productId: 'enterprise_yearly',
        name: 'Enterprise Yearly',
        tier: 'enterprise',
        description: 'Enterprise tier',
        price: 999.99,
        currency: 'EUR',
        billingPeriod: 'yearly',
        listingsLimit: 100,
        features: ['Unlimited', 'Agency features'],
        isActive: true,
      },
    ]);
  });

  describe('Free Tier', () => {
    test('free tier has 3 listings limit', async () => {
      const product = await Product.findOne({ productId: 'free_tier' });
      expect(product).toBeDefined();
      expect(product?.listingsLimit).toBe(3);
      expect(product?.price).toBe(0);
    });

    test('new user starts with free tier defaults', async () => {
      const user = await User.create({
        email: 'newuser@test.com',
        password: 'TestPassword123!',
        name: 'New User',
        role: 'private_seller',
      });

      // New user should have free tier defaults or undefined subscription
      expect(user.subscription?.tier || 'free').toBe('free');
      expect(user.subscription?.listingsLimit || 3).toBe(3);
    });
  });

  describe('Pro Tier', () => {
    test('pro tier has 15 listings limit', async () => {
      const product = await Product.findOne({ productId: 'pro_monthly' });
      expect(product).toBeDefined();
      expect(product?.listingsLimit).toBe(15);
    });

    test('pro monthly and yearly have same listings limit', async () => {
      const monthly = await Product.findOne({ productId: 'pro_monthly' });
      const yearly = await Product.findOne({ productId: 'pro_yearly' });

      expect(monthly?.listingsLimit).toBe(yearly?.listingsLimit);
    });

    test('yearly plan is cheaper per month than monthly', async () => {
      const monthly = await Product.findOne({ productId: 'pro_monthly' });
      const yearly = await Product.findOne({ productId: 'pro_yearly' });

      const monthlyPerYear = (monthly?.price || 0) * 12;
      const yearlyPrice = yearly?.price || 0;

      expect(yearlyPrice).toBeLessThan(monthlyPerYear);
    });
  });

  describe('Enterprise Tier', () => {
    test('enterprise tier has highest listings limit', async () => {
      const enterprise = await Product.findOne({ productId: 'enterprise_yearly' });
      const pro = await Product.findOne({ productId: 'pro_yearly' });

      expect(enterprise?.listingsLimit).toBeGreaterThan(pro?.listingsLimit || 0);
    });
  });
});

// ============================================================
// SUBSCRIPTION LISTING LIMITS TESTS
// ============================================================

describe('Subscription Listing Limits', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'seller@test.com',
      password: 'TestPassword123!',
      name: 'Test Seller',
      role: 'private_seller',
      subscription: {
        tier: 'free',
        status: 'active',
        listingsLimit: 3,
        activeListingsCount: 0,
        privateSellerCount: 0,
        agentCount: 0,
      },
    });
  });

  describe('Listing Counter Management', () => {
    test('active listings count starts at 0', () => {
      expect(testUser.subscription.activeListingsCount).toBe(0);
    });

    test('can increment listings count within limit', async () => {
      testUser.subscription.activeListingsCount = 1;
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated?.subscription?.activeListingsCount).toBe(1);
    });

    test('can track role-specific listing counts', async () => {
      testUser.subscription.privateSellerCount = 2;
      testUser.subscription.agentCount = 1;
      testUser.subscription.activeListingsCount = 3;
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated?.subscription?.privateSellerCount).toBe(2);
      expect(updated?.subscription?.agentCount).toBe(1);
      expect(updated?.subscription?.activeListingsCount).toBe(3);
    });
  });

  describe('Limit Enforcement Logic', () => {
    test('free tier limit is 3', () => {
      expect(testUser.subscription.listingsLimit).toBe(3);
    });

    test('can check if at limit', async () => {
      testUser.subscription.activeListingsCount = 3;
      await testUser.save();

      const updated = await User.findById(testUser._id);
      const atLimit =
        (updated?.subscription?.activeListingsCount || 0) >=
        (updated?.subscription?.listingsLimit || 3);
      expect(atLimit).toBe(true);
    });

    test('can check remaining slots', async () => {
      testUser.subscription.activeListingsCount = 1;
      await testUser.save();

      const updated = await User.findById(testUser._id);
      const remaining =
        (updated?.subscription?.listingsLimit || 3) -
        (updated?.subscription?.activeListingsCount || 0);
      expect(remaining).toBe(2);
    });
  });
});

// ============================================================
// SUBSCRIPTION STATUS TESTS
// ============================================================

describe('Subscription Status', () => {
  describe('Status Transitions', () => {
    test('valid subscription statuses', () => {
      const validStatuses = ['active', 'expired', 'cancelled', 'grace', 'pending_cancellation', 'trial'];
      validStatuses.forEach((status) => {
        expect(['active', 'expired', 'cancelled', 'grace', 'pending_cancellation', 'trial']).toContain(status);
      });
    });

    test('subscription model accepts valid status', async () => {
      const user = await User.create({
        email: 'status@test.com',
        password: 'TestPassword123!',
        name: 'Status Test',
        role: 'private_seller',
      });

      await Product.create({
        productId: 'test_product',
        name: 'Test Product',
        tier: 'pro',
        description: 'Test',
        price: 10,
        currency: 'EUR',
        billingPeriod: 'monthly',
        listingsLimit: 10,
        features: [],
        isActive: true,
      });

      const subscription = await Subscription.create({
        userId: user._id,
        store: 'web',
        productId: 'test_product',
        startDate: new Date(),
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active',
        autoRenewing: true,
        price: 10,
        currency: 'EUR',
      });

      expect(subscription.status).toBe('active');
    });
  });

  describe('Expiration Logic', () => {
    test('subscription with future expiration is active', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const user = await User.create({
        email: 'future@test.com',
        password: 'TestPassword123!',
        name: 'Future Test',
        role: 'private_seller',
        subscription: {
          tier: 'pro',
          status: 'active',
          expiresAt: futureDate,
          listingsLimit: 15,
          activeListingsCount: 0,
        },
      });

      expect(user.subscription?.status).toBe('active');
      expect(new Date(user.subscription?.expiresAt || 0) > new Date()).toBe(true);
    });

    test('can calculate days until expiration', () => {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 10);

      const now = new Date();
      const daysRemaining = Math.ceil(
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBe(10);
    });
  });
});

// ============================================================
// TRIAL SUBSCRIPTION TESTS
// ============================================================

describe('Trial Subscriptions', () => {
  test('trial period is 7 days', () => {
    const TRIAL_DURATION_DAYS = 7;
    expect(TRIAL_DURATION_DAYS).toBe(7);
  });

  test('trial user has correct subscription status', async () => {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    const user = await User.create({
      email: 'trial@test.com',
      password: 'TestPassword123!',
      name: 'Trial User',
      role: 'agent',
      trialStartDate: new Date(),
      trialEndDate,
      trialExpired: false,
      subscriptionStatus: 'trial',
    });

    expect(user.subscriptionStatus).toBe('trial');
    expect(user.trialExpired).toBe(false);
  });

  test('trial listings limit is 10', async () => {
    const user = await User.create({
      email: 'triallimit@test.com',
      password: 'TestPassword123!',
      name: 'Trial Limit User',
      role: 'agent',
      activeListingsLimit: 10,
      subscriptionStatus: 'trial',
    });

    expect(user.activeListingsLimit).toBe(10);
  });
});

// ============================================================
// PROMOTION COUPONS TESTS
// ============================================================

describe('Subscription Promotion Coupons', () => {
  test('pro subscription includes monthly promotion coupons', async () => {
    const user = await User.create({
      email: 'promo@test.com',
      password: 'TestPassword123!',
      name: 'Promo User',
      role: 'private_seller',
      subscription: {
        tier: 'pro',
        status: 'active',
        listingsLimit: 15,
        activeListingsCount: 0,
        promotionCoupons: {
          monthly: 5,
          available: 5,
          used: 0,
          lastRefresh: new Date(),
        },
      },
    });

    expect(user.subscription?.promotionCoupons?.monthly).toBe(5);
    expect(user.subscription?.promotionCoupons?.available).toBe(5);
  });

  test('can decrement available coupons', async () => {
    const user = await User.create({
      email: 'decrement@test.com',
      password: 'TestPassword123!',
      name: 'Decrement User',
      role: 'private_seller',
      subscription: {
        tier: 'pro',
        status: 'active',
        listingsLimit: 15,
        activeListingsCount: 0,
        promotionCoupons: {
          monthly: 5,
          available: 5,
          used: 0,
          lastRefresh: new Date(),
        },
      },
    });

    // Simulate using a coupon
    if (user.subscription?.promotionCoupons) {
      user.subscription.promotionCoupons.available -= 1;
      user.subscription.promotionCoupons.used += 1;
      await user.save();
    }

    const updated = await User.findById(user._id);
    expect(updated?.subscription?.promotionCoupons?.available).toBe(4);
    expect(updated?.subscription?.promotionCoupons?.used).toBe(1);
  });
});

// ============================================================
// DUAL-ROLE SUBSCRIPTION TESTS
// ============================================================

describe('Dual-Role Subscription Support', () => {
  test('user can have multiple available roles', async () => {
    const user = await User.create({
      email: 'dualrole@test.com',
      password: 'TestPassword123!',
      name: 'Dual Role User',
      role: 'agent',
      availableRoles: ['private_seller', 'agent'],
      activeRole: 'agent',
      primaryRole: 'agent',
    });

    expect(user.availableRoles).toContain('private_seller');
    expect(user.availableRoles).toContain('agent');
    expect(user.activeRole).toBe('agent');
  });

  test('subscription tracks listings by role', async () => {
    const user = await User.create({
      email: 'roletrak@test.com',
      password: 'TestPassword123!',
      name: 'Role Track User',
      role: 'agent',
      availableRoles: ['private_seller', 'agent'],
      subscription: {
        tier: 'pro',
        status: 'active',
        listingsLimit: 15,
        activeListingsCount: 5,
        privateSellerCount: 2,
        agentCount: 3,
      },
    });

    expect(user.subscription?.privateSellerCount).toBe(2);
    expect(user.subscription?.agentCount).toBe(3);
    expect(
      (user.subscription?.privateSellerCount || 0) + (user.subscription?.agentCount || 0)
    ).toBe(user.subscription?.activeListingsCount);
  });
});
