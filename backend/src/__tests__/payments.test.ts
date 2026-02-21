/**
 * Payment System Tests
 *
 * Test cases for payment integration
 * Run with: npm test -- --testPathPattern=payments
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../server';
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
  country: 'RS', // Serbia
};

const TEST_USER_EU = {
  email: 'testeu@balkanestateai.com',
  password: 'TestPassword123!',
  name: 'Test EU User',
  country: 'GR', // Greece
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
  });

  test('GET /api/payments/providers/RS - Serbia routes to web', async () => {
    const res = await request(app)
      .get('/api/payments/providers/RS')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('web');
    expect(res.body.countryCode).toBe('RS');
    expect(res.body.countryName).toBe('Serbia');
  });

  test('GET /api/payments/providers/GR - Greece routes to web', async () => {
    const res = await request(app)
      .get('/api/payments/providers/GR')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('web');
    expect(res.body.countryCode).toBe('GR');
  });

  const allCountries = ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'];

  test.each(allCountries)('GET /api/payments/providers/%s routes to web', async (country) => {
    const res = await request(app)
      .get(`/api/payments/providers/${country}`)
      .expect(200);

    expect(res.body.provider).toBe('web');
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

    expect(res.body.provider).toBe('web');
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

    expect(res.body.provider).toBe('web');
  });
});
