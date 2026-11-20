/**
 * Payment System Tests
 *
 * Provider routing, authentication and validation of the payment routes.
 * Run with: npx jest -i src/__tests__/payments.test.ts
 *
 * Only the payment router is mounted, on the shared test database
 * (setup.ts). Importing the whole server would connect to a real database,
 * start the cron jobs and open a port. Every country is served by Paysera
 * (services/paymentProviderFactory.ts).
 */

import express from 'express';
import request from 'supertest';
import User from '../models/User';
import { createMockUser } from './setup';
import { tokenFor } from './developments/helpers/explorerHarness';

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../routes/paymentRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

let seq = 0;

/** A signed-in user from Serbia; returns a bearer token. */
const signedInToken = async (): Promise<string> => {
  const user = await User.create(
    createMockUser({ email: `payments-${Date.now()}-${++seq}@example.com`, country: 'RS' })
  );
  return tokenFor(user._id);
};

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

  test('GET /api/payments/providers/RS - Serbia routes to paysera', async () => {
    const res = await request(app)
      .get('/api/payments/providers/RS')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('paysera');
    expect(res.body.countryCode).toBe('RS');
    expect(res.body.countryName).toBe('Serbia');
  });

  test('GET /api/payments/providers/GR - Greece routes to paysera', async () => {
    const res = await request(app)
      .get('/api/payments/providers/GR')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.provider).toBe('paysera');
    expect(res.body.countryCode).toBe('GR');
  });

  const allCountries = ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'];

  test.each(allCountries)('GET /api/payments/providers/%s routes to paysera', async (country) => {
    const res = await request(app)
      .get(`/api/payments/providers/${country}`)
      .expect(200);

    expect(res.body.provider).toBe('paysera');
  });

  test('Country codes are case-insensitive', async () => {
    const resLower = await request(app).get('/api/payments/providers/rs');
    const resUpper = await request(app).get('/api/payments/providers/RS');

    expect(resLower.status).toBe(200);
    expect(resLower.body.provider).toBe(resUpper.body.provider);
    expect(resLower.body.countryCode).toBe('RS');
  });
});

// ============================================================
// PAYMENT CREATION TESTS
// ============================================================

describe('Payment Creation', () => {

  test('POST /api/payments/create-payment - requires authentication', async () => {
    await request(app)
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
    const token = await signedInToken();

    const res = await request(app)
      .post('/api/payments/create-payment')
      .set('Authorization', `Bearer ${token}`)
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
    await request(app)
      .get('/api/payments/subscription-status')
      .expect(401);
  });

  test('GET /api/payments/subscription-status - returns status for authenticated user', async () => {
    const token = await signedInToken();

    const res = await request(app)
      .get('/api/payments/subscription-status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.isSubscribed).toBeDefined();
  });

  test('POST /api/payments/cancel-subscription - requires auth', async () => {
    await request(app)
      .post('/api/payments/cancel-subscription')
      .expect(401);
  });
});

// ============================================================
// EDGE CASES & ERROR HANDLING
// ============================================================

describe('Error Handling', () => {

  test('Unknown country code returns the default provider', async () => {
    const res = await request(app)
      .get('/api/payments/providers/ZZ')
      .expect(200);

    expect(res.body.provider).toBe('paysera');
    expect(res.body.countryName).toBe('Unknown');
  });

  test('Malformed country code is rejected by validation', async () => {
    const res = await request(app)
      .get('/api/payments/providers/INVALID')
      .expect(400);

    expect(res.body.message).toBe('Validation failed');
  });

  test('Empty country code handled gracefully', async () => {
    await request(app)
      .get('/api/payments/providers/')
      .expect(404); // Route not matched
  });

  test('Special characters in country code are rejected', async () => {
    const res = await request(app)
      .get('/api/payments/providers/<script>')
      .expect(400);

    expect(res.body.provider).toBeUndefined();
  });
});
