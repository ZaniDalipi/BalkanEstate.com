/**
 * Explore-Cities market update digest
 *
 * Covers the three things that decide whether a reader gets a correct email:
 * change detection (what counts as "the sources published something new"),
 * digest orchestration (who is emailed, and how often), and the scoped
 * unsubscribe (turning this digest off must not silence anything else).
 */

import request from 'supertest';
import express from 'express';
import CityMarketData from '../models/CityMarketData';
import CityMarketSnapshot from '../models/CityMarketSnapshot';
import CityMarketDigestRun from '../models/CityMarketDigestRun';
import User from '../models/User';
import emailService, { CityMarketDigestParams } from '../services/emailService';
import {
  captureCityMarketSnapshots,
  computeCityMarketChanges,
  computeDelta,
  diffSnapshots,
  fingerprintMetrics,
  toSnapshotInput,
  pruneCityMarketSnapshots,
} from '../services/cityMarketChangeService';
import {
  runCityMarketDigest,
  rankChangesForFocus,
  toDigestCity,
  previewCityMarketDigest,
} from '../services/cityMarketDigestService';
import { createMockUser } from './setup';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-02T09:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * MS_PER_DAY);

const marketRow = (overrides: Record<string, unknown> = {}) => ({
  city: 'Tirana',
  country: 'Albania',
  countryCode: 'AL',
  avgPricePerSqm: 2400,
  medianPrice: 168000,
  priceGrowthYoY: 9,
  priceGrowthMoM: 0.7,
  averageDaysOnMarket: 38,
  listingsCount: 120,
  soldLastMonth: 8,
  demandScore: 82,
  rentalYield: 5.4,
  investmentScore: 78,
  topNeighborhoods: ['Blloku'],
  marketTrend: 'rising' as const,
  highlights: ['Strong demand'],
  featured: true,
  displayOrder: 0,
  ...overrides,
});

const snapshotDoc = (overrides: Record<string, unknown> = {}) => {
  const base = {
    city: 'Tirana',
    country: 'Albania',
    countryCode: 'AL',
    avgPricePerSqm: 2400,
    medianPrice: 168000,
    priceGrowthYoY: 9,
    priceGrowthMoM: 0.7,
    rentalYield: 5.4,
    demandScore: 82,
    investmentScore: 78,
    marketTrend: 'rising' as const,
    averageDaysOnMarket: 38,
    listingsCount: 120,
    capturedAt: daysAgo(40),
    ...overrides,
  };
  const input = toSnapshotInput(base);
  if (!input) throw new Error('Test snapshot fixture is invalid');
  return CityMarketSnapshot.create({ ...base, fingerprint: fingerprintMetrics(input) });
};

const snapshotInput = (overrides: Record<string, unknown> = {}) => {
  const input = toSnapshotInput({
    city: 'Tirana',
    country: 'Albania',
    countryCode: 'AL',
    avgPricePerSqm: 2400,
    medianPrice: 168000,
    priceGrowthYoY: 9,
    priceGrowthMoM: 0.7,
    rentalYield: 5.4,
    demandScore: 82,
    investmentScore: 78,
    marketTrend: 'rising',
    averageDaysOnMarket: 38,
    listingsCount: 120,
    ...overrides,
  });
  if (!input) throw new Error('Test snapshot input fixture is invalid');
  return { ...input, capturedAt: (overrides.capturedAt as Date) ?? daysAgo(40) };
};

const DIFF_OPTIONS = { minPriceChangePct: 1.5, maxCredibleChangePct: 200 };

describe('City market change detection', () => {
  describe('fingerprintMetrics', () => {
    it('is stable for identical figures and ignores floating-point noise', () => {
      const a = snapshotInput();
      const b = snapshotInput({ avgPricePerSqm: 2400.0000001 });

      expect(fingerprintMetrics(a)).toBe(fingerprintMetrics(b));
    });

    it('changes when an upstream figure changes', () => {
      expect(fingerprintMetrics(snapshotInput()))
        .not.toBe(fingerprintMetrics(snapshotInput({ avgPricePerSqm: 2500 })));
    });

    it('changes when only the market trend label changes', () => {
      expect(fingerprintMetrics(snapshotInput()))
        .not.toBe(fingerprintMetrics(snapshotInput({ marketTrend: 'stable' })));
    });

    it('ignores platform-derived figures that move on every listing edit', () => {
      const a = snapshotInput({ listingsCount: 120, averageDaysOnMarket: 38 });
      const b = snapshotInput({ listingsCount: 400, averageDaysOnMarket: 61 });

      expect(fingerprintMetrics(a)).toBe(fingerprintMetrics(b));
    });
  });

  describe('computeDelta', () => {
    it('computes a signed percentage rounded to one decimal', () => {
      expect(computeDelta(2400, 2578, 200)).toEqual({
        previous: 2400,
        current: 2578,
        changePct: 7.4,
        direction: 'up',
      });
      expect(computeDelta(2400, 2280, 200)?.changePct).toBe(-5);
    });

    it('refuses to invent a percentage from a zero baseline', () => {
      expect(computeDelta(0, 2400, 200)).toBeNull();
    });

    it('rejects non-numeric and non-finite readings', () => {
      expect(computeDelta(undefined, 2400, 200)).toBeNull();
      expect(computeDelta(2400, null, 200)).toBeNull();
      expect(computeDelta(2400, Number.NaN, 200)).toBeNull();
      expect(computeDelta('2400', 2500, 200)).toBeNull();
    });

    it('discards changes beyond the credible ceiling (corrupt upstream data)', () => {
      expect(computeDelta(100, 100000, 200)).toBeNull();
    });
  });

  describe('diffSnapshots', () => {
    it('reports a material price move, biggest-first ranking metric included', () => {
      const change = diffSnapshots(
        snapshotInput({ capturedAt: daysAgo(40) }),
        snapshotInput({ avgPricePerSqm: 2578, capturedAt: daysAgo(1) }),
        DIFF_OPTIONS,
      );

      expect(change).not.toBeNull();
      expect(change?.price.changePct).toBe(7.4);
      expect(change?.magnitude).toBe(7.4);
      expect(change?.trendChanged).toBe(false);
    });

    it('stays quiet when the price barely moved and the trend label held', () => {
      const change = diffSnapshots(
        snapshotInput({ capturedAt: daysAgo(40) }),
        snapshotInput({ avgPricePerSqm: 2412, capturedAt: daysAgo(1) }),
        DIFF_OPTIONS,
      );

      expect(change).toBeNull();
    });

    it('reports a re-labelled market even on a small price move', () => {
      const change = diffSnapshots(
        snapshotInput({ capturedAt: daysAgo(40) }),
        snapshotInput({ avgPricePerSqm: 2412, marketTrend: 'declining', capturedAt: daysAgo(1) }),
        DIFF_OPTIONS,
      );

      expect(change?.trendChanged).toBe(true);
      expect(change?.previousMarketTrend).toBe('rising');
      expect(change?.marketTrend).toBe('declining');
    });

    it('drops secondary metrics it cannot compute instead of guessing', () => {
      const change = diffSnapshots(
        snapshotInput({ rentalYield: 0, capturedAt: daysAgo(40) }),
        snapshotInput({ avgPricePerSqm: 2578, rentalYield: 5.9, capturedAt: daysAgo(1) }),
        DIFF_OPTIONS,
      );

      expect(change?.rentalYield).toBeNull();
      expect(change?.price).not.toBeNull();
    });
  });

  describe('toSnapshotInput', () => {
    it('rejects rows without a usable headline price', () => {
      expect(toSnapshotInput(marketRow({ avgPricePerSqm: 0 }))).toBeNull();
      expect(toSnapshotInput(marketRow({ avgPricePerSqm: undefined }))).toBeNull();
    });

    it('rejects rows with an unknown market trend label', () => {
      expect(toSnapshotInput(marketRow({ marketTrend: 'exploding' }))).toBeNull();
    });

    it('rejects non-objects', () => {
      expect(toSnapshotInput(null)).toBeNull();
      expect(toSnapshotInput('Tirana')).toBeNull();
    });
  });

  describe('captureCityMarketSnapshots', () => {
    it('captures one snapshot per valid city and skips invalid rows', async () => {
      await CityMarketData.create(marketRow());
      await CityMarketData.collection.insertOne({
        city: 'Broken',
        country: 'Nowhere',
        countryCode: 'XX',
        marketTrend: 'rising',
        lastUpdated: new Date(),
      });

      const result = await captureCityMarketSnapshots(daysAgo(1));

      expect(result.created).toBe(1);
      expect(result.invalid).toBe(1);
      expect(await CityMarketSnapshot.countDocuments({})).toBe(1);
    });

    it('writes nothing when the sources published no new figures', async () => {
      await CityMarketData.create(marketRow());
      await captureCityMarketSnapshots(daysAgo(2));

      const second = await captureCityMarketSnapshots(daysAgo(1));

      expect(second.created).toBe(0);
      expect(second.unchanged).toBe(1);
      expect(await CityMarketSnapshot.countDocuments({})).toBe(1);
    });

    it('writes a new snapshot once an upstream figure changes', async () => {
      const row = await CityMarketData.create(marketRow());
      await captureCityMarketSnapshots(daysAgo(2));

      row.avgPricePerSqm = 2578;
      await row.save();
      const second = await captureCityMarketSnapshots(daysAgo(1));

      expect(second.created).toBe(1);
      expect(await CityMarketSnapshot.countDocuments({})).toBe(2);
    });
  });

  describe('computeCityMarketChanges', () => {
    it('compares the newest snapshot against the baseline at the window start', async () => {
      await snapshotDoc({ capturedAt: daysAgo(40) });
      await snapshotDoc({ avgPricePerSqm: 2578, capturedAt: daysAgo(1) });

      const changes = await computeCityMarketChanges({ since: daysAgo(30) });

      expect(changes).toHaveLength(1);
      expect(changes[0].city).toBe('Tirana');
      expect(changes[0].price.changePct).toBe(7.4);
    });

    it('ranks the biggest mover first', async () => {
      await snapshotDoc({ capturedAt: daysAgo(40) });
      await snapshotDoc({ avgPricePerSqm: 2500, capturedAt: daysAgo(1) });
      await snapshotDoc({ city: 'Belgrade', country: 'Serbia', countryCode: 'RS', capturedAt: daysAgo(40) });
      await snapshotDoc({
        city: 'Belgrade', country: 'Serbia', countryCode: 'RS',
        avgPricePerSqm: 2100, capturedAt: daysAgo(1),
      });

      const changes = await computeCityMarketChanges({ since: daysAgo(30) });

      expect(changes.map(c => c.city)).toEqual(['Belgrade', 'Tirana']);
    });

    it('skips a newly tracked city rather than reporting a jump from nothing', async () => {
      await snapshotDoc({ city: 'Kotor', country: 'Montenegro', countryCode: 'ME', capturedAt: daysAgo(1) });

      const changes = await computeCityMarketChanges({ since: daysAgo(30) });

      expect(changes).toEqual([]);
    });

    it('reports nothing when the newest snapshot predates the window', async () => {
      await snapshotDoc({ capturedAt: daysAgo(80) });
      await snapshotDoc({ avgPricePerSqm: 2578, capturedAt: daysAgo(40) });

      const changes = await computeCityMarketChanges({ since: daysAgo(30) });

      expect(changes).toEqual([]);
    });
  });

  describe('pruneCityMarketSnapshots', () => {
    it('removes only snapshots beyond the retention window', async () => {
      await snapshotDoc({ capturedAt: daysAgo(900) });
      await snapshotDoc({ capturedAt: daysAgo(10) });

      const removed = await pruneCityMarketSnapshots(730, NOW);

      expect(removed).toBe(1);
      expect(await CityMarketSnapshot.countDocuments({})).toBe(1);
    });

    it('is a no-op for a non-positive retention window', async () => {
      await snapshotDoc({ capturedAt: daysAgo(900) });

      expect(await pruneCityMarketSnapshots(0, NOW)).toBe(0);
      expect(await pruneCityMarketSnapshots(Number.NaN, NOW)).toBe(0);
    });
  });
});

describe('City market digest ranking', () => {
  const change = (city: string, country: string, magnitude: number) => ({
    city,
    country,
    countryCode: 'XX',
    price: { previous: 1000, current: 1000 + magnitude * 10, changePct: magnitude, direction: 'up' as const },
    medianPrice: null,
    rentalYield: null,
    daysOnMarket: null,
    listings: null,
    marketTrend: 'rising' as const,
    previousMarketTrend: 'rising' as const,
    trendChanged: false,
    magnitude,
    previousAt: daysAgo(40),
    observedAt: daysAgo(1),
  });

  it('puts a followed city ahead of a bigger regional mover', () => {
    const ranked = rankChangesForFocus(
      [change('Belgrade', 'Serbia', 9), change('Tirana', 'Albania', 3)],
      { cities: new Set(['tirana']), countries: new Set() },
      6,
    );

    expect(ranked.map(r => r.change.city)).toEqual(['Tirana', 'Belgrade']);
    expect(ranked[0].isFollowed).toBe(true);
    expect(ranked[1].isFollowed).toBe(false);
  });

  it('prefers the reader’s country when no city matches', () => {
    const ranked = rankChangesForFocus(
      [change('Belgrade', 'Serbia', 9), change('Durres', 'Albania', 3)],
      { cities: new Set(), countries: new Set(['albania']) },
      6,
    );

    expect(ranked.map(r => r.change.city)).toEqual(['Durres', 'Belgrade']);
    // A country match is context, not a follow — the star is reserved for cities.
    expect(ranked[0].isFollowed).toBe(false);
  });

  it('falls back to biggest-mover order with no focus at all', () => {
    const ranked = rankChangesForFocus(
      [change('Tirana', 'Albania', 3), change('Belgrade', 'Serbia', 9)],
      { cities: new Set(), countries: new Set() },
      6,
    );

    expect(ranked.map(r => r.change.city)).toEqual(['Belgrade', 'Tirana']);
  });

  it('caps the list at the configured city count', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) => change(c, 'Serbia', 10 - i));

    expect(rankChangesForFocus(many, { cities: new Set(), countries: new Set() }, 3)).toHaveLength(3);
  });

  it('maps a change to a view model with a deep link to that city', () => {
    const view = toDigestCity(change('Novi Sad', 'Serbia', 4), true);

    expect(view.isFollowed).toBe(true);
    expect(view.exploreUrl).toContain('/explore-cities/Novi%20Sad/Serbia');
    expect(view.changePct).toBe(4);
  });
});

describe('City market digest run', () => {
  let sendSpy: jest.SpyInstance;

  const subscriber = (overrides: Record<string, unknown> = {}) =>
    User.create(createMockUser({
      email: `reader-${Math.random().toString(36).slice(2)}@example.com`,
      isEmailVerified: true,
      ...overrides,
    }));

  /** Baseline + current snapshot for one city, moving by `changePct`. */
  const movingCity = async (city: string, country: string, changePct: number) => {
    const base = 2400;
    await snapshotDoc({ city, country, countryCode: 'XX', avgPricePerSqm: base, capturedAt: daysAgo(40) });
    await snapshotDoc({
      city, country, countryCode: 'XX',
      avgPricePerSqm: Math.round(base * (1 + changePct / 100)),
      capturedAt: daysAgo(1),
    });
  };

  beforeEach(() => {
    sendSpy = jest.spyOn(emailService, 'sendCityMarketUpdateDigest').mockResolvedValue('sent');
  });

  it('emails verified opted-in readers and records the run', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber({ name: 'Ana' });

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.status).toBe('sent');
    expect(result.citiesChanged).toBe(1);
    expect(result.emailsSent).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    const params = sendSpy.mock.calls[0][0] as CityMarketDigestParams;
    expect(params.userName).toBe('Ana');
    expect(params.cities[0].city).toBe('Tirana');
    expect(params.cities[0].changePct).toBeCloseTo(7.4, 1);
    expect(params.periodLabel).toMatch(/2026/);

    const run = await CityMarketDigestRun.findOne({}).lean();
    expect(run?.status).toBe('sent');
    expect(run?.topCity).toBe('Tirana');
    expect(run?.emailsSent).toBe(1);
  });

  it('never emails a reader who switched this digest off', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber({ name: 'OptedOut', emailPreferences: { cityMarketUpdates: false } });

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.recipientsConsidered).toBe(0);
    expect(result.emailsSent).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('leaves other alert types untouched for a digest opt-out', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    const user = await subscriber({ emailPreferences: { cityMarketUpdates: false } });

    const stored = await User.findById(user._id).lean();
    expect(stored?.emailPreferences?.cityMarketUpdates).toBe(false);
    expect(stored?.emailPreferences?.propertyAlerts).toBe(true);
    expect(stored?.emailPreferences?.priceDrops).toBe(true);
    expect(stored?.emailPreferences?.transactional).toBe(true);
  });

  it('skips unverified addresses', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber({ isEmailVerified: false });

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.recipientsConsidered).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('sends nothing — and records why — when no city moved enough', async () => {
    await snapshotDoc({ capturedAt: daysAgo(40) });
    await snapshotDoc({ avgPricePerSqm: 2412, capturedAt: daysAgo(1) });
    await subscriber();

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.status).toBe('skipped');
    expect(result.citiesChanged).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
    expect((await CityMarketDigestRun.findOne({}).lean())?.note).toMatch(/No city moved/i);
  });

  it('holds the monthly digest back until the interval has passed', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber();

    await runCityMarketDigest({ reason: 'monthly', now: NOW });
    const second = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(second.status).toBe('skipped');
    expect(second.note).toMatch(/Cadence guard/);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('does not interrupt the monthly rhythm for a modest move', async () => {
    await movingCity('Tirana', 'Albania', 2);
    await subscriber();

    const result = await runCityMarketDigest({ reason: 'source-update', now: NOW });

    expect(result.status).toBe('skipped');
    expect(result.citiesChanged).toBe(1);
    expect(result.note).toMatch(/out-of-cycle threshold/);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('emails out of cycle when a city moves sharply', async () => {
    await movingCity('Tirana', 'Albania', 9);
    await subscriber();

    const result = await runCityMarketDigest({ reason: 'source-update', now: NOW });

    expect(result.status).toBe('sent');
    expect(result.significantCities).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('advances the comparison window so a change is reported once', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber();

    await runCityMarketDigest({ reason: 'monthly', now: NOW });
    // Same snapshots, cadence bypassed: the window has moved past them.
    const second = await runCityMarketDigest({ reason: 'manual', force: true, now: NOW });

    expect(second.citiesChanged).toBe(0);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('reports a dry run without emailing or moving the window', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber();

    const dry = await runCityMarketDigest({ reason: 'manual', dryRun: true, force: true, now: NOW });
    expect(dry.emailsSent).toBe(0);
    expect(sendSpy).not.toHaveBeenCalled();
    expect((await CityMarketDigestRun.findOne({}).lean())?.status).toBe('skipped');

    const real = await runCityMarketDigest({ reason: 'manual', force: true, now: NOW });
    expect(real.emailsSent).toBe(1);
  });

  it('keeps going when one recipient’s send fails', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber({ email: 'first@example.com' });
    await subscriber({ email: 'second@example.com' });

    sendSpy.mockRejectedValueOnce(new Error('provider down')).mockResolvedValue('sent');

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.emailsFailed).toBe(1);
    expect(result.emailsSent).toBe(1);
    expect(result.status).toBe('sent');
  });

  it('counts a provider-side opt-out as skipped, not sent', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber();
    sendSpy.mockResolvedValue('unsubscribed');

    const result = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(result.emailsSent).toBe(0);
    expect(result.emailsSkipped).toBe(1);
    expect(result.status).toBe('skipped');
  });

  it('previews the pending changes without sending', async () => {
    await movingCity('Tirana', 'Albania', 7.4);
    await subscriber();

    const preview = await previewCityMarketDigest(NOW);

    expect(preview.changes).toHaveLength(1);
    expect(preview.periodLabel).toMatch(/2026/);
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await CityMarketDigestRun.countDocuments({})).toBe(0);
  });
});

describe('Scoped unsubscribe', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authRoutes = require('../routes/authRoutes').default;
    app.use('/api/auth', authRoutes);
    return app;
  };

  it('turns off only the city digest for type=cityMarketUpdates', async () => {
    const app = createTestApp();
    const user = await User.create(createMockUser({ email: 'scoped@example.com' }));
    const token = (await User.findById(user._id).select('unsubscribeToken').lean())?.unsubscribeToken;

    expect(token).toBeTruthy();

    const res = await request(app)
      .get('/api/auth/unsubscribe')
      .query({ token, type: 'cityMarketUpdates' });

    expect(res.status).toBe(302);

    const updated = await User.findById(user._id).lean();
    expect(updated?.emailPreferences?.cityMarketUpdates).toBe(false);
    expect(updated?.emailPreferences?.propertyAlerts).toBe(true);
    expect(updated?.emailPreferences?.priceDrops).toBe(true);
    expect(updated?.emailPreferences?.messages).toBe(true);
    expect(updated?.emailPreferences?.weeklyStats).toBe(true);
    expect(updated?.emailPreferences?.marketing).toBe(true);
    expect(updated?.emailPreferences?.transactional).toBe(true);
  });

  it('turns every optional category off for type=all, transactional included never', async () => {
    const app = createTestApp();
    const user = await User.create(createMockUser({ email: 'all-off@example.com' }));
    const token = (await User.findById(user._id).select('unsubscribeToken').lean())?.unsubscribeToken;

    await request(app).get('/api/auth/unsubscribe').query({ token, type: 'all' }).expect(302);

    const updated = await User.findById(user._id).lean();
    expect(updated?.emailPreferences?.cityMarketUpdates).toBe(false);
    expect(updated?.emailPreferences?.marketing).toBe(false);
    expect(updated?.emailPreferences?.transactional).toBe(true);
  });

  it('falls back to unsubscribing from everything for an unknown type', async () => {
    const app = createTestApp();
    const user = await User.create(createMockUser({ email: 'unknown-type@example.com' }));
    const token = (await User.findById(user._id).select('unsubscribeToken').lean())?.unsubscribeToken;

    await request(app).get('/api/auth/unsubscribe').query({ token, type: 'transactional' }).expect(302);

    const updated = await User.findById(user._id).lean();
    expect(updated?.emailPreferences?.cityMarketUpdates).toBe(false);
    expect(updated?.emailPreferences?.transactional).toBe(true);
  });

  it('rejects an unknown token', async () => {
    const app = createTestApp();

    const res = await request(app)
      .get('/api/auth/unsubscribe')
      .query({ token: 'not-a-real-token', type: 'cityMarketUpdates' });

    expect(res.status).toBe(404);
  });
});
