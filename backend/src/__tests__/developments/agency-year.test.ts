/** Agency subscription years and coverage (pure). */
import { agencyCoverageEnd, agencySubscribed, agencyYearStart } from '../../services/developments/billing/agencyYear';

const DAY = 86_400_000;
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('agencyYearStart', () => {
  const sub = { status: 'active', startDate: d('2025-03-10'), expiresAt: d('2027-03-10') };
  it('counts years from the subscription start', () => {
    expect(agencyYearStart(sub, d('2025-03-10'))).toEqual(d('2025-03-10'));
    expect(agencyYearStart(sub, d('2026-03-09'))).toEqual(d('2025-03-10'));
    expect(agencyYearStart(sub, d('2026-03-10'))).toEqual(d('2026-03-10'));
    expect(agencyYearStart(sub, d('2026-11-01'))).toEqual(d('2026-03-10'));
  });
  it('without a start date, the year ending at expiry', () => {
    expect(agencyYearStart({ expiresAt: d('2026-12-01') }, d('2026-06-01'))).toEqual(d('2025-12-01'));
  });
});

describe('agencySubscribed', () => {
  it('active or trial and not past the end date', () => {
    const now = d('2026-06-01');
    expect(agencySubscribed({ status: 'active', expiresAt: d('2026-07-01') }, now)).toBe(true);
    expect(agencySubscribed({ status: 'trial', expiresAt: d('2026-07-01') }, now)).toBe(true);
    expect(agencySubscribed({ status: 'active', expiresAt: d('2026-05-01') }, now)).toBe(false);
    expect(agencySubscribed({ status: 'canceled', expiresAt: d('2026-07-01') }, now)).toBe(false);
    expect(agencySubscribed(null, now)).toBe(false);
  });
});

describe('agencyCoverageEnd', () => {
  const now = d('2026-06-01');
  it('while subscribed: the end of the subscription plus 15 days', () => {
    expect(agencyCoverageEnd({ status: 'active', expiresAt: d('2026-12-01') }, null, now)).toEqual(new Date(d('2026-12-01').getTime() + 15 * DAY));
  });
  it('after it lapses: 15 days from the end', () => {
    expect(agencyCoverageEnd({ status: 'expired', expiresAt: d('2026-05-25') }, null, now)).toEqual(new Date(d('2026-05-25').getTime() + 15 * DAY));
  });
  it('deactivated early: 15 days from when that was first seen, and the date never moves', () => {
    const ended = d('2026-05-30');
    expect(agencyCoverageEnd({ status: 'canceled', expiresAt: d('2027-01-01') }, ended, now)).toEqual(new Date(ended.getTime() + 15 * DAY));
    expect(agencyCoverageEnd({ status: 'canceled', expiresAt: d('2027-01-01') }, null, now)).toBeNull();
  });
  it('agency gone: grace from when it ended, else nothing', () => {
    expect(agencyCoverageEnd(null, d('2026-05-30'), now)).toEqual(new Date(d('2026-05-30').getTime() + 15 * DAY));
    expect(agencyCoverageEnd(null, null, now)).toBeNull();
  });
});
