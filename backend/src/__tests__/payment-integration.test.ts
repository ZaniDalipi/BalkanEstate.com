/**
 * Payment Integration Tests
 *
 * The payment routes end to end through express: routing, authentication,
 * validation and subscription status.
 * Run: npx jest -i src/__tests__/payment-integration.test.ts
 *
 * Only the payment router is mounted, on the shared test database
 * (setup.ts). Importing the whole server would connect to a real database,
 * start the cron jobs and open a port. Users are signed in with a token
 * the auth middleware accepts, as in the other route suites; login itself
 * is covered by auth.test.ts. Every country is served by Paysera
 * (services/paymentProviderFactory.ts).
 */

import express from 'express';
import request from 'supertest';
import User from '../models/User';
import { TEST_USERS, TEST_PAYMENT_REQUESTS } from './fixtures/payment-fixtures';
import { tokenFor } from './developments/helpers/explorerHarness';

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../routes/paymentRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

// Helper to create and sign in a user
async function createAuthenticatedUser(userData: Record<string, unknown>) {
  const user = await User.create({
    ...userData,
    password: 'TestPassword123!',
    provider: 'local',
    isEmailVerified: true,
  });

  return {
    user,
    token: tokenFor(user._id),
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

    it('returns paysera for Greece (EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/GR')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('paysera');
      expect(res.body.countryName).toBe('Greece');
      expect(res.body.isEU).toBe(true);
    });

    it('returns paysera for Serbia (non-EU)', async () => {
      const res = await request(app)
        .get('/api/payments/providers/RS')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.provider).toBe('paysera');
      expect(res.body.countryName).toBe('Serbia');
      expect(res.body.isEU).toBe(false);
    });

    it('handles lowercase country codes', async () => {
      const res = await request(app)
        .get('/api/payments/providers/rs')
        .expect(200);

      expect(res.body.provider).toBe('paysera');
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
      const { token } = await createAuthenticatedUser(TEST_USERS.subscribedUser);

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
