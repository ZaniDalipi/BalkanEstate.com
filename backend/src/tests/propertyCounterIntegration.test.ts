/**
 * Property Counter Integration Tests
 * Tests the end-to-end flow of creating/deleting properties and counter updates
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app'; // Your Express app
import User from '../models/User';
import Property from '../models/Property';
import { generateToken } from '../utils/auth';

let mongoServer: MongoMemoryServer;
let authToken: string;
let userId: string;

describe('Property Counter Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await Property.deleteMany({});

    // Create test user with Pro subscription
    const user = await User.create({
      email: 'test@test.com',
      name: 'Test User',
      password: 'password123',
      role: 'private_seller',
      availableRoles: ['private_seller', 'agent'],
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

    userId = String(user._id);
    authToken = generateToken(user._id);
  });

  describe('POST /api/properties - Create Property', () => {
    it('should increment counters when creating property as private_seller', async () => {
      const propertyData = {
        title: 'Test Property',
        price: 100000,
        propertyType: 'house',
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
        createdAsRole: 'private_seller',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(201);

      // Check response includes updatedSubscription
      expect(response.body.updatedSubscription).toBeDefined();
      expect(response.body.updatedSubscription.activeListingsCount).toBe(1);
      expect(response.body.updatedSubscription.privateSellerCount).toBe(1);
      expect(response.body.updatedSubscription.agentCount).toBe(0);

      // Verify database
      const user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(1);
      expect(user?.subscription?.privateSellerCount).toBe(1);
      expect(user?.subscription?.agentCount).toBe(0);
    });

    it('should increment agentCount when creating property as agent', async () => {
      const propertyData = {
        title: 'Agent Property',
        price: 150000,
        propertyType: 'apartment',
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
        createdAsRole: 'agent',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(201);

      expect(response.body.updatedSubscription.activeListingsCount).toBe(1);
      expect(response.body.updatedSubscription.privateSellerCount).toBe(0);
      expect(response.body.updatedSubscription.agentCount).toBe(1);
    });

    it('should reject when listing limit reached', async () => {
      // Update user to free tier with limit reached
      await User.findByIdAndUpdate(userId, {
        'subscription.tier': 'free',
        'subscription.listingsLimit': 3,
        'subscription.activeListingsCount': 3,
        'subscription.privateSellerCount': 3,
      });

      const propertyData = {
        title: 'Rejected Property',
        price: 100000,
        propertyType: 'house',
        address: 'Test Address',
        city: 'Test City',
        country: 'Test Country',
        createdAsRole: 'private_seller',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send(propertyData)
        .expect(403);

      expect(response.body.message).toMatch(/listing limit/i);
    });

    it('should handle multiple properties correctly', async () => {
      // Create 3 properties
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/properties')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Property ${i}`,
            price: 100000 * i,
            propertyType: 'house',
            address: `Address ${i}`,
            city: 'Test City',
            country: 'Test Country',
            createdAsRole: i % 2 === 0 ? 'agent' : 'private_seller',
          })
          .expect(201);
      }

      // Verify counters
      const user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(3);
      expect(user?.subscription?.privateSellerCount).toBe(2); // Properties 1 and 3
      expect(user?.subscription?.agentCount).toBe(1); // Property 2
    });
  });

  describe('DELETE /api/properties/:id - Delete Property', () => {
    let propertyId: string;

    beforeEach(async () => {
      // Create a property first
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Property to Delete',
          price: 100000,
          propertyType: 'house',
          address: 'Test Address',
          city: 'Test City',
          country: 'Test Country',
          createdAsRole: 'private_seller',
        });

      propertyId = response.body.property.id;
    });

    it('should decrement counters when deleting property', async () => {
      const response = await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check response includes updatedSubscription
      expect(response.body.updatedSubscription).toBeDefined();
      expect(response.body.updatedSubscription.activeListingsCount).toBe(0);
      expect(response.body.updatedSubscription.privateSellerCount).toBe(0);

      // Verify database
      const user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(0);
      expect(user?.subscription?.privateSellerCount).toBe(0);
    });

    it('should not decrement counters below zero', async () => {
      // Delete the property
      await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Counters should be 0
      const user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(0);

      // Try to delete non-existent property (shouldn't affect counters)
      await request(app)
        .delete(`/api/properties/${propertyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Counters should still be 0 (not negative)
      const userAfter = await User.findById(userId);
      expect(userAfter?.subscription?.activeListingsCount).toBe(0);
    });
  });

  describe('POST /api/auth/sync-stats - Sync Counters', () => {
    it('should correctly recount all properties', async () => {
      // Create properties directly in database (bypassing counter logic)
      await Property.create([
        {
          sellerId: userId,
          title: 'Property 1',
          price: 100000,
          propertyType: 'house',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Address 1',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: userId,
          title: 'Property 2',
          price: 150000,
          propertyType: 'apartment',
          status: 'active',
          createdAsRole: 'agent',
          address: 'Address 2',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: userId,
          title: 'Property 3',
          price: 200000,
          propertyType: 'house',
          status: 'sold', // Sold - should not be counted
          createdAsRole: 'private_seller',
          address: 'Address 3',
          city: 'Test City',
          country: 'Test Country',
        },
      ]);

      // User counters are still 0 (wrong)
      let user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(0);

      // Sync counters
      const response = await request(app)
        .post('/api/auth/sync-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify counters updated
      user = await User.findById(userId);
      expect(user?.subscription?.activeListingsCount).toBe(2); // Only active properties
      expect(user?.subscription?.privateSellerCount).toBe(1);
      expect(user?.subscription?.agentCount).toBe(1);
    });
  });

  describe('GET /api/auth/me - Auto Migration', () => {
    it('should initialize subscription from proSubscription on first getMe call', async () => {
      // Create user without subscription but with proSubscription
      await User.deleteMany({});
      const legacyUser = await User.create({
        email: 'legacy@test.com',
        name: 'Legacy User',
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

      const token = generateToken(legacyUser._id);

      // Create some properties for this user
      await Property.create([
        {
          sellerId: legacyUser._id,
          title: 'Existing Property 1',
          price: 100000,
          propertyType: 'house',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Address 1',
          city: 'Test City',
          country: 'Test Country',
        },
        {
          sellerId: legacyUser._id,
          title: 'Existing Property 2',
          price: 150000,
          propertyType: 'apartment',
          status: 'active',
          createdAsRole: 'private_seller',
          address: 'Address 2',
          city: 'Test City',
          country: 'Test Country',
        },
      ]);

      // Call getMe - should trigger migration
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Check subscription was initialized
      expect(response.body.user.subscription).toBeDefined();
      expect(response.body.user.subscription.tier).toBe('pro');
      expect(response.body.user.subscription.listingsLimit).toBe(25);
      expect(response.body.user.subscription.activeListingsCount).toBe(2);
      expect(response.body.user.subscription.privateSellerCount).toBe(2);
    });
  });
});
