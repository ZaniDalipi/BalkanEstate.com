import { describe, it, expect } from 'vitest';
import { canAddBuilding, extrasNeedPass, planBanner } from './residencePlanView';
import type { ResidenceBilling } from '../types';

const billing = (over: Partial<ResidenceBilling>): ResidenceBilling => ({
  state: 'trial',
  publicNow: true,
  visibleUntil: null,
  daysLeft: 12,
  trialStartedAt: null,
  trialEndsAt: null,
  paidUntil: null,
  includedUntil: null,
  buildings: { used: 2, limit: 5, included: 5, extra: 0 },
  publish: { allowed: true, startsTrial: false },
  premium: false,
  prices: { currency: 'EUR', pass: { listPrice: 149, unitPrice: 149, amount: 149, discountPct: 0 }, extraBuilding: { listPrice: 29, unitPrice: 29, amount: 29, discountPct: 0 } },
  terms: { trialDays: 15, passMonths: 12, includedBuildings: 5 },
  paymentsEnabled: false,
  ...over,
});

describe('residencePlanView', () => {
  it('another building fits until the limit', () => {
    expect(canAddBuilding(billing({}))).toBe(true);
    expect(canAddBuilding(billing({ buildings: { used: 5, limit: 5, included: 5, extra: 0 } }))).toBe(false);
  });

  it('extras need a pass unless a pass or plan covers the residence', () => {
    expect(extrasNeedPass(billing({ state: 'trial' }))).toBe(true);
    expect(extrasNeedPass(billing({ state: 'expired' }))).toBe(true);
    expect(extrasNeedPass(billing({ state: 'active' }))).toBe(false);
    expect(extrasNeedPass(billing({ state: 'included' }))).toBe(false);
  });

  it('warns in the last 5 trial days, and when a published residence is offline', () => {
    expect(planBanner(billing({ daysLeft: 6 }), 'published')).toBeNull();
    expect(planBanner(billing({ daysLeft: 5 }), 'published')).toBe('endingSoon');
    expect(planBanner(billing({ state: 'expired', publicNow: false, daysLeft: null }), 'published')).toBe('offline');
    expect(planBanner(billing({ state: 'expired', publicNow: false, daysLeft: null }), 'draft')).toBeNull();
    expect(planBanner(billing({ state: 'active', daysLeft: 3 }), 'published')).toBeNull();
  });
});
