/**
 * "Ask the business" spam and cost limits: per IP (burst, hour, day), the
 * answer cache, per business and site-wide. A fake clock drives the windows.
 */
process.env.SKIP_TEST_DB = 'true';

import { AskGuard, limitsFromEnv, normalizeQuestion, type AskLimits } from '../services/businessAssistant/askGuard';

const LIMITS: AskLimits = { perMinute: 3, perHour: 5, perDayPerIp: 7, perDayPerListing: 4, perDayGlobal: 6 };

function setup(limits = LIMITS) {
  let now = Date.UTC(2026, 10, 4, 9, 0);
  const guard = new AskGuard(limits, () => now);
  return { guard, advance: (ms: number) => { now += ms; } };
}

describe('per visitor', () => {
  it('stops a burst, and lets the visitor go again a minute later', () => {
    const { guard, advance } = setup();
    for (let i = 0; i < 3; i++) expect(guard.admitVisitor('1.1.1.1')).toEqual({ blocked: false });
    const blocked = guard.admitVisitor('1.1.1.1');
    expect(blocked).toMatchObject({ blocked: true, reason: 'burst' });
    expect((blocked as { retryAfterSeconds: number }).retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(guard.admitVisitor('2.2.2.2')).toEqual({ blocked: false }); // others unaffected
    advance(61_000);
    expect(guard.admitVisitor('1.1.1.1')).toEqual({ blocked: false });
  });

  it('caps the hour and then the day, even when paced', () => {
    const { guard, advance } = setup();
    const ask = () => { const r = guard.admitVisitor('1.1.1.1'); advance(61_000); return r; };
    for (let i = 0; i < 5; i++) expect(ask().blocked).toBe(false);
    expect(ask()).toMatchObject({ blocked: true, reason: 'hourly' });
    advance(60 * 60_000);
    expect(ask().blocked).toBe(false);
    expect(ask().blocked).toBe(false);
    expect(ask()).toMatchObject({ blocked: true, reason: 'daily' });
  });
});

describe('model budget', () => {
  it('caps calls per business, then site-wide', () => {
    const { guard } = setup();
    for (let i = 0; i < 4; i++) expect(guard.admitModelCall('biz-a').blocked).toBe(false);
    expect(guard.admitModelCall('biz-a')).toMatchObject({ blocked: true, reason: 'listing' });
    expect(guard.admitModelCall('biz-b').blocked).toBe(false);
    expect(guard.admitModelCall('biz-b').blocked).toBe(false);
    expect(guard.admitModelCall('biz-c')).toMatchObject({ blocked: true, reason: 'busy' });
  });

  it('takes the site-wide budget from BUSINESS_ASK_DAILY_LIMIT', () => {
    expect(limitsFromEnv({ BUSINESS_ASK_DAILY_LIMIT: '500' } as NodeJS.ProcessEnv).perDayGlobal).toBe(500);
    expect(limitsFromEnv({ BUSINESS_ASK_DAILY_LIMIT: 'lots' } as NodeJS.ProcessEnv).perDayGlobal).toBe(2000);
  });
});

describe('answer cache', () => {
  it('serves the same opening question from memory, until a day passes or the profile changes', () => {
    const { guard, advance } = setup();
    const key = AskGuard.cacheKey('biz-a', 'v1', 'Are you OPEN on Saturday??', 0);
    guard.remember(key, { answer: 'Yes, 9–13.', action: 'none' });
    expect(guard.cached(AskGuard.cacheKey('biz-a', 'v1', '  are you open on saturday ', 0))).toEqual({ answer: 'Yes, 9–13.', action: 'none' });
    expect(guard.cached(AskGuard.cacheKey('biz-a', 'v2', 'Are you open on Saturday?', 0))).toBeUndefined();
    advance(24 * 60 * 60_000);
    expect(guard.cached(key)).toBeUndefined();
  });

  it('never caches follow-ups, whose answer depends on the chat', () => {
    expect(AskGuard.cacheKey('biz-a', 'v1', 'and Sunday?', 2)).toBeNull();
  });

  it('treats punctuation, case and spacing as the same question', () => {
    expect(normalizeQuestion('  Do you speak   ITALIAN?! ')).toBe('do you speak italian');
  });
});
