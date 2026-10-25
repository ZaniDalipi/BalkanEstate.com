/** Residence Pass rules (pure): states, publish/trial decisions, stacking, prices, reminders. */
import {
  addMonths,
  canAddBuildings,
  includedResidenceIds,
  includedResidencesFor,
  passPeriod,
  publishDecision,
  quote,
  reminderDue,
  residenceAccess,
  trialWindow,
} from '../../services/developments/billing/residencePlan';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-06-15T12:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * DAY);

describe('residenceAccess', () => {
  it('a never-published residence has no trial yet and 5 buildings', () => {
    expect(residenceAccess({ status: 'draft' }, now)).toEqual({
      state: 'none', visibleUntil: null, publicNow: false, daysLeft: null, buildingLimit: 5,
    });
  });

  it('a trial keeps it public until the end, then it expires', () => {
    const t = trialWindow(days(-14));
    const during = residenceAccess({ status: 'published', ...t }, now);
    expect(during).toMatchObject({ state: 'trial', publicNow: true, daysLeft: 1, buildingLimit: 5 });
    const atEnd = residenceAccess({ status: 'published', ...t }, t.trialEndsAt);
    expect(atEnd).toMatchObject({ state: 'expired', publicNow: false });
  });

  it('the trial lasts exactly 15 days', () => {
    const t = trialWindow(now);
    expect(t.trialEndsAt.getTime() - t.trialStartedAt.getTime()).toBe(15 * DAY);
  });

  it('a pass wins over the trial and unlocks the extra buildings', () => {
    const a = residenceAccess({ status: 'published', ...trialWindow(days(-30)), paidUntil: days(200), extraBuildings: 2 }, now);
    expect(a).toMatchObject({ state: 'active', publicNow: true, daysLeft: 200, buildingLimit: 7 });
  });

  it('a premium plan covers it like a pass', () => {
    expect(residenceAccess({ status: 'published', includedUntil: days(10), extraBuildings: 1 }, now)).toMatchObject({
      state: 'included', publicNow: true, buildingLimit: 6,
    });
  });

  it('extra buildings lapse with the pass', () => {
    expect(residenceAccess({ status: 'published', ...trialWindow(days(-400)), paidUntil: days(-1), extraBuildings: 3 }, now))
      .toMatchObject({ state: 'expired', buildingLimit: 5 });
  });

  it('a draft is never public, even with a pass', () => {
    expect(residenceAccess({ status: 'draft', paidUntil: days(100) }, now)).toMatchObject({ state: 'active', publicNow: false });
  });
});

describe('publishDecision', () => {
  const none = residenceAccess({ status: 'draft' }, now);
  it('the first publish starts the trial', () => {
    expect(publishDecision(none, { total: 0, running: 0 })).toEqual({ ok: true, startTrial: true });
  });
  it('republishing during the trial does not restart it', () => {
    const trial = residenceAccess({ status: 'draft', ...trialWindow(days(-3)) }, now);
    expect(publishDecision(trial, { total: 1, running: 1 })).toEqual({ ok: true, startTrial: false });
  });
  it('after the trial a pass is required', () => {
    const expired = residenceAccess({ status: 'draft', ...trialWindow(days(-20)) }, now);
    expect(publishDecision(expired, { total: 1, running: 0 })).toEqual({ ok: false, code: 'PASS_REQUIRED' });
  });
  it('one trial at a time, three ever', () => {
    expect(publishDecision(none, { total: 1, running: 1 })).toEqual({ ok: false, code: 'TRIAL_IN_PROGRESS' });
    expect(publishDecision(none, { total: 3, running: 0 })).toEqual({ ok: false, code: 'TRIAL_LIMIT' });
  });
  it('a pass or plan always allows publishing', () => {
    expect(publishDecision(residenceAccess({ status: 'draft', paidUntil: days(5) }, now), { total: 3, running: 1 }).ok).toBe(true);
    expect(publishDecision(residenceAccess({ status: 'draft', includedUntil: days(5) }, now), { total: 3, running: 1 }).ok).toBe(true);
  });
});

describe('passPeriod and addMonths', () => {
  it('starts now when nothing is paid, and stacks on an unexpired pass', () => {
    expect(passPeriod(null, now, 12)).toEqual({ start: now, end: new Date('2027-06-15T12:00:00Z') });
    expect(passPeriod(days(30), now, 12).start).toEqual(days(30));
    expect(passPeriod(days(-1), now, 12).start).toEqual(now);
  });
  it('clamps to the last day of shorter months', () => {
    expect(addMonths(new Date('2026-01-31T00:00:00Z'), 1)).toEqual(new Date('2026-02-28T00:00:00Z'));
    expect(addMonths(new Date('2028-02-29T00:00:00Z'), 12)).toEqual(new Date('2029-02-28T00:00:00Z'));
  });
});

describe('canAddBuildings', () => {
  it('allows up to the limit and says how many more fit', () => {
    expect(canAddBuildings(5, 4, 1)).toEqual({ ok: true });
    expect(canAddBuildings(5, 5, 1)).toEqual({ ok: false, limit: 5, current: 5, allowed: 0 });
    expect(canAddBuildings(5, 3, 4)).toEqual({ ok: false, limit: 5, current: 3, allowed: 2 });
  });
});

describe('quote', () => {
  it('premium owners get 30% off passes, not buildings', () => {
    expect(quote('pass', 1, 149, false)).toEqual({ listPrice: 149, unitPrice: 149, amount: 149, discountPct: 0 });
    expect(quote('pass', 1, 149, true)).toEqual({ listPrice: 149, unitPrice: 104.3, amount: 104.3, discountPct: 30 });
    expect(quote('extra_building', 3, 29, true)).toEqual({ listPrice: 29, unitPrice: 29, amount: 87, discountPct: 0 });
  });
});

describe('reminderDue', () => {
  const started = (d: number) => ({ status: 'published' as const, ...trialWindow(days(-d)) });
  it('nothing before day 10', () => expect(reminderDue(started(9), [], now)).toBeNull());
  it('day 10, then day 14, each once', () => {
    expect(reminderDue(started(10), [], now)).toBe('day10');
    expect(reminderDue(started(12), ['day10'], now)).toBeNull();
    expect(reminderDue(started(14), ['day10'], now)).toBe('day14');
  });
  it('skips a missed earlier reminder instead of sending two', () => {
    expect(reminderDue(started(14.5), [], now)).toBe('day14');
  });
  it('expiry notice once, never for drafts or paid residences', () => {
    expect(reminderDue(started(16), ['day10', 'day14'], now)).toBe('expired');
    expect(reminderDue(started(16), ['expired'], now)).toBeNull();
    expect(reminderDue({ ...started(16), status: 'draft' }, [], now)).toBeNull();
    expect(reminderDue({ ...started(16), paidUntil: days(100) }, [], now)).toBeNull();
  });
});

describe('includedResidenceIds', () => {
  it('includes the oldest published first', () => {
    const r = includedResidenceIds(
      [{ id: 'c', publishedAt: days(-1) }, { id: 'a', publishedAt: days(-30) }, { id: 'b', publishedAt: days(-10) }],
      2
    );
    expect([...r].sort()).toEqual(['a', 'b']);
    expect(includedResidenceIds([{ id: 'a' }], 0).size).toBe(0);
  });
});

describe('includedResidencesFor', () => {
  it('Pro includes 1, agency plans 3, everything else none', () => {
    expect(includedResidencesFor('pro')).toBe(1);
    expect(includedResidencesFor('agency_owner')).toBe(3);
    expect(includedResidencesFor('free')).toBe(0);
    expect(includedResidencesFor(undefined, 'seller_pro_yearly')).toBe(1);
    expect(includedResidencesFor(undefined, 'seller_enterprise_yearly')).toBe(3);
    expect(includedResidencesFor(undefined, 'buyer_monthly')).toBe(0);
  });
});
