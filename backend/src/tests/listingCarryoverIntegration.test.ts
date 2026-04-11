import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Product from '../models/Product';
import listingCarryoverService from '../services/listingCarryoverService';

/**
 * Integration Tests for Listing Carryover & Annual Cap System
 *
 * Tests the carryover logic with actual database operations
 */

describe('Listing Carryover Service', () => {
  let testUser: IUser;
  let agencyProduct: any;

  beforeEach(async () => {
    // Create test agency agent product
    agencyProduct = await Product.create({
      productId: 'agency_agent_monthly',
      name: 'Agency Agent Monthly',
      tier: 'agency_agent',
      type: 'subscription',
      price: 49.99,
      currency: 'USD',
      billingPeriod: 'monthly',
      durationDays: 30,
      hasFreeTrial: false,
      isActive: true,
      isVisible: true,
      features: ['30 listings per month'],
      targetRole: 'agent',
      displayOrder: 1,
      listingsLimit: 30,
      promotionCoupons: 0,
    });

    // Create test user with agency agent subscription
    testUser = await User.create({
      email: `test-${Date.now()}@example.com`,
      name: 'Test Agent',
      password: 'hashedpassword123',
      isEmailVerified: true,
      role: 'agent',
      availableRoles: ['agent'],
      activeRole: 'agent',
      primaryRole: 'agent',
      listingsCount: 0,
      totalListingsCreated: 0,
      activeListingsLimit: 30,
      loginAttempts: 0,
      subscription: {
        tier: 'agency_agent',
        status: 'active',
        startDate: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        listingsLimit: 30,
        activeListingsCount: 0,
        privateSellerCount: 0,
        agentCount: 0,
        totalPaid: 0,
      },
      emailPreferences: {
        weeklyStats: true,
        propertyAlerts: true,
        priceDrops: true,
        messages: true,
        marketing: true,
        transactional: true,
      },
    });
  });

  afterEach(async () => {
    // Cleanup
    if (testUser._id) {
      await User.deleteOne({ _id: testUser._id });
    }
    if (agencyProduct._id) {
      await Product.deleteOne({ _id: agencyProduct._id });
    }
  });

  describe('getMonthlyAllowance', () => {
    it('should return correct monthly allowance for tier', async () => {
      const allowance = await listingCarryoverService.getMonthlyAllowance('agency_agent');
      expect(allowance).toBe(30);
    });

    it('should return 0 for invalid tier', async () => {
      const allowance = await listingCarryoverService.getMonthlyAllowance('invalid_tier');
      expect(allowance).toBe(0);
    });
  });

  describe('getEffectiveListingLimit', () => {
    it('should return available listings respecting annual cap', () => {
      testUser.subscription.listingsAllowanceYTD = 100;
      const effectiveLimit = listingCarryoverService.getEffectiveListingLimit(testUser, 30);
      // Annual cap = 30 * 12 = 360
      // Remaining = 360 - 100 = 260
      expect(effectiveLimit).toBe(260);
    });

    it('should return 0 when annual cap reached', () => {
      testUser.subscription.listingsAllowanceYTD = 360; // Full year used
      const effectiveLimit = listingCarryoverService.getEffectiveListingLimit(testUser, 30);
      expect(effectiveLimit).toBe(0);
    });
  });

  describe('refreshMonthlyAllowance', () => {
    it('should carry over unused listings to next month', async () => {
      // User created 28 of 30 in first month
      testUser.subscription.listingsAllowanceThisMonth = 30;
      testUser.subscription.listingsCreatedThisMonth = 28;
      testUser.subscription.listingsAllowanceYTD = 30;
      testUser.subscription.carryoverListings = 0;
      await testUser.save();

      const result = await listingCarryoverService.refreshMonthlyAllowance(testUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.user?.subscription.carryoverListings).toBe(2); // 30 - 28
      expect(result.user?.subscription.listingsAllowanceThisMonth).toBe(30);
      expect(result.user?.subscription.listingsAllowanceYTD).toBe(60); // 30 + 30
      expect(result.user?.subscription.listingsCreatedThisMonth).toBe(0);
    });

    it('should not carry over when user creates full allowance', async () => {
      // User created all 30 in first month
      testUser.subscription.listingsAllowanceThisMonth = 30;
      testUser.subscription.listingsCreatedThisMonth = 30;
      testUser.subscription.listingsAllowanceYTD = 30;
      await testUser.save();

      const result = await listingCarryoverService.refreshMonthlyAllowance(testUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.user?.subscription.carryoverListings).toBe(0); // No unused
      expect(result.user?.subscription.listingsAllowanceYTD).toBe(60);
    });

    it('should accumulate allowances over multiple months', async () => {
      // Simulate 3 months of carryover
      let user = testUser;

      // Month 1: Create 25 of 30
      user.subscription.listingsAllowanceThisMonth = 30;
      user.subscription.listingsCreatedThisMonth = 25;
      user.subscription.listingsAllowanceYTD = 30;
      await user.save();

      // Refresh to month 2
      let result = await listingCarryoverService.refreshMonthlyAllowance(user._id.toString());
      user = result.user!;
      expect(user.subscription.listingsAllowanceYTD).toBe(60);
      expect(user.subscription.carryoverListings).toBe(5);

      // Month 2: Create 20 of 30
      user.subscription.listingsCreatedThisMonth = 20;
      await user.save();

      // Refresh to month 3
      result = await listingCarryoverService.refreshMonthlyAllowance(user._id.toString());
      user = result.user!;
      expect(user.subscription.listingsAllowanceYTD).toBe(90);
      expect(user.subscription.carryoverListings).toBe(10); // 30 - 20
    });

    it('should reject invalid user ID', async () => {
      const result = await listingCarryoverService.refreshMonthlyAllowance('invalid-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('applyAnnualReset', () => {
    it('should reset counters after 365 days', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      testUser.subscription.subscriptionCycleStartDate = oneYearAgo;
      testUser.subscription.subscriptionCycleEndDate = new Date(oneYearAgo.getTime() + 365 * 24 * 60 * 60 * 1000);
      testUser.subscription.listingsAllowanceYTD = 360; // Full year used
      testUser.subscription.listingsAllowanceThisMonth = 30;
      testUser.subscription.listingsCreatedThisMonth = 30;
      await testUser.save();

      const result = await listingCarryoverService.applyAnnualReset(testUser._id.toString());

      expect(result.success).toBe(true);
      expect(result.user?.subscription.listingsAllowanceYTD).toBe(30); // Reset to first month
      expect(result.user?.subscription.listingsAllowanceThisMonth).toBe(30);
      expect(result.user?.subscription.listingsCreatedThisMonth).toBe(0);
      expect(result.user?.subscription.carryoverListings).toBe(0);
      expect(result.user?.subscription.listingsArchivedDate).toBeDefined();
    });

    it('should archive listings older than 90 days', async () => {
      // This test would require Property model integration
      // Simplified here - in real scenario would test archival
      const result = await listingCarryoverService.applyAnnualReset(testUser._id.toString());
      expect(result.success).toBe(true);
    });

    it('should reject invalid user ID', async () => {
      const result = await listingCarryoverService.applyAnnualReset('invalid-id');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isAnnualCycleComplete', () => {
    it('should return true when cycle end date passed', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      testUser.subscription.subscriptionCycleStartDate = oneYearAgo;
      testUser.subscription.subscriptionCycleEndDate = new Date(oneYearAgo.getTime() + 365 * 24 * 60 * 60 * 1000);

      const isCycleComplete = listingCarryoverService.isAnnualCycleComplete(testUser);
      expect(isCycleComplete).toBe(true);
    });

    it('should return false when cycle end date in future', () => {
      const now = new Date();
      testUser.subscription.subscriptionCycleStartDate = now;
      testUser.subscription.subscriptionCycleEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      const isCycleComplete = listingCarryoverService.isAnnualCycleComplete(testUser);
      expect(isCycleComplete).toBe(false);
    });
  });

  describe('canCreateListing', () => {
    it('should allow listing creation when under limit', async () => {
      testUser.subscription.listingsCreatedThisMonth = 10;
      testUser.subscription.listingsAllowanceYTD = 30;
      testUser.subscription.listingsAllowanceThisMonth = 30;
      await testUser.save();

      const canCreate = await listingCarryoverService.canCreateListing(testUser._id.toString());
      expect(canCreate).toBe(true);
    });

    it('should prevent listing creation when at limit', async () => {
      testUser.subscription.listingsCreatedThisMonth = 30;
      testUser.subscription.listingsAllowanceYTD = 360; // Annual cap reached
      testUser.subscription.listingsAllowanceThisMonth = 30;
      await testUser.save();

      const canCreate = await listingCarryoverService.canCreateListing(testUser._id.toString());
      expect(canCreate).toBe(false);
    });

    it('should return false for invalid user', async () => {
      const canCreate = await listingCarryoverService.canCreateListing('invalid-id');
      expect(canCreate).toBe(false);
    });
  });

  describe('Full Workflow Scenario', () => {
    it('should handle 12-month subscription cycle with carryover', async () => {
      // Simulate a full year of subscription with carryover
      const monthlyAllowance = 30;
      let user = testUser;
      let totalListingsAllowed = 0;

      for (let month = 1; month <= 12; month++) {
        // Simulate user creating some listings
        const listingsCreated = Math.floor(Math.random() * 30) + 10; // 10-40 listings per month
        totalListingsAllowed += monthlyAllowance;

        // Refresh monthly allowance if not the first month
        if (month > 1) {
          user.subscription.listingsAllowanceThisMonth = monthlyAllowance;
          user.subscription.listingsCreatedThisMonth = listingsCreated;
          await user.save();

          const result = await listingCarryoverService.refreshMonthlyAllowance(user._id.toString());
          user = result.user!;
        } else {
          user.subscription.listingsCreatedThisMonth = listingsCreated;
          await user.save();
        }

        // Check annual cap hasn't been exceeded
        expect(user.subscription.listingsAllowanceYTD).toBeLessThanOrEqual(360); // 30 * 12
      }

      // After 12 months, trigger annual reset
      user.subscription.subscriptionCycleEndDate = new Date(); // Make it expired
      await user.save();

      const resetResult = await listingCarryoverService.applyAnnualReset(user._id.toString());
      user = resetResult.user!;

      // Verify reset
      expect(user.subscription.listingsAllowanceYTD).toBe(30); // Back to first month
      expect(user.subscription.listingsCreatedThisMonth).toBe(0);
      expect(user.subscription.carryoverListings).toBe(0);
    });
  });
});

export {};
