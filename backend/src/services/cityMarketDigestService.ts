/**
 * Explore-Cities market update digest.
 *
 * Orchestration only — it owns *who* hears about a market move and *when*:
 *  - change detection lives in `cityMarketChangeService`
 *  - rendering and delivery live in `emailService`
 *  - follows live in `savedCityService`
 *  - cadence and the comparison window live in the `CityMarketDigestRun` collection
 *
 * Two audiences, so following a city means something:
 *  - `all`          — every opted-in reader. Their saved cities lead the email,
 *                     then the biggest regional movers fill the remaining slots.
 *  - `saved-cities` — only readers following a city that moved, and only their
 *                     cities. This is how a follower hears about *their* market
 *                     between monthly sends without the whole list getting mail.
 *
 * Cadence (configurable, see `config/cityMarketDigest.ts`) counts *delivered*
 * runs only — a run that emailed nobody must not block the next one:
 *  - `monthly`       — needs `monthlyMinIntervalDays` since the last delivered
 *                      `all` run.
 *  - `source-update` — fires after a data refresh, `sourceUpdateMinIntervalDays`
 *                      since any delivered run. A move of at least
 *                      `significantPriceChangePct` goes to everyone; anything
 *                      smaller goes only to the cities' followers.
 *  - `manual`        — admin-triggered; skips the cadence guard, never the
 *                      "is there anything to report" guard.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import SavedSearch from '../models/SavedSearch';
import CityMarketDigestRun, {
  CityMarketDigestAudience,
  CityMarketDigestReason,
  CityMarketDigestStatus,
  ICityMarketDigestRun,
} from '../models/CityMarketDigestRun';
import {
  CityMarketChange,
  captureCityMarketSnapshots,
  cityKey,
  computeCityMarketChanges,
  pruneCityMarketSnapshots,
} from './cityMarketChangeService';
import { loadSavedCityKeysForUsers, findUserIdsFollowingCities } from './savedCityService';
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
  audience: CityMarketDigestAudience;
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
  cityMarketDigestSentAt?: Date;
}

/**
 * What a reader has told us they care about.
 * `savedCities` is an explicit follow; the rest is inferred and ranks lower.
 */
export interface RecipientFocus {
  savedCities: Set<string>;
  searchCities: Set<string>;
  countries: Set<string>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const emptyFocus = (): RecipientFocus => ({
  savedCities: new Set(),
  searchCities: new Set(),
  countries: new Set(),
});

// =============================================================================
// Cadence
// =============================================================================

/**
 * The most recent run that actually delivered mail.
 *
 * Cadence must ignore skipped and dry runs: a source-update run that found
 * nothing significant emailed nobody, and letting it block the monthly digest
 * would mean the monthly never sends.
 */
async function findLatestDeliveredRun(
  audience?: CityMarketDigestAudience,
): Promise<ICityMarketDigestRun | null> {
  return CityMarketDigestRun
    .findOne({ status: 'sent', dryRun: false, ...(audience ? { audience } : {}) })
    .sort({ startedAt: -1 })
    .lean<ICityMarketDigestRun | null>();
}

/** Baseline for the next diff: where the last whole-audience send ended. */
async function findWindowAnchorRun(): Promise<ICityMarketDigestRun | null> {
  return CityMarketDigestRun
    .findOne({ status: 'sent', dryRun: false, audience: 'all' })
    .sort({ windowEnd: -1 })
    .lean<ICityMarketDigestRun | null>();
}

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
 * Load what a batch of readers care about, in two queries for the whole batch.
 *
 * Saved cities are the explicit signal. A saved search's free-text `query` and
 * country are a weaker inference kept for readers who never pressed Follow.
 */
async function loadRecipientFocus(
  userIds: mongoose.Types.ObjectId[],
): Promise<Map<string, RecipientFocus>> {
  const focus = new Map<string, RecipientFocus>();
  if (userIds.length === 0) return focus;

  const ensure = (userId: string): RecipientFocus => {
    const existing = focus.get(userId);
    if (existing) return existing;
    const created = emptyFocus();
    focus.set(userId, created);
    return created;
  };

  try {
    const savedByUser = await loadSavedCityKeysForUsers(userIds);
    for (const [userId, keys] of savedByUser) {
      const entry = ensure(userId);
      for (const key of keys) entry.savedCities.add(key);
    }
  } catch (error) {
    // Losing follows would silently downgrade a follower to the generic
    // roundup, so this is an error rather than a shrug.
    cronLogger.error('❌ City digest: could not load saved cities', error);
  }

  try {
    const searches = await SavedSearch
      .find({ userId: { $in: userIds } })
      .select('userId filters.query filters.country')
      .lean<Array<{ userId: mongoose.Types.ObjectId; filters?: { query?: unknown; country?: unknown } }>>();

    for (const search of searches) {
      const entry = ensure(String(search.userId));
      const query = normalise(search.filters?.query);
      const country = normalise(search.filters?.country);
      if (query) entry.searchCities.add(query);
      if (country) entry.countries.add(country);
    }
  } catch (error) {
    // Personalisation is an enhancement, not a precondition: on failure every
    // reader still receives the region-wide movers.
    cronLogger.warn('⚠️ City digest: could not load saved-search focus, falling back to region-wide ranking', error);
  }

  return focus;
}

/** A saved search stores a city name, not a key; match on the city half. */
function focusOf(user: RecipientRow, batchFocus: Map<string, RecipientFocus>): RecipientFocus {
  const stored = batchFocus.get(String(user._id));
  const focus: RecipientFocus = {
    savedCities: new Set(stored?.savedCities ?? []),
    searchCities: new Set(stored?.searchCities ?? []),
    countries: new Set(stored?.countries ?? []),
  };

  const ownCity = normalise(user.city);
  const ownCountry = normalise(user.country);
  if (ownCity) focus.searchCities.add(ownCity);
  if (ownCountry) focus.countries.add(ownCountry);

  return focus;
}

const SAVED_CITY_BOOST = 1_000_000_000;
const SEARCH_CITY_BOOST = 1_000_000;
const FOLLOWED_COUNTRY_BOOST = 1_000;

/**
 * Order the changes for one reader: cities they follow first, then cities they
 * search for, then their country, then the biggest regional movers. Magnitude
 * breaks ties within each band.
 */
export function rankChangesForFocus(
  changes: readonly CityMarketChange[],
  focus: RecipientFocus,
  limit: number,
): Array<{ change: CityMarketChange; isFollowed: boolean }> {
  const scored = changes.map(change => {
    const key = cityKey(change.city, change.country);
    const city = normalise(change.city);
    const country = normalise(change.country);

    const saved = focus.savedCities.has(key);
    const searched = city !== null && focus.searchCities.has(city);
    const countryFollowed = country !== null && focus.countries.has(country);

    const score = (saved ? SAVED_CITY_BOOST : 0)
      + (searched ? SEARCH_CITY_BOOST : 0)
      + (countryFollowed ? FOLLOWED_COUNTRY_BOOST : 0)
      + change.magnitude;

    return { change, isFollowed: saved || searched, score };
  });

  scored.sort((a, b) => b.score - a.score || a.change.city.localeCompare(b.change.city));

  return scored
    .slice(0, Math.max(1, limit))
    .map(({ change, isFollowed }) => ({ change, isFollowed }));
}

/**
 * The changes one reader should see in this run.
 *
 * Three filters, in order: what they have not already been emailed
 * (`watermark`), what this audience covers, and how many cities fit.
 */
export function changesForRecipient(
  changes: readonly CityMarketChange[],
  focus: RecipientFocus,
  options: { audience: CityMarketDigestAudience; limit: number; watermark?: Date },
): Array<{ change: CityMarketChange; isFollowed: boolean }> {
  const since = options.watermark ? options.watermark.getTime() : 0;
  const unseen = changes.filter(change => change.observedAt.getTime() > since);

  const pool = options.audience === 'saved-cities'
    ? unseen.filter(change => focus.savedCities.has(cityKey(change.city, change.country)))
    : unseen;

  if (pool.length === 0) return [];
  return rankChangesForFocus(pool, focus, options.limit);
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
      audience: result.audience,
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

/** Move each emailed reader's watermark forward so they never see a change twice. */
async function markRecipientsEmailed(
  userIds: mongoose.Types.ObjectId[],
  sentAt: Date,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { cityMarketDigestSentAt: sentAt } },
    );
  } catch (error) {
    // Worst case the reader sees one repeated city next time — far better than
    // failing the run after the mail has already gone out.
    cronLogger.error('❌ Failed to advance city digest watermarks:', error);
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
    audience: CityMarketDigestAudience,
    windowStart: Date,
    overrides: Partial<CityMarketDigestResult> = {},
  ): CityMarketDigestResult => ({
    reason: options.reason,
    status,
    audience,
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

  const [lastDelivered, windowAnchor] = await Promise.all([
    findLatestDeliveredRun(options.reason === 'monthly' ? 'all' : undefined),
    findWindowAnchorRun(),
  ]);

  // The comparison window starts where the last whole-audience digest ended, so
  // a change is reported to everyone exactly once. With no history, fall back
  // to the configured lookback rather than "all time".
  const windowStart = windowAnchor?.windowEnd
    ?? new Date(now.getTime() - config.historyLookbackDays * MS_PER_DAY);

  const minIntervalDays = minIntervalDaysFor(options.reason);
  const daysSinceDelivered = lastDelivered
    ? (now.getTime() - new Date(lastDelivered.startedAt).getTime()) / MS_PER_DAY
    : Number.POSITIVE_INFINITY;

  if (!options.force && daysSinceDelivered < minIntervalDays) {
    const note = `Cadence guard: last delivered digest ${daysSinceDelivered.toFixed(1)}d ago, `
      + `${options.reason} requires ${minIntervalDays}d`;
    cronLogger.info(`⏭️ City market digest skipped — ${note}`);
    const result = baseResult('skipped', 'all', windowStart, { note });
    await recordRun(result, [], startedAt, new Date());
    return result;
  }

  let changes: CityMarketChange[];
  try {
    changes = await computeCityMarketChanges({ since: windowStart });
  } catch (error) {
    const note = error instanceof Error ? error.message : 'Unknown change-computation error';
    cronLogger.error('❌ City market digest could not compute changes:', error);
    const result = baseResult('failed', 'all', windowStart, { note });
    await recordRun(result, [], startedAt, new Date());
    return result;
  }

  const significant = changes.filter(c => c.magnitude >= config.significantPriceChangePct);

  // A move big enough to interrupt the monthly rhythm goes to everyone; a
  // smaller one still reaches the readers who follow that city.
  const audience: CityMarketDigestAudience =
    options.reason === 'source-update' && significant.length === 0 && !options.force
      ? 'saved-cities'
      : 'all';

  if (changes.length === 0) {
    const note = 'No city moved enough to report';
    cronLogger.info(`⏭️ City market digest skipped — ${note}`);
    const result = baseResult('skipped', audience, windowStart, { note });
    await recordRun(result, changes, startedAt, new Date());
    return result;
  }

  const changedCityKeys = changes.map(c => cityKey(c.city, c.country));

  // In saved-cities mode the audience is exactly the followers of a changed
  // city — resolved up front so the run does not walk the whole user table.
  let followerIds: string[] | null = null;
  if (audience === 'saved-cities') {
    followerIds = await findUserIdsFollowingCities(changedCityKeys);
    if (followerIds.length === 0) {
      const note = `${changes.length} change(s) below the ${config.significantPriceChangePct}% `
        + 'whole-audience threshold, and nobody follows the cities that moved';
      cronLogger.info(`⏭️ City market digest skipped — ${note}`);
      const result = baseResult('skipped', audience, windowStart, {
        citiesChanged: changes.length,
        note,
      });
      await recordRun(result, changes, startedAt, new Date());
      return result;
    }
  }

  const periodLabel = formatPeriodLabel(windowStart, now);
  const exploreUrl = `${frontendBaseUrl()}/explore-cities`;

  let recipientsConsidered = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  let emailsFailed = 0;

  let cursor: mongoose.Types.ObjectId | null = null;

  while (recipientsConsidered < config.maxRecipientsPerRun) {
    const idFilter: Record<string, unknown> = {
      ...(followerIds ? { $in: followerIds } : {}),
      ...(cursor ? { $gt: cursor } : {}),
    };

    const query: mongoose.FilterQuery<Record<string, unknown>> = {
      email: { $exists: true, $ne: '' },
      isEmailVerified: true,
      [`emailPreferences.${CITY_MARKET_DIGEST_EMAIL_TYPE}`]: { $ne: false },
      ...(Object.keys(idFilter).length > 0 ? { _id: idFilter } : {}),
    };

    const remaining = config.maxRecipientsPerRun - recipientsConsidered;
    const batch: RecipientRow[] = await User.find(query)
      .select('_id email name city country cityMarketDigestSentAt')
      .sort({ _id: 1 })
      .limit(Math.min(config.recipientBatchSize, remaining))
      .lean<RecipientRow[]>();

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1]._id;

    const batchFocus = await loadRecipientFocus(batch.map(u => u._id));
    const emailed: mongoose.Types.ObjectId[] = [];

    for (const user of batch) {
      recipientsConsidered++;

      if (!user.email) {
        emailsSkipped++;
        continue;
      }

      const selected = changesForRecipient(changes, focusOf(user, batchFocus), {
        audience,
        limit: config.maxCitiesPerEmail,
        ...(user.cityMarketDigestSentAt ? { watermark: user.cityMarketDigestSentAt } : {}),
      });

      if (selected.length === 0) {
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
          cities: selected.map(({ change, isFollowed }) => toDigestCity(change, isFollowed)),
          exploreUrl,
        });
        if (outcome === 'sent') {
          emailsSent++;
          emailed.push(user._id);
        } else {
          emailsSkipped++;
        }
      } catch (error) {
        emailsFailed++;
        cronLogger.error(`❌ City market digest failed for ${user.email}:`, error);
      }
    }

    await markRecipientsEmailed(emailed, now);
  }

  // A dry run is never 'sent': nothing was delivered, so the changes are still
  // owed to the reader and the comparison window must not move.
  const status: CityMarketDigestStatus = !dryRun && emailsSent > 0 ? 'sent' : 'skipped';
  const note = dryRun
    ? `Dry run — ${changes.length} change(s) for ${recipientsConsidered} recipient(s), nothing sent`
    : emailsSent === 0
      ? 'No recipient received the digest (all unsubscribed, unverified, already told or failed)'
      : undefined;

  const result = baseResult(status, audience, windowStart, {
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
    `🌍 City market digest (${options.reason} → ${audience}${dryRun ? ', dry run' : ''}): `
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
  const windowAnchor = await findWindowAnchorRun();
  const windowStart = windowAnchor?.windowEnd
    ?? new Date(now.getTime() - config.historyLookbackDays * MS_PER_DAY);

  const changes = await computeCityMarketChanges({ since: windowStart });

  return {
    windowStart,
    windowEnd: now,
    periodLabel: formatPeriodLabel(windowStart, now),
    changes,
  };
}
