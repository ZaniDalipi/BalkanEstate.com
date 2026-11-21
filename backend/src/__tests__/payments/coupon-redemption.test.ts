/**
 * A 100%-off code redeemed for real (no mocks), through the route, on a
 * replica set: the plan is granted by grantPaidPeriod, and renewing the same
 * plan with a second code no longer crashes on the payment-record index.
 */
process.env.SKIP_TEST_DB = 'true';

import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import Product from '../../models/Product';
import User from '../../models/User';
import Subscription from '../../models/Subscription';
import PaymentRecord from '../../models/PaymentRecord';
import SubscriptionEvent from '../../models/SubscriptionEvent';
import DiscountCode from '../../models/DiscountCode';
import { createMockUser } from '../setup';
import { tokenFor } from '../developments/helpers/explorerHarness';
import { useReplSetDatabase } from './replSetDb';

useReplSetDatabase([Product, User, Subscription, PaymentRecord, SubscriptionEvent, DiscountCode]);

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payments', require('../../routes/paymentRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

const DAY = 86_400_000;
const code = (codeText: string) =>
  DiscountCode.create({
    code: codeText,
    discountType: 'percentage',
    discountValue: 100,
    validFrom: new Date(Date.now() - DAY),
    validUntil: new Date(Date.now() + DAY),
    usageLimit: 5,
    createdBy: new mongoose.Types.ObjectId(),
  });

const redeem = (userId: unknown, discountCode: string) =>
  request(app)
    .post('/api/payments/apply-free-subscription')
    .set({ Authorization: `Bearer ${tokenFor(userId)}` })
    .send({ productId: 'pro_monthly', discountCode });

beforeEach(() =>
  Product.create({ productId: 'pro_monthly', name: 'Pro Monthly', tier: 'pro', price: 25, billingPeriod: 'monthly', listingsLimit: 20, isActive: true })
);

it('grants the plan at €0 with a payment record under a CP- reference', async () => {
  const user = await User.create(createMockUser({ email: `coupon-${Date.now()}@example.com`, role: 'private_seller' }));
  await code('FREEPRO');

  const res = await redeem(user._id, 'FREEPRO');
  expect(res.status).toBe(200);

  const after = await User.findById(user._id);
  expect(after?.isSubscribed).toBe(true);
  expect(after?.subscription?.tier).toBe('pro');
  const record = await PaymentRecord.findOne({ userId: user._id });
  expect(record?.amount).toBe(0);
  expect(record?.storeTransactionId).toMatch(/^CP-/);
  expect(record?.metadata).toMatchObject({ method: 'coupon', discountCode: 'FREEPRO', originalAmount: 25 });
});

it('renewing the same plan with a second code during the grace period extends it (this used to crash)', async () => {
  const user = await User.create(createMockUser({ email: `coupon-renew-${Date.now()}@example.com`, role: 'private_seller' }));
  await code('FIRST');
  await code('SECOND');
  expect((await redeem(user._id, 'FIRST')).status).toBe(200);

  // The plan ended two days ago and is in its grace period.
  const originalEnd = new Date(Date.now() - 2 * DAY);
  await Subscription.updateOne({ userId: user._id }, { $set: { status: 'grace', expirationDate: originalEnd, gracePeriodEndDate: new Date(originalEnd.getTime() + 7 * DAY) } });

  const res = await redeem(user._id, 'SECOND');
  expect(res.status).toBe(200);

  const subs = await Subscription.find({ userId: user._id });
  expect(subs).toHaveLength(1);
  expect(subs[0].status).toBe('active');
  // Counted from the original end, not from today.
  const expectedEnd = new Date(originalEnd);
  expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 1);
  expect(Math.abs(subs[0].expirationDate.getTime() - expectedEnd.getTime())).toBeLessThan(3 * DAY);
  expect(subs[0].expirationDate.getTime()).toBeLessThan(Date.now() + 30 * DAY);
  expect(await PaymentRecord.countDocuments({ userId: user._id })).toBe(2);
});
