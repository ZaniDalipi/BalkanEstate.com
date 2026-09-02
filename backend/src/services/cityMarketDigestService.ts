/**
 * Explore-Cities market update digest.
 *
 * Orchestration only — it owns *who* hears about a market move and *when*:
 *  - change detection lives in `cityMarketChangeService`
 *  - rendering and delivery live in `emailService`
 *  - cadence and the comparison window live in the `CityMarketDigestRun` collection
 *
 * Cadence rules (all configurable, see `config/cityMarketDigest.ts`):
 *  - `monthly`       — the scheduled send; requires `monthlyMinIntervalDays`
 *                      since the previous attempt so a reader never gets two
 *                      digests in one month.
 *  - `source-update` — fires right after a data refresh, but only when a city
 *                      moved at least `significantPriceChangePct` and the last
 *                      digest is at least `sourceUpdateMinIntervalDays` old.
 *                      This is what makes "whenever those sources publish"
 *                      reach the reader without becoming a daily nag.
 *  - `manual`        — admin-triggered; skips the cadence guard, never the
 *                      "is there anything to report" guard.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import SavedSearch from '../models/SavedSearch';
import CityMarketDigestRun, {
  CityMarketDigestReason,
  CityMarketDigestStatus,
  ICityMarketDigestRun,
} from '../models/CityMarketDigestRun';
import {
  CityMarketChange,
  captureCityMarketSnapshots,
  computeCityMarketChanges,
  pruneCityMarketSnapshots,
} from './cityMarketChangeService';
import emailService, {
  CityMarketDigestCity,
  CityMarketDigestSendOutcome,
} from './emailService';
import { getCityMarketDigestConfig, CITY_MARKET_DIGEST_EMAIL_TYPE } from '../config/cityMarketDigest';
import { cronLogger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export interface RunCityMarketDigestOptions {
  reason: CityMarketDigestReason;
  /** Compute and log the digest without sending anything. */
  dryRun?: boolean;
  /** Bypass the cadence guard (admin-triggered runs). Never bypasses validation. */
  force?: boolean;
  /** Capture fresh snapshots before diffing. Off by default — the refresh job captures. */
  captureFirst?: boolean;
  /** Injected clock, so cadence behaviour is testable without waiting. */
  now?: Date;
}

export interface CityMarketDigestResult {
  reason: CityMarketDigestReason;
  status: CityMarketDigestStatus;
  windowStart: Date;
  windowEnd: Date;
  citiesChanged: number;
  significantCities: number;
  recipientsConsidered: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  dryRun: boolean;
  note?: string;
}

interface RecipientRow {
  _id: mongoose.Types.ObjectId;
  email?: string;
  name?: string;
  city?: string;
  country?: string;
}

/** The cities and countries a reader has shown interest in. */
interface RecipientFocus {
  cities: Set<string>;
  countries: Set<string>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// =============================================================================
// Cadence
// =============================================================================

async function findLatestRun(): Promise<ICityMarketDigestRun | null> {
  return CityMarketDigestRun.findOne({}).sort({ startedAt: -1 }).lean<ICityMarketDigestRun | null>();
}

async function findLatestSentRun(): Promise<ICityMarketDigestRun | null> {
  return CityMarketDigestRun
    .findOne({ status: 'sent', dryRun: false })
    .sort({ windowEnd: -1 })
    .lean<ICityMarketDigestRun | null>();
}

/**
 * Minimum days that must have passed since the previous attempt for this reason.
 * `manual` has no minimum: an admin asking for a send has already made that call.
 */
function minIntervalDaysFor(reason: CityMarketDigestReason): number {
  const config = getCityMarketDigestConfig();
  switch (reason) {
    case 'monthly': return config.monthlyMinIntervalDays;
    case 'source-update': return config.sourceUpdateMinIntervalDays;
    case 'manual': return 0;
  }
}

// =============================================================================
// Recipient focus and ranking
// =============================================================================

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Load the focus of a batch of recipients in one query.
 *
 * A saved search's free-text `query` is the closest thing the platform has to
 * "cities this person cares about"; the search's country and the reader's own
 * country give a weaker, country-level signal.
 */
async function loadRecipientFocus(userIds: mongoose.Types.ObjectId[]): Promise<Map<string, RecipientFocus>> {
  const focus = new Map<string, RecipientFocus>();
  if (userIds.length === 0) return focus;

  const ensure = (userId: string): RecipientFocus => {
    const existing = focus.get(userId);
    if (existing) return existing;
    const created: RecipientFocus = { cities: new Set(), countries: new Set() };
    focus.set(userId, created);
    return created;
  };

  try {
    const searches = await SavedSearch
      .find({ userId: { $in: userIds } })
      .select('userId filters.query filters.country')
      .lean<Array<{ userId: mongoose.Types.ObjectId; filters?: { query?: unknown; country?: unknown } }>>();

    for (const search of searches) {
      const entry = ensure(String(search.userId));
      const query = normalise(search.filters?.query);
      const country = normalise(search.filters?.country);
      if (query) entry.cities.add(query);
      if (country) entry.countries.add(country);
    }
  } catch (error) {
    // Personalisation is an enhancement, not a precondition: on failure every
    // reader still receives the region-wide movers.
    cronLogger.warn('⚠️ City digest: could not load saved-search focus, falling back to region-wide ranking', error);
  }

  return focus;
}

function focusOf(user: RecipientRow, batchFocus: Map<string, RecipientFocus>): RecipientFocus {
  const stored = batchFocus.get(String(user._id));
  const cities = new Set(stored?.cities ?? []);
  const countries = new Set(stored?.countries ?? []);

  const ownCity = normalise(user.city);
  const ownCountry = normalise(user.country);
  if (ownCity) cities.add(ownCity);
  if (ownCountry) countries.add(ownCountry);

  return { cities, countries };
}

const FOLLOWED_CITY_BOOST = 1_000_000;
const FOLLOWED_COUNTRY_BOOST = 1_000;

/**
 * Order the changes for one reader: followed cities first, then their country,
 * then the biggest regional movers. Magnitude breaks ties within each band.
 */
export function rankChangesForFocus(
  changes: readonly CityMarketChange[],
  focus: RecipientFocus,
  limit: number,
): Array<{ change: CityMarketChange; isFollowed: boolean }> {
  const scored = changes.map(change => {
    const city = normalise(change.city);
    const country = normalise(change.country);
    const cityFollowed = city !== null && focus.cities.has(city);
    const countryFollowed = country !== null && focus.countries.has(country);

    const score = (cityFollowed ? FOLLOWED_CITY_BOOST : 0)
      + (countryFollowed ? FOLLOWED_COUNTRY_BOOST : 0)
      + change.magnitude;

    return { change, isFollowed: cityFollowed, score };
  });

  scored.sort((a, b) => b.score - a.score || a.change.city.localeCompare(b.change.city));

  return scored
    .slice(0, Math.max(1, limit))
    .map(({ change, isFollowed }) => ({ change, isFollowed }));
}

// =============================================================================
// View model
// =============================================================================

function frontendBaseUrl(): string {
  return process.env.FRONTEND_URL || 'https://balkanestateai.com';
}

function cityExploreUrl(change: CityMarketChange): string {
  return `${frontendBaseUrl()}/explore-cities/`
    + `${encodeURIComponent(change.city)}/${encodeURIComponent(change.country)}`;
}

export function toDigestCity(change: CityMarketChange, isFollowed: boolean): CityMarketDigestCity {
  return {
    city: change.city,
    country: change.country,
    changePct: change.price.changePct,
    previousPricePerSqm: change.price.previous,
    currentPricePerSqm: change.price.current,
    marketTrend: change.marketTrend,
    previousMarketTrend: change.previousMarketTrend,
    trendChanged: change.trendChanged,
    ...(change.rentalYield ? { rentalYieldPct: change.rentalYield.current } : {}),
    ...(change.daysOnMarket ? { daysOnMarket: change.daysOnMarket.current } : {}),
    ...(change.listings ? { listingsCount: change.listings.current } : {}),
    isFollowed,
    exploreUrl: cityExploreUrl(change),
    ...(change.officialSourceName ? { sourceName: change.officialSourceName } : {}),
  };
}

/** e.g. "1 Aug – 2 Sep 2026" */
export function formatPeriodLabel(start: Date, end: Date): string {
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startFormat: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'short', timeZone: 'UTC' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  const endFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };

  const startLabel = new Intl.DateTimeFormat('en-GB', startFormat).format(start);
  const endLabel = new Intl.DateTimeFormat('en-GB', endFormat).format(end);
  return `${startLabel} – ${endLabel}`;
}

// =============================================================================
// Run
// =============================================================================

async function recordRun(
  result: CityMarketDigestResult,
  changes: readonly CityMarketChange[],
  startedAt: Date,
  finishedAt: Date,
): Promise<void> {
  const top = changes[0];
  try {
    await CityMarketDigestRun.create({
      reason: result.reason,
      status: result.status,
      windowStart: result.windowStart,
      windowEnd: result.windowEnd,
      citiesChanged: result.citiesChanged,
      significantCities: result.significantCities,
      ...(top ? { topCity: top.city, topCountry: top.country, topChangePct: top.price.changePct } : {}),
      recipientsConsidered: result.recipientsConsidered,
      emailsSent: result.emailsSent,
      emailsSkipped: result.emailsSkipped,
      emailsFailed: result.emailsFailed,
      dryRun: result.dryRun,
      ...(result.note ? { note: result.note } : {}),
      startedAt,
      finishedAt,
    });
  } catch (error) {
    // A missing audit row must not turn a successful send into a failure, but
    // it does mean the next run's cadence guard is blind — so log it loudly.
    cronLogger.error('❌ Failed to record city market digest run:', error);
  }
}

/**
 * Send the Explore-Cities digest.
 *
 * Never throws for expected conditions (nothing changed, cadence not due, a
 * single recipient's send failing); it returns a result describing what
 * happened and records the same in `CityMarketDigestRun`.
 */
export async function runCityMarketDigest(
  options: RunCityMarketDigestOptions,
): Promise<CityMarketDigestResult> {
  const config = getCityMarketDigestConfig();
  const now = options.now ?? new Date();
  const dryRun = options.dryRun === true;
  const startedAt = new Date();

  const baseResult = (
    status: CityMarketDigestStatus,
    windowStart: Date,
    overrides: Partial<CityMarketDigestResult> = {},
  ): CityMarketDigestResult => ({
    reason: options.reason,
    status,
    windowStart,
    windowEnd: now,
    citiesChanged: 0,
    significantCities: 0,
    recipientsConsidered: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    dryRun,
    ...overrides,
  });

  if (options.captureFirst) {
    await captureCityMarketSnapshots(now);
  }

  const [latestRun, latestSentRun] = await Promise.all([findLatestRun(), findLatestSentRun()]);

  // The comparison window starts where the last delivered digest ended, so a
  // change is reported exactly once. With no history, fall back to the
  // configured lookback rather than "all time".
  const windowStart = latestSentRun?.windowEnd
    ?? new Date(now.getTime() - config.historyLookbackDays * MS_PER_DAY);

  const minIntervalDays = minIntervalDaysFor(options.reason);
  const daysSinceLastAttempt = latestRun
    ? (now.getTime() - new Date(latestRun.startedAt).getTime()) / MS_PER_DAY
    : Number.POSITIVE_INFINITY;

  if (!options.force && daysSinceLastAttempt < minIntervalDays) {
    const note = `Cadence guard: last attempt ${daysSinceLastAttempt.toFixed(1)}d ago, `
      + `${options.reason} requires ${minIntervalDays}d`;
    cronLogger.info(`⏭️ City market digest skipped — ${note}`);
    const result = baseResult('skipped', windowStart, { note });
    await recordRun(result, [], startedAt, new Date());
    return result;
  }

  let changes: CityMarketChange[];
  try {
    changes = await computeCityMarketChanges({ since: windowStart });
  } catch (error) {
    const note = error instanceof Error ? error.message : 'Unknown change-computation error';
    cronLogger.error('❌ City market digest could not compute changes:', error);
    const result = baseResult('failed', windowStart, { note });
    await recordRun(result, [], startedAt, new Date());
    return result;
  }

  const significant = changes.filter(c => c.magnitude >= config.significantPriceChangePct);

  if (changes.length === 0) {
    const note = 'No city moved enough to report';
    cronLogger.info(`⏭️ City market digest skipped — ${note}`);
    const result = baseResult('skipped', windowStart, { note });
    await recordRun(result, changes, startedAt, new Date());
    return result;
  }

  // An out-of-cycle email has to earn its place: only a genuinely large move
  // interrupts the monthly rhythm.
  if (options.reason === 'source-update' && significant.length === 0 && !options.force) {
    const note = `${changes.length} change(s) below the ${config.significantPriceChangePct}% out-of-cycle threshold`;
    cronLogger.info(`⏭️ City market digest skipped — ${note}`);
    const result = baseResult('skipped', windowStart, {
      citiesChanged: changes.length,
      note,
    });
    await recordRun(result, changes, startedAt, new Date());
    return result;
  }

  const periodLabel = formatPeriodLabel(windowStart, now);
  const exploreUrl = `${frontendBaseUrl()}/explore-cities`;

  let recipientsConsidered = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  let emailsFailed = 0;

  let cursor: mongoose.Types.ObjectId | null = null;

  while (recipientsConsidered < config.maxRecipientsPerRun) {
    const query: mongoose.FilterQuery<Record<string, unknown>> = {
      email: { $exists: true, $ne: '' },
      isEmailVerified: true,
      [`emailPreferences.${CITY_MARKET_DIGEST_EMAIL_TYPE}`]: { $ne: false },
      ...(cursor ? { _id: { $gt: cursor } } : {}),
    };

    const remaining = config.maxRecipientsPerRun - recipientsConsidered;
    const batch: RecipientRow[] = await User.find(query)
      .select('_id email name city country')
      .sort({ _id: 1 })
      .limit(Math.min(config.recipientBatchSize, remaining))
      .lean<RecipientRow[]>();

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]._id;

    const batchFocus = await loadRecipientFocus(batch.map(u => u._id));

    for (const user of batch) {
      recipientsConsidered++;

      if (!user.email) {
        emailsSkipped++;
        continue;
      }

      const ranked = rankChangesForFocus(changes, focusOf(user, batchFocus), config.maxCitiesPerEmail);
      const cities = ranked.map(({ change, isFollowed }) => toDigestCity(change, isFollowed));

      if (cities.length === 0) {
        emailsSkipped++;
        continue;
      }

      if (dryRun) {
        emailsSkipped++;
        continue;
      }

      try {
        const outcome: CityMarketDigestSendOutcome = await emailService.sendCityMarketUpdateDigest({
          email: user.email,
          userName: user.name || 'there',
          periodLabel,
          cities,
          exploreUrl,
        });
        if (outcome === 'sent') emailsSent++;
        else emailsSkipped++;
      } catch (error) {
        emailsFailed++;
        cronLogger.error(`❌ City market digest failed for ${user.email}:`, error);
      }
    }
  }

  // A dry run is never 'sent': nothing was delivered, so the changes are still
  // owed to the reader and the comparison window must not move.
  const status: CityMarketDigestStatus = !dryRun && emailsSent > 0 ? 'sent' : 'skipped';
  const note = dryRun
    ? `Dry run — ${changes.length} change(s) for ${recipientsConsidered} recipient(s), nothing sent`
    : emailsSent === 0
      ? 'No recipient received the digest (all unsubscribed, unverified or failed)'
      : undefined;

  const result = baseResult(status, windowStart, {
    citiesChanged: changes.length,
    significantCities: significant.length,
    recipientsConsidered,
    emailsSent,
    emailsSkipped,
    emailsFailed,
    ...(note ? { note } : {}),
  });

  await recordRun(result, changes, startedAt, new Date());

  if (!dryRun && emailsSent > 0) {
    try {
      const pruned = await pruneCityMarketSnapshots(config.snapshotRetentionDays, now);
      if (pruned > 0) cronLogger.info(`🧹 Pruned ${pruned} city market snapshot(s) beyond retention`);
    } catch (error) {
      cronLogger.warn('⚠️ City market snapshot pruning failed:', error);
    }
  }

  cronLogger.info(
    `🌍 City market digest (${options.reason}${dryRun ? ', dry run' : ''}): `
    + `${changes.length} city change(s), ${significant.length} significant, `
    + `${emailsSent} sent, ${emailsSkipped} skipped, ${emailsFailed} failed`,
  );

  return result;
}

/**
 * Read-only preview of the changes the next digest would report.
 * Used by the admin endpoint so a send can be inspected before it goes out.
 */
export async function previewCityMarketDigest(now: Date = new Date()): Promise<{
  windowStart: Date;
  windowEnd: Date;
  periodLabel: string;
  changes: CityMarketChange[];
}> {
  const config = getCityMarketDigestConfig();
  const latestSentRun = await findLatestSentRun();
  const windowStart = latestSentRun?.windowEnd
    ?? new Date(now.getTime() - config.historyLookbackDays * MS_PER_DAY);

  const changes = await computeCityMarketChanges({ since: windowStart });

  return {
    windowStart,
    windowEnd: now,
    periodLabel: formatPeriodLabel(windowStart, now),
    changes,
  };
}
