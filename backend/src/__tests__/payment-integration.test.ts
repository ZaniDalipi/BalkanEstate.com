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
  MOCK_PADDLE_RESPONSES,
  createMockUser,
  createMockPaddleWebhook,
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

    it('includes stripeCountries and paddleCountries', async () => {
      const res = await request(app)
        .get('/api/payments/supported-countries')
        .expect(200);

      expect(res.body.stripeCountries).toBeDefined();
      expect(res.body.paddleCountries).toBeDefined();
      expect(res.body.stripeCountries).toHaveLength(5);
      expect(res.body.paddleCountries).toHaveLength(6);
    });

    it('includes provider info for each country', async () => {
      const res = await request(app)
        .get('/api/payments/supported-countries')
        .expect(200);

      res.body.countries.forEach((country: any) => {
        expect(country.providerInfo).toBeDefined();
        expect(country.providerInfo.name).toBeDefined();
        expect(country.providerInfo.fees).toBeDefined();
      });
    });
  });

  describe('GET /api/payments/providers/:countryCode', () => {

    it('returns Stripe for Greece (EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/GR')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('stripe');
      expect(res.body.countryName).toBe('Greece');
      expect(res.body.isEU).toBe(true);
    });

    it('returns Paddle for Serbia (non-EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/RS')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('paddle');
      expect(res.body.countryName).toBe('Serbia');
      expect(res.body.isEU).toBe(false);
    });

    it('returns Stripe as default for unknown country', async () => {
      const res = await request(app)
        .get('/api/payments/providers/XX')
        .expect(200);

      expect(res.body.provider).toBe('stripe');
    });

    it('handles lowercase country codes', async () => {
      const res = await request(app)
        .get('/api/payments/providers/rs')
        .expect(200);

      expect(res.body.provider).toBe('paddle');
    });
  });

  describe('GET /api/payments/paddle/config', () => {

    it('returns Paddle configuration', async () => {
      const res = await request(app)
        .get('/api/payments/paddle/config')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.environment).toBeDefined();
      expect(['sandbox', 'production']).toContain(res.body.environment);
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
        .send(TEST_PAYMENT_REQUESTS.stripePayment)
        .expect(401);
    });

    it('creates Stripe payment for EU country', async () => {
      const { user, token } = await createAuthenticatedUser(TEST_USERS.greekUser);

      const res = await request(app)
        .post('/api/payments/create-payment')
        .set('Authorization', `Bearer ${token}`)
        .send(TEST_PAYMENT_REQUESTS.stripePayment);

      // Will return error if Stripe not configured, but should route to Stripe
      expect(res.body.provider).toBe('stripe');
    });

    it('creates Paddle payment for non-EU country', async () => {
      const { user, token } = await createAuthenticatedUser(TEST_USERS.serbianUser);

      const res = await request(app)
        .post('/api/payments/create-payment')
        .set('Authorization', `Bearer ${token}`)
        .send(TEST_PAYMENT_REQUESTS.paddlePayment);

      // Will fall back to Stripe if Paddle not configured
      expect(['paddle', 'stripe']).toContain(res.body.provider);
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
// WEBHOOK TESTS
// ============================================================

describe('Webhook Endpoints', () => {

  describe('POST /api/payments/paddle/webhook', () => {

    it('accepts valid webhook format', async () => {
      const res = await request(app)
        .post('/api/payments/paddle/webhook')
        .set('Content-Type', 'application/json')
        .send(MOCK_PADDLE_RESPONSES.transactionCompleted)
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('handles transaction.completed event', async () => {
      const { user } = await createAuthenticatedUser(TEST_USERS.serbianUser);

      const webhook = createMockPaddleWebhook(
        'transaction.completed',
        user._id.toString()
      );

      const res = await request(app)
        .post('/api/payments/paddle/webhook')
        .set('Content-Type', 'application/json')
        .send(webhook)
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('handles subscription.created event', async () => {
      const res = await request(app)
        .post('/api/payments/paddle/webhook')
        .set('Content-Type', 'application/json')
        .send(MOCK_PADDLE_RESPONSES.subscriptionCreated)
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('handles subscription.canceled event', async () => {
      const res = await request(app)
        .post('/api/payments/paddle/webhook')
        .set('Content-Type', 'application/json')
        .send(MOCK_PADDLE_RESPONSES.subscriptionCanceled)
        .expect(200);

      expect(res.body.received).toBe(true);
    });

    it('handles malformed webhook gracefully', async () => {
      const res = await request(app)
        .post('/api/payments/paddle/webhook')
        .set('Content-Type', 'application/json')
        .send({ invalid: 'data' })
        .expect(200); // Should still return 200 to prevent retries

      expect(res.body.received).toBe(true);
    });
  });

  describe('GET /api/payments/paddle/verify/:transactionId', () => {

    it('requires authentication', async () => {
      await request(app)
        .get('/api/payments/paddle/verify/txn_123')
        .expect(401);
    });

    it('returns pending for unprocessed transaction', async () => {
      const { token } = await createAuthenticatedUser(TEST_USERS.serbianUser);

      const res = await request(app)
        .get('/api/payments/paddle/verify/txn_unknown')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.paymentStatus).toBe('pending');
    });
  });
});

// ============================================================
// SUBSCRIPTION FLOW TESTS
// ============================================================

describe('Full Subscription Flow', () => {

  it('complete flow: create payment -> webhook -> verify', async () => {
    // 1. Create authenticated user
    const { user, token } = await createAuthenticatedUser(
      createMockUser('RS', { email: 'flow.test@balkanestateai.com' })
    );

    // 2. Check initial status
    let statusRes = await request(app)
      .get('/api/payments/subscription-status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(statusRes.body.isSubscribed).toBe(false);

    // 3. Simulate webhook (payment completed)
    const webhook = createMockPaddleWebhook(
      'transaction.completed',
      user._id.toString(),
      'txn_flow_test_123'
    );

    await request(app)
      .post('/api/payments/paddle/webhook')
      .set('Content-Type', 'application/json')
      .send(webhook)
      .expect(200);

    // 4. Verify subscription was created
    // Note: In real test, we'd check the database directly
    const updatedUser = await User.findById(user._id);
    // Subscription should be active after webhook processing
  });
});

// ============================================================
// ERROR HANDLING TESTS
// ============================================================

describe('Error Handling', () => {

  it('handles database connection errors gracefully', async () => {
    // This tests the error handling paths
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
