/**
 * Saved cities — the Explore-Cities follow list.
 *
 * Two things are load-bearing: the server decides what can be saved (a follow
 * must be joinable against real market data), and a follow changes who gets
 * emailed. Both are covered here, alongside the digest's audience rules.
 */

import request from 'supertest';
import express from 'express';
import CityMarketData from '../models/CityMarketData';
import CityMarketSnapshot from '../models/CityMarketSnapshot';
import CityMarketDigestRun from '../models/CityMarketDigestRun';
import SavedCity from '../models/SavedCity';
import User from '../models/User';
import emailService, { CityMarketDigestParams } from '../services/emailService';
import {
  toggleSavedCity,
  listSavedCities,
  isCitySaved,
  parseCityInput,
  savedCityKey,
  loadSavedCityKeysForUsers,
  findUserIdsFollowingCities,
  MAX_SAVED_CITIES_PER_USER,
} from '../services/savedCityService';
import {
  runCityMarketDigest,
  changesForRecipient,
  rankChangesForFocus,
  emptyFocus,
} from '../services/cityMarketDigestService';
import {
  fingerprintMetrics,
  toSnapshotInput,
  CityMarketChange,
} from '../services/cityMarketChangeService';
import { createMockUser, getAuthToken } from './setup';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-02T09:00:00.000Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * MS_PER_DAY);

const marketRow = (overrides: Record<string, unknown> = {}) =>
  CityMarketData.create({
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
    marketTrend: 'rising',
    featured: true,
    ...overrides,
  });

const snapshot = (overrides: Record<string, unknown> = {}) => {
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

/** Baseline + current snapshot for one city, moving by `changePct`. */
const movingCity = async (city: string, country: string, changePct: number) => {
  const base = 2400;
  await snapshot({ city, country, countryCode: 'XX', avgPricePerSqm: base, capturedAt: daysAgo(40) });
  await snapshot({
    city, country, countryCode: 'XX',
    avgPricePerSqm: Math.round(base * (1 + changePct / 100)),
    capturedAt: daysAgo(1),
  });
};

const reader = (overrides: Record<string, unknown> = {}) =>
  User.create(createMockUser({
    email: `reader-${Math.random().toString(36).slice(2)}@example.com`,
    isEmailVerified: true,
    ...overrides,
  }));

describe('Saved city service', () => {
  describe('parseCityInput', () => {
    it('accepts a trimmed city and country', () => {
      expect(parseCityInput({ city: '  Tirana ', country: ' Albania ' }))
        .toEqual({ city: 'Tirana', country: 'Albania' });
    });

    it('rejects missing, blank, non-string and oversized values', () => {
      expect(parseCityInput({ city: 'Tirana' })).toBeNull();
      expect(parseCityInput({ city: '   ', country: 'Albania' })).toBeNull();
      expect(parseCityInput({ city: 42, country: 'Albania' })).toBeNull();
      expect(parseCityInput({ city: 'x'.repeat(200), country: 'Albania' })).toBeNull();
      expect(parseCityInput(null)).toBeNull();
      expect(parseCityInput('Tirana')).toBeNull();
    });
  });

  describe('savedCityKey', () => {
    it('is case- and whitespace-insensitive', () => {
      expect(savedCityKey(' Tirana ', 'ALBANIA')).toBe(savedCityKey('tirana', 'albania'));
    });
  });

  describe('toggleSavedCity', () => {
    it('saves a city we track, storing the directory spelling', async () => {
      await marketRow();
      const user = await reader();

      const result = await toggleSavedCity(user._id, { city: 'tirana', country: 'albania' });

      expect(result).toMatchObject({ ok: true, saved: true });
      const stored = await SavedCity.findOne({ userId: user._id }).lean();
      expect(stored?.city).toBe('Tirana');
      expect(stored?.country).toBe('Albania');
      expect(stored?.cityKey).toBe('tirana|albania');
    });

    it('refuses a city with no market data rather than storing junk', async () => {
      const user = await reader();

      const result = await toggleSavedCity(user._id, { city: 'Atlantis', country: 'Nowhere' });

      expect(result).toMatchObject({ ok: false, reason: 'unknown-city' });
      expect(await SavedCity.countDocuments({})).toBe(0);
    });

    it('rejects a malformed request', async () => {
      const user = await reader();

      expect(await toggleSavedCity(user._id, { city: '' })).toMatchObject({ ok: false, reason: 'invalid' });
    });

    it('unsaves on the second call', async () => {
      await marketRow();
      const user = await reader();

      await toggleSavedCity(user._id, { city: 'Tirana', country: 'Albania' });
      const second = await toggleSavedCity(user._id, { city: 'TIRANA', country: 'Albania' });

      expect(second).toMatchObject({ ok: true, saved: false });
      expect(await SavedCity.countDocuments({ userId: user._id })).toBe(0);
    });

    it('caps how many cities one reader can follow', async () => {
      const user = await reader();
      const cities = Array.from({ length: MAX_SAVED_CITIES_PER_USER }, (_, i) => `City${i}`);
      await Promise.all(cities.map(city => SavedCity.create({
        userId: user._id, city, country: 'Albania', countryCode: 'AL',
        cityKey: savedCityKey(city, 'Albania'),
      })));
      await marketRow();

      const result = await toggleSavedCity(user._id, { city: 'Tirana', country: 'Albania' });

      expect(result).toMatchObject({ ok: false, reason: 'limit' });
    });

    it('keeps one row per user per city under concurrent saves', async () => {
      await marketRow();
      const user = await reader();

      const results = await Promise.all([
        toggleSavedCity(user._id, { city: 'Tirana', country: 'Albania' }),
        toggleSavedCity(user._id, { city: 'Tirana', country: 'Albania' }),
      ]);

      // Whatever the interleaving, the unique index guarantees at most one row.
      expect(await SavedCity.countDocuments({ userId: user._id })).toBeLessThanOrEqual(1);
      expect(results.every(r => r.ok)).toBe(true);
    });
  });

  describe('queries', () => {
    it('lists a reader’s follows newest first', async () => {
      await marketRow();
      await marketRow({ city: 'Durres', avgPricePerSqm: 1400 });
      const user = await reader();

      await toggleSavedCity(user._id, { city: 'Tirana', country: 'Albania' });
      await toggleSavedCity(user._id, { city: 'Durres', country: 'Albania' });

      const list = await listSavedCities(user._id);
      expect(list.map(c => c.city)).toEqual(['Durres', 'Tirana']);
      expect(await isCitySaved(user._id, 'tirana', 'ALBANIA')).toBe(true);
      expect(await isCitySaved(user._id, 'Kotor', 'Montenegro')).toBe(false);
    });

    it('loads follows for a batch of readers in one map', async () => {
      await marketRow();
      const [a, b] = await Promise.all([reader(), reader()]);
      await toggleSavedCity(a._id, { city: 'Tirana', country: 'Albania' });

      const map = await loadSavedCityKeysForUsers([a._id, b._id]);

      expect(map.get(String(a._id))).toEqual(new Set(['tirana|albania']));
      expect(map.has(String(b._id))).toBe(false);
    });

    it('finds the followers of a set of cities', async () => {
      await marketRow();
      const [a, b] = await Promise.all([reader(), reader()]);
      await toggleSavedCity(a._id, { city: 'Tirana', country: 'Albania' });

      const followers = await findUserIdsFollowingCities(['tirana|albania']);
      expect(followers).toEqual([String(a._id)]);
      expect(await findUserIdsFollowingCities([])).toEqual([]);
      expect(await findUserIdsFollowingCities(['kotor|montenegro'])).not.toContain(String(b._id));
    });
  });
});

describe('Saved cities API', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authRoutes = require('../routes/authRoutes').default;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const savedCityRoutes = require('../routes/savedCityRoutes').default;
    app.use('/api/auth', authRoutes);
    app.use('/api/saved-cities', savedCityRoutes);
    return app;
  };

  it('requires authentication', async () => {
    const res = await request(createTestApp()).get('/api/saved-cities');
    expect(res.status).toBe(401);
  });

  it('follows, lists and unfollows a city', async () => {
    const app = createTestApp();
    await marketRow();
    const { accessToken } = await getAuthToken(app);

    const follow = await request(app)
      .post('/api/saved-cities/toggle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ city: 'Tirana', country: 'Albania' });
    expect(follow.status).toBe(200);
    expect(follow.body.saved).toBe(true);

    const list = await request(app)
      .get('/api/saved-cities')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.cities).toHaveLength(1);
    expect(list.body.cities[0].city).toBe('Tirana');
    expect(list.body.limit).toBe(MAX_SAVED_CITIES_PER_USER);

    const check = await request(app)
      .get('/api/saved-cities/check/Tirana/Albania')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(check.body.saved).toBe(true);

    const unfollow = await request(app)
      .post('/api/saved-cities/toggle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ city: 'Tirana', country: 'Albania' });
    expect(unfollow.body.saved).toBe(false);
  });

  it('answers 404 for a city we do not track and 400 for a malformed body', async () => {
    const app = createTestApp();
    const { accessToken } = await getAuthToken(app);

    const unknown = await request(app)
      .post('/api/saved-cities/toggle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ city: 'Atlantis', country: 'Nowhere' });
    expect(unknown.status).toBe(404);
    expect(unknown.body.reason).toBe('unknown-city');

    const malformed = await request(app)
      .post('/api/saved-cities/toggle')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ country: 'Albania' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.reason).toBe('invalid');
  });
});

describe('Digest selection for a follower', () => {
  const change = (city: string, country: string, magnitude: number, observedAt = daysAgo(1)): CityMarketChange => ({
    city,
    country,
    countryCode: 'XX',
    price: { previous: 1000, current: 1000 + magnitude * 10, changePct: magnitude, direction: 'up' },
    medianPrice: null,
    rentalYield: null,
    daysOnMarket: null,
    listings: null,
    marketTrend: 'rising',
    previousMarketTrend: 'rising',
    trendChanged: false,
    magnitude,
    previousAt: daysAgo(40),
    observedAt,
  });

  it('ranks a followed city above a bigger mover and above a searched city', () => {
    const focus = {
      savedCities: new Set(['tirana|albania']),
      searchCities: new Set(['split']),
      countries: new Set<string>(),
    };

    const ranked = rankChangesForFocus(
      [change('Belgrade', 'Serbia', 9), change('Split', 'Croatia', 6), change('Tirana', 'Albania', 2)],
      focus,
      6,
    );

    expect(ranked.map(r => r.change.city)).toEqual(['Tirana', 'Split', 'Belgrade']);
    expect(ranked[0].isFollowed).toBe(true);
  });

  it('sends only followed cities in a saved-cities run', () => {
    const focus = { ...emptyFocus(), savedCities: new Set(['tirana|albania']) };

    const selected = changesForRecipient(
      [change('Belgrade', 'Serbia', 9), change('Tirana', 'Albania', 2)],
      focus,
      { audience: 'saved-cities', limit: 6 },
    );

    expect(selected.map(s => s.change.city)).toEqual(['Tirana']);
  });

  it('fills an all-audience email with regional movers after the followed city', () => {
    const focus = { ...emptyFocus(), savedCities: new Set(['tirana|albania']) };

    const selected = changesForRecipient(
      [change('Belgrade', 'Serbia', 9), change('Tirana', 'Albania', 2)],
      focus,
      { audience: 'all', limit: 6 },
    );

    expect(selected.map(s => s.change.city)).toEqual(['Tirana', 'Belgrade']);
  });

  it('drops changes the reader was already emailed', () => {
    const focus = emptyFocus();

    const selected = changesForRecipient(
      [change('Belgrade', 'Serbia', 9, daysAgo(10)), change('Tirana', 'Albania', 4, daysAgo(1))],
      focus,
      { audience: 'all', limit: 6, watermark: daysAgo(5) },
    );

    expect(selected.map(s => s.change.city)).toEqual(['Tirana']);
  });

  it('selects nothing when every change predates the reader’s watermark', () => {
    expect(changesForRecipient(
      [change('Belgrade', 'Serbia', 9, daysAgo(10))],
      emptyFocus(),
      { audience: 'all', limit: 6, watermark: daysAgo(1) },
    )).toEqual([]);
  });
});

describe('Digest audience', () => {
  let sendSpy: jest.SpyInstance;

  beforeEach(() => {
    sendSpy = jest.spyOn(emailService, 'sendCityMarketUpdateDigest').mockResolvedValue('sent');
  });

  const follower = async (city: string, country: string) => {
    const user = await reader();
    await SavedCity.create({
      userId: user._id, city, country, countryCode: 'XX', cityKey: savedCityKey(city, country),
    });
    return user;
  };

  it('emails only followers when a move is too small for the whole audience', async () => {
    await movingCity('Tirana', 'Albania', 2);
    const followerUser = await follower('Tirana', 'Albania');
    await reader(); // opted in, but follows nothing

    const result = await runCityMarketDigest({ reason: 'source-update', now: NOW });

    expect(result.audience).toBe('saved-cities');
    expect(result.status).toBe('sent');
    expect(result.emailsSent).toBe(1);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const params = sendSpy.mock.calls[0][0] as CityMarketDigestParams;
    expect(params.email).toBe(followerUser.email);
    expect(params.cities[0].city).toBe('Tirana');
    expect(params.cities[0].isFollowed).toBe(true);
  });

  it('skips a small move nobody follows', async () => {
    await movingCity('Tirana', 'Albania', 2);
    await reader();

    const result = await runCityMarketDigest({ reason: 'source-update', now: NOW });

    expect(result.status).toBe('skipped');
    expect(result.note).toMatch(/nobody follows/i);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('emails everyone when a move is large', async () => {
    await movingCity('Tirana', 'Albania', 9);
    await follower('Tirana', 'Albania');
    await reader();

    const result = await runCityMarketDigest({ reason: 'source-update', now: NOW });

    expect(result.audience).toBe('all');
    expect(result.emailsSent).toBe(2);
  });

  it('does not let a follower-only send block the monthly digest', async () => {
    await movingCity('Tirana', 'Albania', 2);
    await follower('Tirana', 'Albania');
    await reader();

    const followerRun = await runCityMarketDigest({ reason: 'source-update', now: NOW });
    expect(followerRun.audience).toBe('saved-cities');
    expect(followerRun.emailsSent).toBe(1);

    // The monthly digest owes the whole audience these changes: a saved-cities
    // run must neither consume the cadence nor advance the window.
    const monthly = await runCityMarketDigest({ reason: 'monthly', now: NOW });
    expect(monthly.status).toBe('sent');
    expect(monthly.audience).toBe('all');
    expect(monthly.emailsSent).toBe(1); // the follower was already told
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('never repeats a change to the same reader', async () => {
    await movingCity('Tirana', 'Albania', 9);
    const followerUser = await follower('Tirana', 'Albania');

    await runCityMarketDigest({ reason: 'source-update', now: NOW });
    const stored = await User.findById(followerUser._id).lean();
    expect(stored?.cityMarketDigestSentAt).toBeTruthy();

    const second = await runCityMarketDigest({ reason: 'manual', force: true, now: NOW });
    expect(second.emailsSent).toBe(0);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('records the audience on the run for later cadence decisions', async () => {
    await movingCity('Tirana', 'Albania', 2);
    await follower('Tirana', 'Albania');

    await runCityMarketDigest({ reason: 'source-update', now: NOW });

    const run = await CityMarketDigestRun.findOne({}).lean();
    expect(run?.audience).toBe('saved-cities');
    expect(run?.status).toBe('sent');
  });

  it('still holds back a second whole-audience digest inside the interval', async () => {
    await movingCity('Tirana', 'Albania', 9);
    await reader();

    await runCityMarketDigest({ reason: 'monthly', now: NOW });
    const second = await runCityMarketDigest({ reason: 'monthly', now: NOW });

    expect(second.status).toBe('skipped');
    expect(second.note).toMatch(/Cadence guard/);
  });
});
