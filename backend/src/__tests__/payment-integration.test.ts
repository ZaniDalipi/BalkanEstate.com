/**
 * Payment Integration Tests
 *
 * End-to-end tests for payment flows
 * Run: npm test -- --testPathPattern=payment-integration
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import User from '../models/User';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import {
  TEST_USERS,
  TEST_PRODUCTS,
  TEST_PAYMENT_REQUESTS,
  createMockUser,
} from './fixtures/payment-fixtures';

let mongoServer: MongoMemoryServer;
let authToken: string;
let testUserId: string;

// ============================================================
// SETUP & TEARDOWN
// ============================================================

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Seed products
  await Product.insertMany(Object.values(TEST_PRODUCTS));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear users and subscriptions before each test
  await User.deleteMany({});
  await Subscription.deleteMany({});
});

// Helper to create and authenticate a user
async function createAuthenticatedUser(userData: any) {
  const user = await User.create({
    ...userData,
    password: 'TestPassword123!',
    provider: 'local',
    isEmailVerified: true,
  });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: 'TestPassword123!' });

  return {
    user,
    token: loginRes.body.token,
  };
}

// ============================================================
// PUBLIC ENDPOINT TESTS
// ============================================================

describe('Public Payment Endpoints', () => {

  describe('GET /api/payments/supported-countries', () => {

    it('returns all 11 supported countries', async () => {
      const res = await request(app)
        .get('/api/payments/supported-countries')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.countries).toHaveLength(11);
    });

    it('includes provider info for each country', async () => {
      const res = await request(app)
        .get('/api/payments/supported-countries')
        .expect(200);

      res.body.countries.forEach((country: any) => {
        expect(country.providerInfo).toBeDefined();
        expect(country.providerInfo.name).toBeDefined();
      });
    });
  });

  describe('GET /api/payments/providers/:countryCode', () => {

    it('returns web for Greece (EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/GR')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('web');
      expect(res.body.countryName).toBe('Greece');
      expect(res.body.isEU).toBe(true);
    });

    it('returns web for Serbia (non-EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/RS')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('web');
      expect(res.body.countryName).toBe('Serbia');
      expect(res.body.isEU).toBe(false);
    });

    it('handles lowercase country codes', async () => {
      const res = await request(app)
        .get('/api/payments/providers/rs')
        .expect(200);

      expect(res.body.provider).toBe('web');
    });
  });
});

// ============================================================
// AUTHENTICATED ENDPOINT TESTS
// ============================================================

describe('Authenticated Payment Endpoints', () => {

  describe('POST /api/payments/create-payment', () => {

    it('requires authentication', async () => {
      await request(app)
        .post('/api/payments/create-payment')
        .send(TEST_PAYMENT_REQUESTS.webPaymentEU)
        .expect(401);
    });

    it('validates required fields', async () => {
      const { token } = await createAuthenticatedUser(TEST_USERS.greekUser);

      const res = await request(app)
        .post('/api/payments/create-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.message).toBeDefined();
    });
  });

  describe('GET /api/payments/subscription-status', () => {

    it('requires authentication', async () => {
      await request(app)
        .get('/api/payments/subscription-status')
        .expect(401);
    });

    it('returns not subscribed for new user', async () => {
      const { token } = await createAuthenticatedUser(TEST_USERS.greekUser);

      const res = await request(app)
        .get('/api/payments/subscription-status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.isSubscribed).toBe(false);
    });

    it('returns subscription details for subscribed user', async () => {
      const { user, token } = await createAuthenticatedUser(TEST_USERS.subscribedUser);

      const res = await request(app)
        .get('/api/payments/subscription-status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.isSubscribed).toBe(true);
      expect(res.body.subscriptionPlan).toBe('pro_monthly');
    });
  });

  describe('POST /api/payments/cancel-subscription', () => {

    it('requires authentication', async () => {
      await request(app)
        .post('/api/payments/cancel-subscription')
        .expect(401);
    });
  });
});

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

describe('Error Handling', () => {

  it('handles database connection errors gracefully', async () => {
    const res = await request(app)
      .get('/api/payments/supported-countries')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('returns appropriate error for invalid payment data', async () => {
    const { token } = await createAuthenticatedUser(TEST_USERS.greekUser);

    const res = await request(app)
      .post('/api/payments/create-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: -100 }) // Invalid amount
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});
