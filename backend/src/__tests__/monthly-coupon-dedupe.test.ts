/**
 * Monthly coupon refresh — one email per agency / Pro user per month.
 *
 * The refresh used to be scheduled twice (jobs/monthlyCouponJob.ts and
 * cron/index.ts), so every recipient got the coupon email twice. These tests
 * run the refresh twice and check each recipient is emailed once.
 */
process.env.SKIP_TEST_DB = 'true';

const claims = new Set<string>();
const findOneAndUpdateMock = jest.fn();

jest.mock('../models/MonthlyCouponDelivery', () => ({
  __esModule: true,
  default: {
    create: jest.fn(async ({ period, kind, key }: { period: string; kind: string; key: string }) => {
      const id = `${period}|${kind}|${key}`;
      if (claims.has(id)) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
      claims.add(id);
    }),
    deleteOne: jest.fn(async ({ period, kind, key }: { period: string; kind: string; key: string }) => {
      claims.delete(`${period}|${kind}|${key}`);
    }),
  },
}));

const lean = <T>(value: T) => ({ lean: async () => value });

const agencyDoc = { _id: 'agency-1', name: 'Erikson', promotionCoupons: {}, save: jest.fn(async () => undefined) };
const users: Record<string, { _id: string; email: string; name: string; agencyId?: string }> = {
  owner: { _id: 'owner', email: 'info@erikson.test', name: 'Owner', agencyId: 'agency-1' },
  pro: { _id: 'pro', email: 'pro@user.test', name: 'Pro' },
};

jest.mock('../models/Product', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(({ productId }: { productId: string }) => lean({
      productId, name: productId, promotionCoupons: 5, highlightedCoupons: 2, premiumCoupons: 2, featuredCoupons: 1,
    })),
  },
}));
jest.mock('../models/Subscription', () => ({
  __esModule: true,
  default: {
    find: jest.fn(({ productId }: { productId: { $in: string[] } }) => lean(
      productId.$in.includes('agency_yearly')
        // Two active subscription docs for the same owner must still mean one email
        ? [{ userId: 'owner', productId: 'agency_yearly' }, { userId: 'owner', productId: 'seller_enterprise_yearly' }]
        : [{ userId: 'pro', productId: 'pro_monthly' }, { userId: 'pro', productId: 'pro_yearly' }],
    )),
  },
}));
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(async (id: string) => users[id] ?? null),
    findByIdAndUpdate: (...args: unknown[]) => findOneAndUpdateMock(...args),
    find: jest.fn(async () => []),
  },
}));
jest.mock('../models/Agency', () => ({
  __esModule: true,
  default: { findById: jest.fn(async () => agencyDoc) },
}));
jest.mock('../services/subscriptionPaymentService', () => ({
  generateProSubscriptionCoupons: jest.fn(async () => []),
}));
jest.mock('../services/emailService', () => ({
  sendMonthlyCouponEmail: jest.fn(async () => undefined),
}));

import { processMonthlyCouponRefresh, couponPeriod } from '../services/monthlyCouponService';
import { sendMonthlyCouponEmail } from '../services/emailService';

const sendMock = sendMonthlyCouponEmail as jest.Mock;

beforeEach(() => {
  claims.clear();
  sendMock.mockClear();
  findOneAndUpdateMock.mockClear();
});

describe('couponPeriod', () => {
  it('uses the UTC calendar month', () => {
    expect(couponPeriod(new Date('2026-11-01T09:00:00Z'))).toBe('2026-11');
    expect(couponPeriod(new Date('2026-01-31T23:59:59Z'))).toBe('2026-01');
  });
});

describe('processMonthlyCouponRefresh', () => {
  it('emails each agency and Pro user once, even when run twice in the same month', async () => {
    await processMonthlyCouponRefresh();
    await processMonthlyCouponRefresh();

    const recipients = sendMock.mock.calls.map(([params]) => params.email).sort();
    expect(recipients).toEqual(['info@erikson.test', 'pro@user.test']);
    expect(findOneAndUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('lets a re-run retry a recipient whose refresh failed before anything was sent', async () => {
    // Both of the user's subscription docs hit the failure in the first run
    findOneAndUpdateMock.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce(new Error('db down'));
    const first = await processMonthlyCouponRefresh();
    expect(first.errors.some(e => e.includes('db down'))).toBe(true);
    expect(sendMock.mock.calls.map(([p]) => p.email)).not.toContain('pro@user.test');

    sendMock.mockClear();
    await processMonthlyCouponRefresh();
    expect(sendMock.mock.calls.map(([p]) => p.email)).toEqual(['pro@user.test']);
  });
});
