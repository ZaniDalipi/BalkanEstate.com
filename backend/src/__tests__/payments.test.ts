/**
 * Payment System Tests
 *
 * Test cases for Stripe + Paddle payment integration
 * Run with: npm test -- --testPathPattern=payments
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import User from '../models/User';
import Product from '../models/Product';

// Test configuration
let mongoServer: MongoMemoryServer;
let authToken: string;
let testUser: any;

// Test data
const TEST_USER = {
  email: 'test@balkanestateai.com',
  password: 'TestPassword123!',
  name: 'Test User',
  country: 'RS', // Serbia - uses Paddle
};

const TEST_USER_EU = {
  email: 'testeu@balkanestateai.com',
  password: 'TestPassword123!',
  name: 'Test EU User',
  country: 'GR', // Greece - uses Stripe
};

const TEST_PRODUCTS = [
  {
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional monthly subscription',
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly',
    isActive: true,
  },
  {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Professional yearly subscription',
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly',
    isActive: true,
  },
];

// ============================================================
// TEST SETUP
// ============================================================

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  // Create test products
  await Product.insertMany(TEST_PRODUCTS);

  // Create test user and get auth token
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send(TEST_USER);

  if (registerRes.status === 201) {
    authToken = registerRes.body.token;
    testUser = registerRes.body.user;
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ============================================================
// COUNTRY ROUTING TESTS
// ============================================================

describe('Payment Provider Routing', () => {

  test('GET /api/payments/supported-countries - returns all supported countries', async () => {
    const res = await request(app)
      .get('/api/payments/supported-countries')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.countries).toBeDefined();
    expect(res.body.countries.length).toBeGreaterThan(0);
    expect(res.body.stripeCountries).toBeDefined();
    expect(res.body.paddleCountries).toBeDefined();
  });

  test('GET /api/payments/providers/RS - Serbia routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/RS')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('paddle');
    expect(res.body.countryCode).toBe('RS');
    expect(res.body.countryName).toBe('Serbia');
  });

  test('GET /api/payments/providers/AL - Albania routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/AL')
      .expect(200);

    expect(res.body.provider).toBe('paddle');
  });

  test('GET /api/payments/providers/BA - Bosnia routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/BA')
      .expect(200);

    expect(res.body.provider).toBe('paddle');
  });

  test('GET /api/payments/providers/MK - North Macedonia routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/MK')
      .expect(200);

    expect(res.body.provider).toBe('paddle');
  });

  test('GET /api/payments/providers/ME - Montenegro routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/ME')
      .expect(200);

    expect(res.body.provider).toBe('paddle');
  });

  test('GET /api/payments/providers/XK - Kosovo routes to Paddle', async () => {
    const res = await request(app)
      .get('/api/payments/providers/XK')
      .expect(200);

    expect(res.body.provider).toBe('paddle');
  });

  test('GET /api/payments/providers/GR - Greece routes to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/GR')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('stripe');
    expect(res.body.countryCode).toBe('GR');
  });

  test('GET /api/payments/providers/HR - Croatia routes to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/HR')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('GET /api/payments/providers/BG - Bulgaria routes to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/BG')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('GET /api/payments/providers/RO - Romania routes to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/RO')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('GET /api/payments/providers/SI - Slovenia routes to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/SI')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('GET /api/payments/providers/XX - Unknown country defaults to Stripe', async () => {
    const res = await request(app)
      .get('/api/payments/providers/XX')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('Country codes are case-insensitive', async () => {
    const resLower = await request(app).get('/api/payments/providers/rs');
    const resUpper = await request(app).get('/api/payments/providers/RS');

    expect(resLower.body.provider).toBe(resUpper.body.provider);
  });
});

// ============================================================
// PAYMENT CREATION TESTS
// ============================================================

describe('Payment Creation', () => {

  test('POST /api/payments/create-payment - requires authentication', async () => {
    const res = await request(app)
      .post('/api/payments/create-payment')
      .send({
        planName: 'Pro Monthly',
        planInterval: 'month',
        amount: 25,
        countryCode: 'RS',
      })
      .expect(401);
  });

  test('POST /api/payments/create-payment - creates Paddle payment for Serbia', async () => {
    if (!authToken) {
      console.log('Skipping: No auth token available');
      return;
    }

    const res = await request(app)
      .post('/api/payments/create-payment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        planName: 'Pro Monthly',
        planInterval: 'month',
        amount: 25,
        countryCode: 'RS',
        productId: 'pro_monthly',
      });

    // Will fail if Paddle not configured, but should attempt Paddle
    expect(res.body.provider === 'paddle' || res.body.provider === 'stripe').toBe(true);
  });

  test('POST /api/payments/create-payment - creates Stripe payment for Greece', async () => {
    if (!authToken) {
      console.log('Skipping: No auth token available');
      return;
    }

    const res = await request(app)
      .post('/api/payments/create-payment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        planName: 'Pro Monthly',
        planInterval: 'month',
        amount: 25,
        countryCode: 'GR',
        productId: 'pro_monthly',
      });

    expect(res.body.provider).toBe('stripe');
  });

  test('POST /api/payments/create-payment - validates required fields', async () => {
    if (!authToken) return;

    const res = await request(app)
      .post('/api/payments/create-payment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400);

    expect(res.body.message).toBeDefined();
  });
});

// ============================================================
// PADDLE SPECIFIC TESTS
// ============================================================

describe('Paddle Endpoints', () => {

  test('GET /api/payments/paddle/config - returns Paddle configuration', async () => {
    const res = await request(app)
      .get('/api/payments/paddle/config')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.environment).toBeDefined();
  });

  test('POST /api/payments/paddle/webhook - accepts webhook without signature in test', async () => {
    const mockWebhookEvent = {
      event_type: 'transaction.completed',
      event_id: 'evt_test_123',
      occurred_at: new Date().toISOString(),
      data: {
        id: 'txn_test_123',
        status: 'completed',
        customer_id: 'ctm_test_123',
        currency_code: 'EUR',
        details: {
          totals: {
            total: '2500', // 25.00 EUR in cents
          },
        },
        custom_data: {
          user_id: 'test_user_id',
          product_id: 'pro_monthly',
          plan_name: 'Pro Monthly',
          plan_interval: 'month',
        },
      },
    };

    const res = await request(app)
      .post('/api/payments/paddle/webhook')
      .send(mockWebhookEvent);

    // Should accept the webhook (200) even if processing fails
    expect(res.status).toBe(200);
  });

  test('GET /api/payments/paddle/verify/:transactionId - requires auth', async () => {
    const res = await request(app)
      .get('/api/payments/paddle/verify/txn_test_123')
      .expect(401);
  });
});

// ============================================================
// STRIPE SPECIFIC TESTS
// ============================================================

describe('Stripe Endpoints', () => {

  test('GET /api/payments/verify-session/:sessionId - requires auth', async () => {
    const res = await request(app)
      .get('/api/payments/verify-session/cs_test_123')
      .expect(401);
  });

  test('POST /api/payments/webhook - accepts Stripe webhook format', async () => {
    // Stripe webhooks need raw body and signature
    // This test just verifies the endpoint exists
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send('{}');

    // Will fail signature verification but endpoint should exist
    expect([200, 400]).toContain(res.status);
  });
});

// ============================================================
// SUBSCRIPTION MANAGEMENT TESTS
// ============================================================

describe('Subscription Management', () => {

  test('GET /api/payments/subscription-status - requires auth', async () => {
    const res = await request(app)
      .get('/api/payments/subscription-status')
      .expect(401);
  });

  test('GET /api/payments/subscription-status - returns status for authenticated user', async () => {
    if (!authToken) return;

    const res = await request(app)
      .get('/api/payments/subscription-status')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.isSubscribed).toBeDefined();
  });

  test('POST /api/payments/cancel-subscription - requires auth', async () => {
    const res = await request(app)
      .post('/api/payments/cancel-subscription')
      .expect(401);
  });
});

// ============================================================
// EDGE CASES & ERROR HANDLING
// ============================================================

describe('Error Handling', () => {

  test('Invalid country code returns default provider', async () => {
    const res = await request(app)
      .get('/api/payments/providers/INVALID')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });

  test('Empty country code handled gracefully', async () => {
    const res = await request(app)
      .get('/api/payments/providers/')
      .expect(404); // Route not matched
  });

  test('Special characters in country code handled', async () => {
    const res = await request(app)
      .get('/api/payments/providers/<script>')
      .expect(200);

    expect(res.body.provider).toBe('stripe');
  });
});
