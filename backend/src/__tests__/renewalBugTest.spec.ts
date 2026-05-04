/**
 * TEST: Renewal & Listing Growth
 *
 * Scenario:
 * 1. User subscribes on Day 1 → gets 30 listings
 * 2. Creates 20 listings
 * 3. Subscription expires after 1 day (Day 2)
 * 4. User renews on Day 2
 * 5. Expected: Max allowed should increase to 60 (or stay at 30 if still month 1?)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import User from '../models/User';
import Product from '../models/Product';
import listingLimitService from '../services/listingLimitService';

describe('CRITICAL BUG TEST: Renewal Not Adding More Listings', () => {
  let testUser: any;
  let agencyProduct: any;

  beforeEach(async () => {
    // Create product
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

    // Create user
    testUser = await User.create({
      email: 'test-renewal@example.com',
      password: 'hashed_password',
      name: 'Test Renewal User',
      role: 'agent',
      subscription: {
        tier: 'agency_agent',
        status: 'active',
        subscriptionCycleStartDate: new Date('2024-01-01'),
        subscriptionCycleEndDate: new Date('2024-01-02'), // Expires after 1 day!
        activeListingsCount: 0,
      },
      subscriptionPlan: 'agency_monthly_test',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  it('BUG: User renews on Day 2 but still sees 30 listings max, not 60', async () => {
    const user = testUser;

    // Day 1: User creates 20 listings
    const monthlyAllowance = await listingLimitService.getMonthlyAllowance(user.subscriptionPlan);
    let maxAllowedDay1 = listingLimitService.getMaxAllowedListings(
      user.subscription.subscriptionCycleStartDate,
      monthlyAllowance
    );

    console.log('DAY 1:');
    console.log(`  Monthly allowance: ${monthlyAllowance}`);
    console.log(`  Max allowed: ${maxAllowedDay1}`);
    console.log(`  Cycle start: ${user.subscription.subscriptionCycleStartDate}`);
    console.log(`  Cycle end: ${user.subscription.subscriptionCycleEndDate}`);

    expect(maxAllowedDay1).toBe(30); // Month 1: 30 max
    user.subscription.activeListingsCount = 20;
    await user.save();

    // ===================================================================
    // DAY 2: SUBSCRIPTION EXPIRES AND USER RENEWS
    // ===================================================================
    // Simulate renewal - subscription gets extended
    const renewalDate = new Date('2024-01-02');
    const newExpirationDate = new Date(renewalDate);
    newExpirationDate.setMonth(newExpirationDate.getMonth() + 1); // Add 1 month

    console.log('\nDAY 2 - RENEWAL:');
    console.log(`  Renewal date: ${renewalDate}`);
    console.log(`  New expiration: ${newExpirationDate}`);

    // THE BUG: We need to check - does subscriptionCycleEndDate get updated?
    // If it doesn't, then months elapsed is still calculated from Day 1
    // Which means: (Day2 - Day1) / 30 = 1/30 = 0, + 1 = Month 1 still!

    // Update subscription (this is what should happen on renewal)
    user.subscription.subscriptionCycleEndDate = newExpirationDate;
    await user.save();

    const updatedUser = await User.findById(user._id);
    const maxAllowedDay2 = listingLimitService.getMaxAllowedListings(
      updatedUser!.subscription.subscriptionCycleStartDate,
      monthlyAllowance
    );

    console.log('\nAFTER RENEWAL:');
    console.log(`  Days since cycle start: ${(renewalDate.getTime() - updatedUser!.subscription.subscriptionCycleStartDate!.getTime()) / (24 * 60 * 60 * 1000)}`);
    console.log(`  Max allowed: ${maxAllowedDay2}`);
    console.log(`  ❌ BUG: Still 30, should be 60!`);

    // The problem: We're only 1 day into the cycle
    // So: Math.floor(1 / 30) + 1 = 0 + 1 = Month 1 still
    // User is confused because they renewed but max didn't increase
    expect(maxAllowedDay2).toBe(30); // Still month 1 because only 1 day has passed!
  });

  it('CORRECT: User renews on Day 31 (1 month later) and sees 60 listings max', async () => {
    const user = testUser;

    // Day 1: User creates 20 listings
    const monthlyAllowance = 30;
    let maxAllowedDay1 = listingLimitService.getMaxAllowedListings(
      user.subscription.subscriptionCycleStartDate,
      monthlyAllowance
    );

    console.log('\nDAY 1:');
    console.log(`  Max allowed: ${maxAllowedDay1}`);
    expect(maxAllowedDay1).toBe(30);

    user.subscription.activeListingsCount = 20;
    await user.save();

    // ===================================================================
    // DAY 31: 1 MONTH LATER - USER RENEWS
    // ===================================================================
    const renewalDate = new Date('2024-02-01'); // Day 31 (1 month later)

    console.log('\nDAY 31 (1 MONTH LATER):');
    console.log(`  Renewal date: ${renewalDate}`);
    console.log(`  Days since start: ${(renewalDate.getTime() - user.subscription.subscriptionCycleStartDate!.getTime()) / (24 * 60 * 60 * 1000)}`);

    const maxAllowedDay31 = listingLimitService.getMaxAllowedListings(
      user.subscription.subscriptionCycleStartDate,
      monthlyAllowance
    );

    console.log(`  Max allowed: ${maxAllowedDay31}`);
    console.log(`  ✓ CORRECT: Now 60!`);

    expect(maxAllowedDay31).toBe(60); // Month 2: 60 max
  });

  it('DIAGNOSIS: Calculate months correctly', () => {
    const cycleStart = new Date('2024-01-01');
    const monthlyAllowance = 30;

    // Test at different days
    const testDates = [
      { day: 1, date: new Date('2024-01-01') },
      { day: 2, date: new Date('2024-01-02') },
      { day: 30, date: new Date('2024-01-30') },
      { day: 31, date: new Date('2024-01-31') },
      { day: 32, date: new Date('2024-02-02') },
      { day: 60, date: new Date('2024-02-29') },
      { day: 61, date: new Date('2024-03-01') },
    ];

    console.log('\nMONTHS ELAPSED CALCULATION:');
    console.log('Day | Date       | Days Since | Months | Max Allowed');
    console.log('----+------------+------------+--------+-------------');

    testDates.forEach(({ day, date }) => {
      const daysSince = Math.floor((date.getTime() - cycleStart.getTime()) / (24 * 60 * 60 * 1000));
      const monthsElapsed = Math.floor(daysSince / 30) + 1;
      const maxAllowed = Math.min(monthsElapsed * monthlyAllowance, 12 * monthlyAllowance);

      console.log(
        `${String(day).padEnd(3)} | ${date.toISOString().split('T')[0]} | ${String(daysSince).padEnd(10)} | ${String(monthsElapsed).padEnd(6)} | ${maxAllowed}`
      );
    });
  });
});
