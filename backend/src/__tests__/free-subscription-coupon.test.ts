/**
 * POST /api/payments/apply-free-subscription — a 100%-off code turns into a
 * plan only for a real, coupon-grantable product, only when the code is valid
 * for this person and plan, and only once per use.
 *
 * Granting itself (grantPaidPeriod) runs in a Mongo transaction,
 * which the standalone test database can't do, so it is mocked here; these
 * tests cover everything the route decides before and after it.
 */
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import DiscountCode from '../models/DiscountCode';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import { grantPaidPeriod } from '../services/subscriptions/grantPaidPeriod';
import { makeUser, tokenFor } from './developments/helpers/explorerHarness';

jest.mock('../services/subscriptions/grantPaidPeriod', () => ({
  ...jest.requireActual('../services/subscriptions/grantPaidPeriod'),
  grantPaidPeriod: jest.fn(),
}));

const grant = grantPaidPeriod as jest.MockedFunction<typeof grantPaidPeriod>;

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../routes/paymentRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

const ENDPOINT = '/api/payments/apply-free-subscription';
const auth = (userId: unknown) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

const makePlan = (overrides: Record<string, unknown> = {}) =>
  Product.create({
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    tier: 'pro',
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly',
    isActive: true,
    ...overrides,
  });

const makeCode = (overrides: Record<string, unknown> = {}) =>
  DiscountCode.create({
    code: 'FREEPRO',
    discountType: 'percentage',
    discountValue: 100,
    validFrom: new Date(Date.now() - 60_000),
    validUntil: new Date(Date.now() + 86_400_000),
    usageLimit: 5,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

const redeem = (userId: unknown, body: Record<string, unknown>) =>
  request(app).post(ENDPOINT).set(auth(userId)).send(body);

beforeEach(() => {
  grant.mockReset();
  grant.mockImplementation(async () => {
    const expirationDate = new Date(Date.now() + 30 * 86_400_000);
    return {
      subscription: { _id: new mongoose.Types.ObjectId(), expirationDate, status: 'active' },
      paymentRecord: { _id: new mongoose.Types.ObjectId() },
      alreadyGranted: false,
      isNew: true,
      expirationDate,
      creditedDays: 0,
    } as unknown as Awaited<ReturnType<typeof grantPaidPeriod>>;
  });
});

describe('unknown or ineligible plans', () => {
  it('refuses a made-up plan id and creates no product', async () => {
    await makeCode();
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'x_enterprise', planName: 'Fake Plan', discountCode: 'FREEPRO' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PLAN_NOT_FOUND');
    expect(await Product.countDocuments({ productId: 'x_enterprise' })).toBe(0);
    expect(grant).not.toHaveBeenCalled();
    expect((await DiscountCode.findOne({ code: 'FREEPRO' }))?.usedCount).toBe(0);
  });

  it('refuses a request without a plan', async () => {
    await makeCode();
    const user = await makeUser();
    const res = await redeem(user._id, { discountCode: 'FREEPRO' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PLAN_REQUIRED');
    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses an item that is not a subscription plan (agency featuring)', async () => {
    await makePlan({ productId: 'featured_agency_28days', name: 'Featured Agency', tier: 'agency', price: 24.99 });
    await makeCode();
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'featured_agency_28days', discountCode: 'FREEPRO' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PLAN_NOT_ELIGIBLE');
    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses an inactive plan', async () => {
    await makePlan({ isActive: false });
    await makeCode();
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });
    expect(res.status).toBe(404);
    expect(grant).not.toHaveBeenCalled();
  });
});

describe('code checks', () => {
  it('refuses a code made for a different plan', async () => {
    await makePlan();
    await makeCode({ applicablePlans: ['buyer_monthly'] });
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_INVALID');
    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses a code that is not valid yet', async () => {
    await makePlan();
    await makeCode({ validFrom: new Date(Date.now() + 86_400_000) });
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_INVALID');
  });

  it('refuses a fixed-amount code that does not cover the price, and says how much is left', async () => {
    await makePlan();
    await makeCode({ discountType: 'fixed', discountValue: 5 });
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_NOT_FREE');
    expect(res.body.remaining).toBe(20);
    expect(grant).not.toHaveBeenCalled();
  });

  it('refuses when the user already has this plan active', async () => {
    await makePlan();
    await makeCode();
    const user = await makeUser();
    await Subscription.create({
      userId: user._id,
      store: 'web',
      productId: 'pro_monthly',
      startDate: new Date(),
      expirationDate: new Date(Date.now() + 86_400_000),
      status: 'active',
      price: 25,
    });
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_SUBSCRIBED');
    expect((await DiscountCode.findOne({ code: 'FREEPRO' }))?.usedCount).toBe(0);
  });
});

describe('redeeming', () => {
  it('grants the plan at €0, records the use against the person, and keeps the response shape', async () => {
    await makePlan();
    await makeCode();
    const user = await makeUser();
    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'freepro' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subscriptionId).toEqual(expect.any(String));
    expect(res.body.subscription.plan).toBe('pro_monthly');
    expect(grant).toHaveBeenCalledWith(
      expect.objectContaining({ productId: 'pro_monthly', amount: 0, method: 'coupon', discountCode: 'FREEPRO', originalAmount: 25 })
    );
    const code = await DiscountCode.findOne({ code: 'FREEPRO' });
    expect(code?.usedCount).toBe(1);
    expect(code?.usedBy.map(String)).toEqual([String(user._id)]);
  });

  it('lets the same person use a code only once', async () => {
    await makePlan();
    await makeCode();
    const user = await makeUser();
    expect((await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' })).status).toBe(200);

    const again = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe('CODE_INVALID');
    expect(grant).toHaveBeenCalledTimes(1);
  });

  it('spends a single-use code once even when five people send it at the same moment', async () => {
    await makePlan();
    await makeCode({ usageLimit: 1 });
    const users = await Promise.all(Array.from({ length: 5 }, () => makeUser()));

    const responses = await Promise.all(
      users.map((u) => redeem(u._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' }))
    );

    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(grant).toHaveBeenCalledTimes(1);
    expect((await DiscountCode.findOne({ code: 'FREEPRO' }))?.usedCount).toBe(1);
  });

  it('gives the use back when granting the plan fails', async () => {
    await makePlan();
    await makeCode({ usageLimit: 1 });
    const user = await makeUser();
    grant.mockRejectedValueOnce(new Error('database unavailable'));

    const res = await redeem(user._id, { productId: 'pro_monthly', discountCode: 'FREEPRO' });

    expect(res.status).toBe(500);
    const code = await DiscountCode.findOne({ code: 'FREEPRO' });
    expect(code?.usedCount).toBe(0);
    expect(code?.usedBy).toHaveLength(0);
  });
});
