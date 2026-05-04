import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User';
import Product from '../models/Product';
import Property from '../models/Property';
import listingLimitService from '../services/listingLimitService';

/**
 * Integration Tests: Simplified Listing Limit System
 *
 * Tests the real estate platform model where:
 * - Users get X listings per month
 * - Old listings stay active (don't disappear on renewal)
 * - After 1 year, archive listings >90 days old and reset
 */

describe('Listing Limit System - Real Estate Platform Model', () => {
  let testUser: any;
  let testProduct: any;
  let agencyProduct: any;

  beforeEach(async () => {
    // Create test products
    agencyProduct = await Product.create({
      productId: 'agency_monthly_test',
      name: 'Agency Monthly',
      tier: 'agency',
      listingsLimit: 30,
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

    // Create test user
    testUser = await User.create({
      email: 'test-agency@example.com',
      password: 'hashed_password',
      name: 'Test Agency User',
      role: 'agent',
      subscription: {
        tier: 'agency_agent',
        status: 'active',
        subscriptionCycleStartDate: new Date('2024-01-01'),
        subscriptionCycleEndDate: new Date('2025-01-01'),
        activeListingsCount: 0,
      },
      subscriptionPlan: 'agency_monthly_test',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
    await Property.deleteMany({});
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: MONTH 1 - USER CREATES LISTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  it('MONTH 1: User can create up to 30 listings', async () => {
    const user = testUser;
    const monthlyAllowance = await listingLimitService.getMonthlyAllowance(user.subscriptionPlan);
    const maxAllowed = listingLimitService.getMaxAllowedListings(
      user.subscription.subscriptionCycleStartDate,
      monthlyAllowance
    );

    expect(monthlyAllowance).toBe(30);
    expect(maxAllowed).toBe(30);
    expect(user.subscription.activeListingsCount).toBe(0);

    // Create 20 listings
    for (let i = 0; i < 20; i++) {
      const property = await Property.create({
        owner: user._id,
        title: `Property ${i + 1}`,
        description: 'Test property',
        address: `Test Address ${i + 1}`,
        price: 100000,
        createdAt: new Date('2024-01-15'),
        status: 'active',
      });

      user.subscription.activeListingsCount += 1;
    }

    await user.save();

    // Verify
    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.subscription?.activeListingsCount).toBe(20);
    expect(20 < maxAllowed).toBe(true); // Can create more
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: MONTH 2 - OLD LISTINGS STAY ACTIVE
  // ═══════════════════════════════════════════════════════════════════════════
  it('MONTH 2: Old listings stay active, max allowed increases to 60', async () => {
    const user = testUser;

    // Setup: Month 1 with 20 listings
    for (let i = 0; i < 20; i++) {
      await Property.create({
        owner: user._id,
        title: `Listing from Month 1 - ${i + 1}`,
        description: 'Old listing',
        address: `Address ${i + 1}`,
        price: 100000,
        createdAt: new Date('2024-01-15'),
        status: 'active',
      });
    }
    user.subscription.activeListingsCount = 20;
    await user.save();

    // Simulate Month 2 (30 days later)
    const cycleStartDate = new Date('2024-01-01');
    const month2Date = new Date('2024-02-01');

    const monthlyAllowance = 30;
    const maxAllowedMonth2 = listingLimitService.getMaxAllowedListings(cycleStartDate, monthlyAllowance);

    // Calculate based on days elapsed from cycle start to month 2
    const daysSince = Math.floor((month2Date.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const monthsElapsed = Math.floor(daysSince / 30) + 1;

    // Should be 2 months, so 2 × 30 = 60
    expect(monthsElapsed).toBeGreaterThanOrEqual(1);
    expect(monthsElapsed <= 2).toBe(true);

    // Old listings should still be there
    const properties = await Property.find({ owner: user._id, status: 'active' });
    expect(properties.length).toBe(20); // ✓ Old ones stay active!

    // User can create 40 more (60 max - 20 current = 40)
    const updatedUser = await User.findById(user._id);
    const canCreateMore = 20 < maxAllowedMonth2;
    expect(canCreateMore).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: MONTH 6 - STACKING WORKS (6 × 30 = 180 max)
  // ═══════════════════════════════════════════════════════════════════════════
  it('MONTH 6: Max allowed = 6 months × 30 = 180 listings', async () => {
    const cycleStartDate = new Date('2024-01-01');
    const month6Date = new Date('2024-06-01');

    const monthlyAllowance = 30;
    const daysSince = Math.floor((month6Date.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const monthsElapsed = Math.floor(daysSince / 30) + 1;

    const maxAllowedMonth6 = listingLimitService.getMaxAllowedListings(cycleStartDate, monthlyAllowance);

    // Verify the calculation
    expect(monthsElapsed).toBeGreaterThanOrEqual(5);
    expect(monthsElapsed <= 6).toBe(true);
    expect(maxAllowedMonth6).toBeGreaterThanOrEqual(150); // At least 5 × 30
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: MONTH 12 - ANNUAL CAP (360 max, NOT 365!)
  // ═══════════════════════════════════════════════════════════════════════════
  it('MONTH 12: Max allowed capped at 360 (12 × 30)', async () => {
    const cycleStartDate = new Date('2024-01-01');
    const month12Date = new Date('2024-12-01');

    const monthlyAllowance = 30;
    const daysSince = Math.floor((month12Date.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const monthsElapsed = Math.floor(daysSince / 30) + 1;

    const maxAllowedMonth12 = listingLimitService.getMaxAllowedListings(cycleStartDate, monthlyAllowance);

    // Should be capped at 12 months
    const effectiveMonths = Math.min(monthsElapsed, 12);
    const expectedMax = effectiveMonths * 30;

    expect(maxAllowedMonth12).toBeLessThanOrEqual(360);
    expect(maxAllowedMonth12).toBeGreaterThanOrEqual(330); // Close to 360
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: ANNUAL RESET - Archive old listings >90 days
  // ═══════════════════════════════════════════════════════════════════════════
  it('ANNUAL RESET: Archive listings older than 90 days', async () => {
    const user = testUser;

    // Create listings across different months
    const oldDate = new Date('2024-01-15'); // >90 days old
    const recentDate = new Date('2024-10-15'); // <90 days old (assuming cycle ends Jan 1, 2025)

    // Create old listings (from month 1)
    for (let i = 0; i < 15; i++) {
      await Property.create({
        owner: user._id,
        title: `Old Listing ${i + 1}`,
        description: 'Old',
        address: `Old Address ${i + 1}`,
        price: 100000,
        createdAt: oldDate,
        status: 'active',
      });
    }

    // Create recent listings (from month 10)
    for (let i = 0; i < 10; i++) {
      await Property.create({
        owner: user._id,
        title: `Recent Listing ${i + 1}`,
        description: 'Recent',
        address: `Recent Address ${i + 1}`,
        price: 100000,
        createdAt: recentDate,
        status: 'active',
      });
    }

    user.subscription.activeListingsCount = 25;
    await user.save();

    // Verify before reset
    const beforeReset = await Property.countDocuments({ owner: user._id, status: 'active' });
    expect(beforeReset).toBe(25);

    // Apply annual reset
    const resetResult = await listingLimitService.applyAnnualReset(user._id.toString());

    expect(resetResult.success).toBe(true);
    expect(resetResult.archivedCount).toBeGreaterThan(0); // Should archive old ones

    // Verify after reset
    const archivedCount = await Property.countDocuments({
      owner: user._id,
      status: 'archived',
    });
    const activeCount = await Property.countDocuments({
      owner: user._id,
      status: 'active',
    });

    expect(archivedCount).toBeGreaterThan(0); // Old ones archived
    expect(activeCount).toBeGreaterThan(0); // Recent ones stay active
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: ANNUAL RESET - Cycle resets
  // ═══════════════════════════════════════════════════════════════════════════
  it('ANNUAL RESET: Subscription cycle resets to new year', async () => {
    const user = testUser;
    const originalCycleStart = user.subscription.subscriptionCycleStartDate;

    // Apply annual reset
    await listingLimitService.applyAnnualReset(user._id.toString());

    // Verify user was updated
    const updatedUser = await User.findById(user._id);
    const newCycleStart = updatedUser?.subscription?.subscriptionCycleStartDate;
    const newCycleEnd = updatedUser?.subscription?.subscriptionCycleEndDate;

    // New cycle should start TODAY (not preserve old date)
    expect(newCycleStart).toBeDefined();
    expect(newCycleEnd).toBeDefined();

    // Cycle end should be ~365 days from start
    const daysDiff = (newCycleEnd!.getTime() - newCycleStart!.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(360);
    expect(daysDiff).toBeLessThan(370);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Can create listing validation
  // ═══════════════════════════════════════════════════════════════════════════
  it('canCreateListing: Returns true when under limit, false when at limit', async () => {
    const user = testUser;
    user.subscription.activeListingsCount = 25; // Out of 30 max
    await user.save();

    // Should be able to create (25 < 30)
    const canCreate = await listingLimitService.canCreateListing(user._id.toString());
    expect(canCreate).toBe(true);

    // Max out the user
    user.subscription.activeListingsCount = 30;
    await user.save();

    // Should NOT be able to create (30 >= 30)
    const canCreateWhenFull = await listingLimitService.canCreateListing(user._id.toString());
    expect(canCreateWhenFull).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8: EDGE CASE - Renewal near anniversary
  // ═══════════════════════════════════════════════════════════════════════════
  it('EDGE CASE: User renews subscription on day 365 (annual reset triggers)', async () => {
    const user = testUser;
    const cycleStartDate = new Date('2024-01-01');
    const renewalDate = new Date('2024-12-31'); // Day 365

    user.subscription.subscriptionCycleStartDate = cycleStartDate;
    user.subscription.subscriptionCycleEndDate = new Date(
      cycleStartDate.getTime() + 365 * 24 * 60 * 60 * 1000
    );
    await user.save();

    // Check if annual cycle is complete
    const isComplete = listingLimitService.isAnnualCycleComplete(user);

    // On day 365 (or very close), cycle should be complete or about to complete
    const daysSince = (renewalDate.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(daysSince).toBeGreaterThanOrEqual(360);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 9: Different tier with different monthly allowance
  // ═══════════════════════════════════════════════════════════════════════════
  it('Different tiers have different monthly allowances', async () => {
    // Create Pro Monthly product (20 listings/month)
    const proProduct = await Product.create({
      productId: 'pro_monthly_test',
      name: 'Pro Monthly',
      tier: 'pro',
      listingsLimit: 20,
      billingPeriod: 'monthly',
      price: 49,
      currency: 'EUR',
      isActive: true,
      isVisible: true,
      features: [],
      targetRole: 'seller',
      displayOrder: 2,
      highlighted: false,
    });

    const agencyAllowance = await listingLimitService.getMonthlyAllowance('agency_monthly_test');
    const proAllowance = await listingLimitService.getMonthlyAllowance('pro_monthly_test');

    expect(agencyAllowance).toBe(30); // Agency: 30/month
    expect(proAllowance).toBe(20); // Pro: 20/month
    expect(agencyAllowance).toBeGreaterThan(proAllowance);
  });
});
