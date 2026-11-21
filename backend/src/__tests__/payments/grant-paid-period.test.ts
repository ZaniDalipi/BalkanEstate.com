/**
 * grantPaidPeriod: the one place a payment becomes access. Runs for real on a
 * replica set, transaction included.
 */
process.env.SKIP_TEST_DB = 'true';

import Product from '../../models/Product';
import User from '../../models/User';
import Subscription from '../../models/Subscription';
import PaymentRecord from '../../models/PaymentRecord';
import SubscriptionEvent from '../../models/SubscriptionEvent';
import { grantPaidPeriod, GrantError } from '../../services/subscriptions/grantPaidPeriod';
import { createMockUser } from '../setup';
import { useReplSetDatabase } from './replSetDb';

useReplSetDatabase([Product, User, Subscription, PaymentRecord, SubscriptionEvent]);

const at = (iso: string) => new Date(`${iso}T10:00:00.000Z`);
const day = (d: Date) => d.toISOString().slice(0, 10);
let seq = 0;

const seedPlans = () =>
  Product.insertMany([
    { productId: 'pro_monthly', name: 'Pro Monthly', tier: 'pro', price: 25, billingPeriod: 'monthly', listingsLimit: 20, isActive: true },
    { productId: 'pro_yearly', name: 'Pro Yearly', tier: 'pro', price: 200, billingPeriod: 'yearly', listingsLimit: 250, isActive: true },
    { productId: 'agency_yearly', name: 'Enterprise', tier: 'agency', price: 1000, billingPeriod: 'yearly', listingsLimit: 750, isActive: true },
    { productId: 'featured_agency_28days', name: 'Featured', tier: 'agency', price: 24.99, billingPeriod: 'monthly', isActive: true },
  ]);

const seller = () =>
  User.create(createMockUser({ email: `grant-${Date.now()}-${++seq}@example.com`, role: 'private_seller' }));

const grant = (userId: unknown, overrides: Record<string, unknown> = {}) =>
  grantPaidPeriod({
    userId: String(userId),
    productId: 'pro_monthly',
    amount: 25,
    reference: `BE-TEST-${++seq}`,
    method: 'bank_transfer',
    now: at('2026-03-10'),
    ...overrides,
  });

beforeEach(seedPlans);

describe('a first payment', () => {
  it('starts the plan, records the payment under its reference, and sets the user from the product', async () => {
    const user = await seller();
    const result = await grant(user._id, { reference: 'BE-AAAA-0001' });

    expect(result.alreadyGranted).toBe(false);
    expect(result.isNew).toBe(true);
    expect(day(result.expirationDate)).toBe('2026-04-10');
    expect(result.subscription.autoRenewing).toBe(false);

    const record = await PaymentRecord.findOne({ storeTransactionId: 'BE-AAAA-0001' });
    expect(record?.amount).toBe(25);
    expect(record?.metadata?.method).toBe('bank_transfer');

    const after = await User.findById(user._id);
    expect(after?.isSubscribed).toBe(true);
    expect(after?.subscriptionPlan).toBe('pro_monthly');
    expect(after?.subscription?.tier).toBe('pro');
    expect(after?.subscription?.listingsLimit).toBe(20);
    expect(String(after?.activeSubscriptionId)).toBe(String(result.subscription._id));
  });

  it('gives an Enterprise plan the agency-owner tier from Product.tier', async () => {
    const user = await seller();
    await grant(user._id, { productId: 'agency_yearly', amount: 1000 });
    expect((await User.findById(user._id))?.subscription?.tier).toBe('agency_owner');
  });
});

describe('the same payment twice', () => {
  it('grants once: the second call changes nothing', async () => {
    const user = await seller();
    const first = await grant(user._id, { reference: 'BE-AAAA-0002' });
    const second = await grant(user._id, { reference: 'BE-AAAA-0002', now: at('2026-03-20') });

    expect(second.alreadyGranted).toBe(true);
    expect(day(second.expirationDate)).toBe(day(first.expirationDate));
    expect(await PaymentRecord.countDocuments({ storeTransactionId: 'BE-AAAA-0002' })).toBe(1);
  });

  it('grants once even when both calls arrive together', async () => {
    const user = await seller();
    const results = await Promise.all([
      grant(user._id, { reference: 'BE-AAAA-0003' }),
      grant(user._id, { reference: 'BE-AAAA-0003' }),
    ]);
    expect(results.filter((r) => !r.alreadyGranted)).toHaveLength(1);
    expect(await PaymentRecord.countDocuments({ storeTransactionId: 'BE-AAAA-0003' })).toBe(1);
  });
});

describe('renewing the same plan', () => {
  it('paying 10 days early adds a month to the current end (and used to crash)', async () => {
    const user = await seller();
    await grant(user._id, { now: at('2026-03-10') });
    const renewal = await grant(user._id, { now: at('2026-03-31') });

    expect(renewal.isNew).toBe(false);
    expect(day(renewal.expirationDate)).toBe('2026-05-10');
    expect(await Subscription.countDocuments({ userId: user._id })).toBe(1);
    expect(await PaymentRecord.countDocuments({ userId: user._id })).toBe(2);
    expect(day((await User.findById(user._id))!.subscriptionExpiresAt!)).toBe('2026-05-10');
  });

  it('paying during the grace period counts from the original end', async () => {
    const user = await seller();
    const first = await grant(user._id, { now: at('2026-03-10') });
    await Subscription.updateOne(
      { _id: first.subscription._id },
      { $set: { status: 'grace', gracePeriodEndDate: at('2026-04-17') } }
    );

    const renewal = await grant(user._id, { now: at('2026-04-14') });
    expect(day(renewal.expirationDate)).toBe('2026-05-10');
    expect((await Subscription.findById(first.subscription._id))?.status).toBe('active');
  });

  it('a plan that ran out long ago starts a new period from today', async () => {
    const user = await seller();
    await grant(user._id, { now: at('2025-01-10') });
    const later = await grant(user._id, { now: at('2026-03-10') });
    expect(later.isNew).toBe(true);
    expect(day(later.expirationDate)).toBe('2026-04-10');
  });
});

describe('switching plans', () => {
  it('ends the old web plan and adds the unused value as days', async () => {
    const user = await seller();
    const monthly = await grant(user._id, { now: at('2026-03-10') }); // ends 2026-04-10
    const yearly = await grant(user._id, { productId: 'pro_yearly', amount: 200, now: at('2026-03-26') });

    // 15 days of €25/month ≈ €12.50 ≈ 22 days of €200/year.
    expect(yearly.creditedDays).toBe(22);
    expect(day(yearly.expirationDate)).toBe('2027-04-17');
    const old = await Subscription.findById(monthly.subscription._id);
    expect(old?.status).toBe('canceled');
    expect(day(old!.expirationDate)).toBe('2026-03-26');
    expect((await User.findById(user._id))?.subscriptionPlan).toBe('pro_yearly');
  });
});

describe('refusals and rollback', () => {
  it('refuses a product that is not a plan, writing nothing', async () => {
    const user = await seller();
    await expect(grant(user._id, { productId: 'featured_agency_28days', amount: 24.99 }))
      .rejects.toMatchObject({ code: 'PLAN_NOT_GRANTABLE' });
    await expect(grant(user._id, { productId: 'nope' })).rejects.toBeInstanceOf(GrantError);
    expect(await Subscription.countDocuments({})).toBe(0);
    expect(await PaymentRecord.countDocuments({})).toBe(0);
  });

  it('rolls everything back when a write in the same transaction fails', async () => {
    const user = await seller();
    await expect(
      grant(user._id, {
        alsoInTransaction: async () => {
          throw new Error('order already handled');
        },
      })
    ).rejects.toThrow('order already handled');

    expect(await Subscription.countDocuments({})).toBe(0);
    expect(await PaymentRecord.countDocuments({})).toBe(0);
    expect((await User.findById(user._id))?.isSubscribed).toBeFalsy();
  });
});
