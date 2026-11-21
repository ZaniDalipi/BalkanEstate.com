/**
 * Payment orders end to end, on a replica set so marking paid really grants
 * the plan in one transaction: a customer requests a plan, the team marks it
 * paid (or cancels it), records a payment, or gives a plan for free.
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
import PaymentOrder from '../../models/PaymentOrder';
import { notifyAdmins } from '../../services/adminNotificationService';
import { sendPaymentInstructionsEmail } from '../../services/payments/paymentOrderEmails';
import { ORDER_REFERENCE_PATTERN } from '../../utils/orderReference';
import { addBillingPeriod } from '../../utils/billingPeriod';
import { createMockUser } from '../setup';
import { tokenFor } from '../developments/helpers/explorerHarness';
import { useReplSetDatabase } from './replSetDb';

jest.mock('../../services/adminNotificationService', () => ({
  ...jest.requireActual('../../services/adminNotificationService'),
  notifyAdmins: jest.fn(),
}));
jest.mock('../../services/payments/paymentOrderEmails', () => {
  const actual = jest.requireActual('../../services/payments/paymentOrderEmails');
  return { ...actual, sendPaymentInstructionsEmail: jest.fn(actual.sendPaymentInstructionsEmail) };
});

useReplSetDatabase([Product, User, Subscription, PaymentRecord, SubscriptionEvent, DiscountCode, PaymentOrder]);

const app = express();
app.use(express.json());
/* eslint-disable @typescript-eslint/no-var-requires */
app.use('/api/payment-orders', require('../../routes/paymentOrderRoutes').default);
app.use('/api/admin', require('../../routes/adminRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

let seq = 0;
const makeUser = (overrides: Record<string, unknown> = {}) =>
  User.create(createMockUser({ email: `orders-${Date.now()}-${++seq}@example.com`, role: 'private_seller', ...overrides }));
const as = (user: { _id: unknown }) => ({ Authorization: `Bearer ${tokenFor(user._id)}` });

const requestPlan = (user: { _id: unknown }, body: Record<string, unknown>) =>
  request(app).post('/api/payment-orders').set(as(user)).send(body);
const markPaid = (admin: { _id: unknown }, reference: string, body: Record<string, unknown>) =>
  request(app).post(`/api/admin/payment-orders/${reference}/mark-paid`).set(as(admin)).send(body);

const makeCode = (overrides: Record<string, unknown> = {}) =>
  DiscountCode.create({
    code: 'SPRING20',
    discountType: 'percentage',
    discountValue: 20,
    validFrom: new Date(Date.now() - 60_000),
    validUntil: new Date(Date.now() + 86_400_000),
    usageLimit: 5,
    createdBy: new mongoose.Types.ObjectId(),
    ...overrides,
  });

beforeEach(async () => {
  (notifyAdmins as jest.Mock).mockClear();
  (sendPaymentInstructionsEmail as jest.Mock).mockClear();
  await Product.insertMany([
    { productId: 'pro_monthly', name: 'Pro Monthly', tier: 'pro', price: 25, billingPeriod: 'monthly', listingsLimit: 20, isActive: true },
    { productId: 'pro_yearly', name: 'Pro Yearly', tier: 'pro', price: 200, billingPeriod: 'yearly', listingsLimit: 250, isActive: true },
    { productId: 'featured_agency_28days', name: 'Featured', tier: 'agency', price: 24.99, billingPeriod: 'monthly', isActive: true },
  ]);
});

describe('a customer requesting a plan', () => {
  it('gets a reference, the server price and how to pay; the team is told and the customer emailed', async () => {
    const user = await makeUser();
    const res = await requestPlan(user, { productId: 'pro_monthly', amountCents: 1 });

    expect(res.status).toBe(201);
    expect(res.body.existing).toBe(false);
    expect(res.body.order.reference).toMatch(ORDER_REFERENCE_PATTERN);
    expect(res.body.order).toMatchObject({ status: 'requested', amountCents: 2500, productName: 'Pro Monthly' });
    expect(res.body.instructions.contactEmail).toEqual(expect.any(String));
    expect(notifyAdmins).toHaveBeenCalledWith(expect.objectContaining({ kind: 'plan_requested', reference: res.body.order.reference }));
    expect(sendPaymentInstructionsEmail).toHaveBeenCalledTimes(1);
    // Asking for the plan is not having it.
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();
  });

  it('asking twice returns the same open request', async () => {
    const user = await makeUser();
    const first = await requestPlan(user, { productId: 'pro_monthly' });
    const again = await requestPlan(user, { productId: 'pro_monthly' });

    expect(again.status).toBe(200);
    expect(again.body.existing).toBe(true);
    expect(again.body.order.reference).toBe(first.body.order.reference);
    expect(await PaymentOrder.countDocuments({ userId: user._id })).toBe(1);
  });

  it('applies a valid code to the price and reserves one use', async () => {
    const user = await makeUser();
    await makeCode();
    const res = await requestPlan(user, { productId: 'pro_monthly', discountCode: 'spring20' });

    expect(res.body.order).toMatchObject({ listAmountCents: 2500, discountCents: 500, amountCents: 2000, discountCode: 'SPRING20' });
    const code = await DiscountCode.findOne({ code: 'SPRING20' });
    expect(code?.usedCount).toBe(1);
    expect(code?.usedBy.map(String)).toEqual([String(user._id)]);
  });

  it('sends a 100% code to the free activation instead, without spending it', async () => {
    const user = await makeUser();
    await makeCode({ discountValue: 100 });
    const res = await requestPlan(user, { productId: 'pro_monthly', discountCode: 'SPRING20' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CODE_COVERS_PRICE');
    expect((await DiscountCode.findOne({ code: 'SPRING20' }))?.usedCount).toBe(0);
  });

  it('refuses things that are not plans', async () => {
    const user = await makeUser();
    expect((await requestPlan(user, { productId: 'featured_agency_28days' })).body.code).toBe('PLAN_NOT_ELIGIBLE');
    expect((await requestPlan(user, { productId: 'made_up' })).status).toBe(404);
    expect((await requestPlan(user, {})).body.code).toBe('PLAN_REQUIRED');
    expect(await PaymentOrder.countDocuments({})).toBe(0);
  });

  it('lists only my own requests', async () => {
    const me = await makeUser();
    const someone = await makeUser();
    await requestPlan(me, { productId: 'pro_monthly' });
    await requestPlan(someone, { productId: 'pro_yearly' });

    const res = await request(app).get('/api/payment-orders/mine').set(as(me));
    expect(res.status).toBe(200);
    expect(res.body.orders.map((o: { productId: string }) => o.productId)).toEqual(['pro_monthly']);
  });
});

describe('the team marking an order paid', () => {
  it('grants the plan with a payment record under the reference; doing it twice changes nothing', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly' })).body.order;

    const res = await markPaid(admin, reference, { amount: 25, method: 'bank_transfer', note: 'Transfer 2026-05-02' });
    expect(res.status).toBe(200);
    expect(res.body.alreadyPaid).toBe(false);
    expect(res.body.order).toMatchObject({ status: 'paid', method: 'bank_transfer', paidAmountCents: 2500 });

    const after = await User.findById(user._id);
    expect(after?.isSubscribed).toBe(true);
    expect(after?.subscriptionPlan).toBe('pro_monthly');
    const record = await PaymentRecord.findOne({ storeTransactionId: reference });
    expect(record?.amount).toBe(25);
    expect(record?.metadata?.method).toBe('bank_transfer');

    const again = await markPaid(admin, reference, { amount: 25, method: 'bank_transfer' });
    expect(again.body.alreadyPaid).toBe(true);
    expect(await PaymentRecord.countDocuments({ storeTransactionId: reference })).toBe(1);
  });

  it('is admin-only', async () => {
    const user = await makeUser();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly' })).body.order;
    const res = await markPaid(user, reference, { amount: 25, method: 'bank_transfer' });

    expect(res.status).toBe(403);
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();
  });

  it('asks before accepting a different amount, then records what was received', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly' })).body.order;

    const refused = await markPaid(admin, reference, { amount: 20, method: 'cash' });
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ code: 'AMOUNT_MISMATCH', amountDueCents: 2500, paidAmountCents: 2000, field: 'amount' });
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();

    const accepted = await markPaid(admin, reference, { amount: '20,00', method: 'cash', acceptDifferentAmount: true });
    expect(accepted.status).toBe(200);
    expect(accepted.body.order.paidAmountCents).toBe(2000);
  });

  it('says which field is wrong', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly' })).body.order;

    expect((await markPaid(admin, reference, { amount: 25, method: 'crypto' })).body).toMatchObject({ code: 'INVALID_METHOD', field: 'method' });
    expect((await markPaid(admin, reference, { amount: -1, method: 'cash' })).body).toMatchObject({ code: 'INVALID_AMOUNT', field: 'amount' });
    const nextWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
    expect((await markPaid(admin, reference, { amount: 25, method: 'cash', paidAt: nextWeek })).body).toMatchObject({ code: 'INVALID_DATE', field: 'paidAt' });
    expect((await markPaid(admin, 'BE-ZZZZ-ZZZZ', { amount: 25, method: 'cash' })).status).toBe(404);
  });

  it('a second paid order for the same plan adds its period to the end of the first', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const first = (await requestPlan(user, { productId: 'pro_monthly' })).body.order.reference;
    await markPaid(admin, first, { amount: 25, method: 'bank_transfer' });
    const second = (await requestPlan(user, { productId: 'pro_monthly' })).body.order.reference;
    await markPaid(admin, second, { amount: 25, method: 'bank_transfer' });

    const now = new Date();
    const expected = addBillingPeriod(addBillingPeriod(now, 'monthly'), 'monthly');
    const expiry = (await User.findById(user._id))!.subscriptionExpiresAt!;
    expect(Math.abs(expiry.getTime() - expected.getTime())).toBeLessThan(60_000);
    expect(await Subscription.countDocuments({ userId: user._id })).toBe(1);
  });
});

describe('cancelling', () => {
  it('cancels an open order, gives the code use back, and it can no longer be paid', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    await makeCode();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly', discountCode: 'SPRING20' })).body.order;

    const res = await request(app).post(`/api/admin/payment-orders/${reference}/cancel`).set(as(admin)).send({ reason: 'Changed mind' });
    expect(res.body.order).toMatchObject({ status: 'cancelled', cancelReason: 'Changed mind' });
    expect((await DiscountCode.findOne({ code: 'SPRING20' }))?.usedCount).toBe(0);

    const pay = await markPaid(admin, reference, { amount: 20, method: 'cash' });
    expect(pay.status).toBe(409);
    expect(pay.body.code).toBe('ORDER_CANCELLED');
  });

  it('will not cancel a paid order', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const { reference } = (await requestPlan(user, { productId: 'pro_monthly' })).body.order;
    await markPaid(admin, reference, { amount: 25, method: 'cash' });

    const res = await request(app).post(`/api/admin/payment-orders/${reference}/cancel`).set(as(admin)).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ORDER_ALREADY_PAID');
  });
});

describe('recording a payment and free grants', () => {
  it('records a payment taken in person, settling the open request for that plan', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const open = (await requestPlan(user, { productId: 'pro_yearly' })).body.order.reference;

    const res = await request(app).post('/api/admin/payment-orders/record-payment').set(as(admin))
      .send({ userId: String(user._id), productId: 'pro_yearly', amount: 200, method: 'card_terminal' });
    expect(res.status).toBe(201);
    expect(res.body.order.reference).toBe(open);
    expect(await PaymentOrder.countDocuments({ userId: user._id })).toBe(1);
    expect((await User.findById(user._id))?.subscriptionPlan).toBe('pro_yearly');
  });

  it('records a payment with no request, as an admin-made order', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const res = await request(app).post('/api/admin/payment-orders/record-payment').set(as(admin))
      .send({ userId: String(user._id), productId: 'pro_monthly', amount: 25, method: 'cash' });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ source: 'admin', status: 'paid' });
  });

  it('a free grant needs a reason, and is recorded at €0 with it', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const body = { userId: String(user._id), productId: 'pro_monthly' };

    const refused = await request(app).post('/api/admin/payment-orders/free-grant').set(as(admin)).send(body);
    expect(refused.body).toMatchObject({ code: 'REASON_REQUIRED', field: 'reason' });

    const res = await request(app).post('/api/admin/payment-orders/free-grant').set(as(admin)).send({ ...body, reason: 'Partner agency, 1 month trial' });
    expect(res.status).toBe(201);
    expect(res.body.order).toMatchObject({ method: 'free_grant', paidAmountCents: 0, note: 'Partner agency, 1 month trial' });
    const record = await PaymentRecord.findOne({ storeTransactionId: res.body.order.reference });
    expect(record?.amount).toBe(0);
    expect(record?.metadata).toMatchObject({ method: 'free_grant', note: 'Partner agency, 1 month trial' });
  });
});

describe('the admin list and the old actions', () => {
  it('filters by status and finds an order by its reference', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    const a = (await requestPlan(user, { productId: 'pro_monthly' })).body.order.reference;
    const b = (await requestPlan(user, { productId: 'pro_yearly' })).body.order.reference;
    await markPaid(admin, a, { amount: 25, method: 'cash' });

    const open = await request(app).get('/api/admin/payment-orders?status=requested').set(as(admin));
    expect(open.body.orders.map((o: { reference: string }) => o.reference)).toEqual([b]);
    const found = await request(app).get(`/api/admin/payment-orders?q=${a.toLowerCase()}`).set(as(admin));
    expect(found.body.orders.map((o: { reference: string }) => o.reference)).toEqual([a]);
  });

  it('offers only real plans to grant', async () => {
    const admin = await makeUser({ role: 'admin' });
    const res = await request(app).get('/api/admin/payment-orders/plans').set(as(admin));
    expect(res.body.plans.map((p: { productId: string }) => p.productId).sort()).toEqual(['pro_monthly', 'pro_yearly']);
  });

  it('the old free-text activation is gone; editing a plan in place points to Record payment', async () => {
    const admin = await makeUser({ role: 'admin' });
    const user = await makeUser();
    expect((await request(app).post('/api/admin/subscriptions/activate').set(as(admin))
      .send({ userId: String(user._id), planName: 'Pro Yearly', durationDays: 365 })).status).toBe(404);
    const edit = await request(app).patch(`/api/admin/subscriptions/manage/${user._id}`).set(as(admin))
      .send({ isSubscribed: true, subscriptionPlan: 'pro_yearly', subscriptionExpiresAt: new Date().toISOString() });
    expect(edit.status).toBe(400);
    expect(edit.body.code).toBe('USE_RECORD_PAYMENT');
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();
  });
});
