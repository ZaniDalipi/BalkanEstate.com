/**
 * Subscription Counters Test Suite
 * Tests the subscription counter logic for property creation/deletion
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/User';
import Property from '../models/Property';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

describe('Subscription Counters', () => {
  beforeEach(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Subscription Initialization', () => {
    it('should initialize subscription from proSubscription for Pro users', async () => {
      // Create user with Pro subscription
      const user = await User.create({
        email: 'pro@test.com',
        name: 'Pro User',
        password: 'password123',
        role: 'private_seller',
        proSubscription: {
          isActive: true,
          totalListingsLimit: 20,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          plan: 'pro_monthly',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
          }
        }
      });

      // Simulate initialization (like in getMe endpoint)
      if (!user.subscription && user.proSubscription?.isActive) {
        user.subscription = {
          tier: 'pro',
          status: 'active',
          listingsLimit: user.proSubscription.totalListingsLimit || 20,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: user.proSubscription.promotionCoupons.monthly,
            available: user.proSubscription.promotionCoupons.available,
            used: user.proSubscription.promotionCoupons.used,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
          startDate: user.proSubscription.startedAt,
          expiresAt: user.proSubscription.expiresAt,
        };
        await user.save();
      }

      // Verify initialization
      expect(user.subscription).toBeDefined();
      expect(user.subscription?.tier).toBe('pro');
      expect(user.subscription?.listingsLimit).toBe(25);
      expect(user.subscription?.activeListingsCount).toBe(0);
    });

    it('should initialize subscription as free for users without proSubscription', async () => {
      const user = await User.create({
        email: 'free@test.com',
        name: 'Free User',
        password: 'password123',
        role: 'private_seller',
      });

      // Simulate initialization
      if (!user.subscription) {
        user.subscription = {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        };
        await user.save();
      }

      expect(user.subscription?.tier).toBe('free');
      expect(user.subscription?.listingsLimit).toBe(3);
    });

    it('should count existing properties when initializing subscription', async () => {
      const user = await User.create({
        email: 'existing@test.com',
        name: 'Existing User',
        password: 'password123',
        role: 'private_seller',
        proSubscription: {
          isActive: true,
          totalListingsLimit: 20,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          plan: 'pro_monthly',
        }
      });

      // Create existing properties
      await Property.create({
        sellerId: user._id,
        title: 'Property 1',
        price: 100000,
        propertyType: 'house',
        status: 'active',
        createdAsRole: 'private_seller',
        address: 'Test Address 1',
        city: 'Test City',
        country: 'Test Country',
      });

      await Property.create({
        sellerId: user._id,
        title: 'Property 2',
        price: 150000,
        propertyType: 'apartment',
        status: 'active',
        createdAsRole: 'agent',
        address: 'Test Address 2',
        city: 'Test City',
        country: 'Test Country',
      });

      // Count existing properties
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      const activeListingsCount = existingProperties.length;
      const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
      const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

      // Initialize with counts
      user.subscription = {
        tier: 'pro',
        status: 'active',
        listingsLimit: 25,
        activeListingsCount,
        privateSellerCount,
        agentCount,
        promotionCoupons: {
          monthly: 3,
          available: 3,
          used: 0,
          rollover: 0,
          lastRefresh: new Date(),
        },
        savedSearchesLimit: 10,
        totalPaid: 0,
      };
      await user.save();

      expect(user.subscription?.activeListingsCount).toBe(2);
      expect(user.subscription?.privateSellerCount).toBe(1);
      expect(user.subscription?.agentCount).toBe(1);
    });
  });

  describe('Property Creation Counter Updates', () => {
    it('should increment activeListingsCount when creating property', async () => {
      const user = await User.create({
        email: 'test@test.com',
        name: 'Test User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 25,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      });

      // Simulate property creation counter increment
      user.subscription.activeListingsCount = (user.subscription.activeListingsCount || 0) + 1;
      user.subscription.privateSellerCount = (user.subscription.privateSellerCount || 0) + 1;
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(1);
      expect(user.subscription.privateSellerCount).toBe(1);
      expect(user.subscription.agentCount).toBe(0);
    });

    it('should increment agentCount when creating property as agent', async () => {
      const user = await User.create({
        email: 'agent@test.com',
        name: 'Agent User',
        password: 'password123',
        role: 'agent',
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 25,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      });

      // Simulate agent property creation
      user.subscription.activeListingsCount = (user.subscription.activeListingsCount || 0) + 1;
      user.subscription.agentCount = (user.subscription.agentCount || 0) + 1;
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(1);
      expect(user.subscription.privateSellerCount).toBe(0);
      expect(user.subscription.agentCount).toBe(1);
    });

    it('should prevent creating property when limit reached', async () => {
      const user = await User.create({
        email: 'limited@test.com',
        name: 'Limited User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 3, // Already at limit
          privateSellerCount: 3,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        }
      });

      // Check if limit reached
      const currentCount = user.subscription.activeListingsCount || 0;
      const limit = user.subscription.listingsLimit || 3;
      const canCreate = currentCount < limit;

      expect(canCreate).toBe(false);
    });
  });

  describe('Property Deletion Counter Updates', () => {
    it('should decrement activeListingsCount when deleting property', async () => {
      const user = await User.create({
        email: 'delete@test.com',
        name: 'Delete User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 25,
          activeListingsCount: 2,
          privateSellerCount: 1,
          agentCount: 1,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      });

      // Simulate property deletion (private seller)
      if (user.subscription.activeListingsCount > 0) {
        user.subscription.activeListingsCount -= 1;
      }
      if (user.subscription.privateSellerCount > 0) {
        user.subscription.privateSellerCount -= 1;
      }
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(1);
      expect(user.subscription.privateSellerCount).toBe(0);
      expect(user.subscription.agentCount).toBe(1);
    });

    it('should not decrement counters below zero', async () => {
      const user = await User.create({
        email: 'zero@test.com',
        name: 'Zero User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'free',
          status: 'active',
          listingsLimit: 3,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 0,
            available: 0,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 1,
          totalPaid: 0,
        }
      });

      // Try to decrement (should check > 0)
      if (user.subscription.activeListingsCount > 0) {
        user.subscription.activeListingsCount -= 1;
      }
      if (user.subscription.privateSellerCount > 0) {
        user.subscription.privateSellerCount -= 1;
      }
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(0);
      expect(user.subscription.privateSellerCount).toBe(0);
    });
  });

  describe('Subscription Sync', () => {
    it('should correctly recount all properties during sync', async () => {
      const user = await User.create({
        email: 'sync@test.com',
        name: 'Sync User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 25,
          activeListingsCount: 0, // Wrong count
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      });

      // Create properties
      await Property.create([
        {
          sellerId: user._id,
          title: 'Property 1',
          price: 100000,
          propertyType: 'house',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Test Address 1',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: user._id,
          title: 'Property 2',
          price: 150000,
          propertyType: 'apartment',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Test Address 2',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: user._id,
          title: 'Property 3',
          price: 200000,
          propertyType: 'land',
          status: 'active',
          createdAsRole: 'agent',
          address: 'Test Address 3',
          city: 'Test City',
          country: 'Test Country',
        },
      ]);

      // Sync counters
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      user.subscription.activeListingsCount = existingProperties.length;
      user.subscription.privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
      user.subscription.agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(3);
      expect(user.subscription.privateSellerCount).toBe(2);
      expect(user.subscription.agentCount).toBe(1);
    });

    it('should not count sold properties in active count', async () => {
      const user = await User.create({
        email: 'sold@test.com',
        name: 'Sold User',
        password: 'password123',
        role: 'private_seller',
        subscription: {
          tier: 'pro',
          status: 'active',
          listingsLimit: 25,
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: 3,
            available: 3,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: 10,
          totalPaid: 0,
        }
      });

      // Create properties with different statuses
      await Property.create([
        {
          sellerId: user._id,
          title: 'Active Property',
          price: 100000,
          propertyType: 'house',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Test Address',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: user._id,
          title: 'Sold Property',
          price: 150000,
          propertyType: 'apartment',
          status: 'sold',
          createdAsRole: 'private_seller',
          address: 'Test Address',
          city: 'Test City',
          country: 'Test Country',
        },
      ]);

      // Sync - only count active/pending/draft
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      user.subscription.activeListingsCount = existingProperties.length;
      user.subscription.privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
      await user.save();

      expect(user.subscription.activeListingsCount).toBe(1); // Only active property
      expect(user.subscription.privateSellerCount).toBe(1);
    });
  });
});
