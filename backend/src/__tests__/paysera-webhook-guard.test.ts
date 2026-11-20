/**
 * The Paysera callback (POST /api/payments/paysera/webhook):
 *   - answers 503 while online payment is off (PAYMENTS_ENABLED unset), and
 *   - never turns a payment into a new Product priced at whatever was paid.
 *
 * The callback is signed here exactly as Paysera signs it (base64url data +
 * md5(data + password), HMAC-signed metadata in paytext), so the handler gets
 * as far as looking the product up.
 */
import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { paymentLogger } from '../utils/logger';
import { createMockUser } from './setup';

const PASSWORD = 'test-sign-password';
process.env.PAYSERA_PROJECT_ID = '123';
process.env.PAYSERA_SIGN_PASSWORD = PASSWORD;

// Required after the env vars: the Paysera service reads them when first loaded.
const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../routes/paymentRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

const signedMeta = (meta: Record<string, string>): string => {
  const payload = Buffer.from(JSON.stringify(meta)).toString('base64');
  const signature = crypto.createHmac('sha256', PASSWORD).update(payload).digest('hex');
  return `BalkanEstate subscription | META:${payload}.${signature}`;
};

const signedCallback = (params: Record<string, string>) => {
  const data = Buffer.from(new URLSearchParams(params).toString())
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const ss1 = crypto.createHash('md5').update(data + PASSWORD).digest('hex');
  return { data, ss1 };
};

const callbackFor = (userId: string, productId: string) =>
  signedCallback({
    projectid: '123',
    orderid: 'BE_TEST_1',
    status: '1',
    payamount: '1',
    paycurrency: 'EUR',
    requestid: 'req-1',
    paytext: signedMeta({ userId, productId, planName: 'Made Up', planInterval: 'month' }),
  });

afterEach(() => {
  delete process.env.PAYMENTS_ENABLED;
  jest.restoreAllMocks();
});

it('answers 503 PAYMENT_NOT_CONFIGURED while online payment is off', async () => {
  const user = await User.create(createMockUser({ email: `paysera-off-${Date.now()}@example.com` }));
  const res = await request(app)
    .post('/api/payments/paysera/webhook')
    .query(callbackFor(String(user._id), 'pro_monthly'));

  expect(res.status).toBe(503);
  expect(res.body.code).toBe('PAYMENT_NOT_CONFIGURED');
  expect(await Subscription.countDocuments({})).toBe(0);
});

it('does not create a product for an unknown plan, and logs it for review', async () => {
  process.env.PAYMENTS_ENABLED = 'true';
  const logged = jest.spyOn(paymentLogger, 'error').mockImplementation(() => undefined);
  const user = await User.create(createMockUser({ email: `paysera-on-${Date.now()}@example.com` }));

  const res = await request(app)
    .post('/api/payments/paysera/webhook')
    .query(callbackFor(String(user._id), 'made_up_plan'));

  expect(res.status).toBe(200);
  expect(res.text).toBe('OK');
  expect(await Product.countDocuments({})).toBe(0);
  expect(await Subscription.countDocuments({})).toBe(0);
  expect(logged).toHaveBeenCalledWith(expect.stringContaining('unknown product "made_up_plan"'));
});
