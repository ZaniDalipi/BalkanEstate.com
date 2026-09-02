/**
 * Explore-Cities change detection.
 *
 * Two responsibilities, both deliberately free of any email or user concern:
 *  1. **Capture** — copy the current `CityMarketData` figures into
 *     `CityMarketSnapshot`, but only when the upstream figures actually changed.
 *  2. **Diff** — turn two snapshots of the same city into a validated
 *     `CityMarketChange` describing what a reader would care about.
 *
 * Both halves are exported as pure functions where possible (`fingerprintMetrics`,
 * `computeDelta`, `diffSnapshots`) so the thresholds can be tested without a
 * database.
 */

import crypto from 'crypto';
import CityMarketData from '../models/CityMarketData';
import CityMarketSnapshot, { ICityMarketSnapshot } from '../models/CityMarketSnapshot';
import { getCityMarketDigestConfig } from '../config/cityMarketDigest';
import { apiLogger } from '../utils/logger';

// =============================================================================
// Types
// =============================================================================

export type MarketTrend = 'rising' | 'stable' | 'declining';

/** The upstream figures that define "the sources published something new". */
export interface CityMarketFingerprintMetrics {
  avgPricePerSqm: number;
  medianPrice: number;
  priceGrowthYoY: number;
  priceGrowthMoM: number;
  rentalYield: number;
  demandScore: number;
  investmentScore: number;
  marketTrend: MarketTrend;
}

/** Everything a snapshot stores, ready to be persisted. */
export interface CityMarketSnapshotInput extends CityMarketFingerprintMetrics {
  city: string;
  country: string;
  countryCode: string;
  averageDaysOnMarket: number;
  listingsCount: number;
  officialSourceName?: string;
  imageUrl?: string;
}

export type ChangeDirection = 'up' | 'down' | 'flat';

export interface MetricDelta {
  previous: number;
  current: number;
  /** Signed percentage change, rounded to one decimal. */
  changePct: number;
  direction: ChangeDirection;
}

export interface CityMarketChange {
  city: string;
  country: string;
  countryCode: string;
  imageUrl?: string;
  officialSourceName?: string;

  /** Headline metric: average price per m². Always present. */
  price: MetricDelta;
  medianPrice: MetricDelta | null;
  rentalYield: MetricDelta | null;
  daysOnMarket: MetricDelta | null;
  listings: MetricDelta | null;

  marketTrend: MarketTrend;
  previousMarketTrend: MarketTrend;
  trendChanged: boolean;

  /** Absolute headline change (%), used for ranking. */
  magnitude: number;

  previousAt: Date;
  observedAt: Date;
}

export interface CaptureSnapshotsResult {
  citiesInspected: number;
  created: number;
  /** Sources published nothing new for these cities. */
  unchanged: number;
  /** Rows dropped because their figures failed validation. */
  invalid: number;
}

// =============================================================================
// Validation helpers
// =============================================================================

const MARKET_TRENDS: readonly MarketTrend[] = ['rising', 'stable', 'declining'];

/** A metric is usable only when it is a finite, non-negative number. */
function isUsableMetric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Growth figures may legitimately be negative, but must still be finite. */
function isUsableSignedMetric(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMarketTrend(value: unknown): value is MarketTrend {
  return typeof value === 'string' && (MARKET_TRENDS as readonly string[]).includes(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// =============================================================================
// Pure computation
// =============================================================================

/**
 * Stable hash of the upstream figures.
 *
 * Values are rounded before hashing so floating-point noise (2400 vs
 * 2400.0000001) is not mistaken for a fresh publication. Platform-derived
 * fields (listing counts, days on market) are deliberately excluded: they move
 * on every listing edit and would make every capture look like new source data.
 */
export function fingerprintMetrics(metrics: CityMarketFingerprintMetrics): string {
  const canonical = [
    Math.round(metrics.avgPricePerSqm),
    Math.round(metrics.medianPrice),
    round1(metrics.priceGrowthYoY),
    round1(metrics.priceGrowthMoM),
    round1(metrics.rentalYield),
    Math.round(metrics.demandScore),
    Math.round(metrics.investmentScore),
    metrics.marketTrend,
  ].join('|');

  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Percentage change between two readings.
 *
 * Returns `null` — never a fabricated number — when the change cannot be
 * expressed as a percentage (missing/invalid reading, a zero baseline) or when
 * it exceeds `maxCredibleChangePct`, which in practice means the upstream feed
 * returned garbage rather than that a market doubled overnight.
 */
export function computeDelta(
  previous: unknown,
  current: unknown,
  maxCredibleChangePct: number,
): MetricDelta | null {
  if (!isUsableMetric(previous) || !isUsableMetric(current)) return null;
  if (previous === 0) return null;

  const changePct = round1(((current - previous) / previous) * 100);
  if (!Number.isFinite(changePct)) return null;
  if (Math.abs(changePct) > maxCredibleChangePct) return null;

  return {
    previous,
    current,
    changePct,
    direction: changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat',
  };
}

/**
 * Turn a snapshot pair into a reportable change, or `null` when there is no
 * story: the price barely moved and the market trend label held steady.
 */
export function diffSnapshots(
  previous: CityMarketSnapshotInput & { capturedAt: Date },
  current: CityMarketSnapshotInput & { capturedAt: Date },
  options: { minPriceChangePct: number; maxCredibleChangePct: number },
): CityMarketChange | null {
  const price = computeDelta(previous.avgPricePerSqm, current.avgPricePerSqm, options.maxCredibleChangePct);
  if (!price) return null;

  const trendChanged = previous.marketTrend !== current.marketTrend;
  const magnitude = Math.abs(price.changePct);

  // A flat market with an unchanged label is not news. A re-labelled market is,
  // even at a small price move — "Tirana is now declining" matters to a reader.
  if (magnitude < options.minPriceChangePct && !trendChanged) return null;

  return {
    city: current.city,
    country: current.country,
    countryCode: current.countryCode,
    ...(current.imageUrl ? { imageUrl: current.imageUrl } : {}),
    ...(current.officialSourceName ? { officialSourceName: current.officialSourceName } : {}),
    price,
    medianPrice: computeDelta(previous.medianPrice, current.medianPrice, options.maxCredibleChangePct),
    rentalYield: computeDelta(previous.rentalYield, current.rentalYield, options.maxCredibleChangePct),
    daysOnMarket: computeDelta(previous.averageDaysOnMarket, current.averageDaysOnMarket, options.maxCredibleChangePct),
    listings: computeDelta(previous.listingsCount, current.listingsCount, options.maxCredibleChangePct),
    marketTrend: current.marketTrend,
    previousMarketTrend: previous.marketTrend,
    trendChanged,
    magnitude,
    previousAt: previous.capturedAt,
    observedAt: current.capturedAt,
  };
}

/**
 * Validate a raw `CityMarketData` row into snapshot input.
 * Returns `null` for rows that cannot be trusted — a missing price or an
 * unknown trend label makes every downstream percentage meaningless.
 */
export function toSnapshotInput(row: unknown): CityMarketSnapshotInput | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;

  if (!isNonEmptyString(r.city) || !isNonEmptyString(r.country) || !isNonEmptyString(r.countryCode)) return null;
  if (!isUsableMetric(r.avgPricePerSqm) || r.avgPricePerSqm === 0) return null;
  if (!isUsableMetric(r.medianPrice)) return null;
  if (!isUsableSignedMetric(r.priceGrowthYoY)) return null;
  if (!isMarketTrend(r.marketTrend)) return null;

  return {
    city: r.city.trim(),
    country: r.country.trim(),
    countryCode: r.countryCode.trim(),
    avgPricePerSqm: r.avgPricePerSqm,
    medianPrice: r.medianPrice,
    priceGrowthYoY: r.priceGrowthYoY,
    priceGrowthMoM: isUsableSignedMetric(r.priceGrowthMoM) ? r.priceGrowthMoM : 0,
    rentalYield: isUsableMetric(r.rentalYield) ? r.rentalYield : 0,
    demandScore: isUsableMetric(r.demandScore) ? Math.min(100, r.demandScore) : 0,
    investmentScore: isUsableMetric(r.investmentScore) ? Math.min(100, r.investmentScore) : 0,
    marketTrend: r.marketTrend,
    averageDaysOnMarket: isUsableMetric(r.averageDaysOnMarket) ? r.averageDaysOnMarket : 0,
    listingsCount: isUsableMetric(r.listingsCount) ? r.listingsCount : 0,
    ...(isNonEmptyString(r.officialSourceName) ? { officialSourceName: r.officialSourceName.trim() } : {}),
    ...(isNonEmptyString(r.imageUrl) ? { imageUrl: r.imageUrl.trim() } : {}),
  };
}

// =============================================================================
// Persistence
// =============================================================================

/**
 * Capture the current market figures for every tracked city.
 *
 * Reads the stored `CityMarketData` rows rather than `getFeaturedCities()`:
 * the stored `avgPricePerSqm` is already the authoritative (BIS / official /
 * research) price written by the refresh job, so this stays a cheap,
 * deterministic read with no outbound calls — and it diffs the same number the
 * Explore-Cities page shows.
 *
 * A city whose fingerprint matches its previous snapshot is left alone, so the
 * snapshot history contains one row per *actual* upstream publication.
 */
export async function captureCityMarketSnapshots(
  capturedAt: Date = new Date(),
): Promise<CaptureSnapshotsResult> {
  const result: CaptureSnapshotsResult = {
    citiesInspected: 0,
    created: 0,
    unchanged: 0,
    invalid: 0,
  };

  const rows = await CityMarketData.find({}).lean();
  result.citiesInspected = rows.length;

  for (const row of rows) {
    const input = toSnapshotInput(row);
    if (!input) {
      result.invalid++;
      apiLogger.warn(
        `⚠️ Skipping city market snapshot for "${String((row as { city?: unknown }).city ?? 'unknown')}" — incomplete market figures`,
      );
      continue;
    }

    try {
      const fingerprint = fingerprintMetrics(input);

      const latest = await CityMarketSnapshot
        .findOne({ city: input.city, country: input.country })
        .sort({ capturedAt: -1 })
        .select('fingerprint')
        .lean<{ fingerprint: string } | null>();

      if (latest?.fingerprint === fingerprint) {
        result.unchanged++;
        continue;
      }

      await CityMarketSnapshot.create({ ...input, fingerprint, capturedAt });
      result.created++;
    } catch (error) {
      result.invalid++;
      apiLogger.error(`❌ Failed to snapshot ${input.city}, ${input.country}:`, error);
    }
  }

  apiLogger.info(
    `📸 City market snapshots: ${result.created} new, ${result.unchanged} unchanged, ${result.invalid} invalid (of ${result.citiesInspected})`,
  );

  return result;
}

type SnapshotAggregate = ICityMarketSnapshot & { capturedAt: Date };

/** Newest snapshot per city, optionally restricted to `capturedAt <= at`. */
async function loadSnapshotsPerCity(at?: Date): Promise<Map<string, SnapshotAggregate>> {
  const match = at ? { capturedAt: { $lte: at } } : {};

  const rows = await CityMarketSnapshot.aggregate<{ _id: unknown; doc: SnapshotAggregate }>([
    { $match: match },
    { $sort: { capturedAt: -1 } },
    {
      $group: {
        _id: { city: '$city', country: '$country' },
        doc: { $first: '$$ROOT' },
      },
    },
  ]);

  const map = new Map<string, SnapshotAggregate>();
  for (const row of rows) {
    if (!row.doc) continue;
    map.set(cityKey(row.doc.city, row.doc.country), row.doc);
  }
  return map;
}

/** Case-insensitive identity of a city across collections. */
export function cityKey(city: string, country: string): string {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

export interface ComputeChangesOptions {
  /** Baseline moment: each city is compared against its newest snapshot at or before this. */
  since: Date;
  minPriceChangePct?: number;
  maxCredibleChangePct?: number;
}

/**
 * Every city whose market moved materially since `since`, biggest mover first.
 *
 * Cities with no baseline snapshot (newly tracked) are skipped rather than
 * reported as a jump from zero, and a city whose newest snapshot predates the
 * window has, by definition, nothing new to say.
 */
export async function computeCityMarketChanges(
  options: ComputeChangesOptions,
): Promise<CityMarketChange[]> {
  const config = getCityMarketDigestConfig();
  const minPriceChangePct = options.minPriceChangePct ?? config.minPriceChangePct;
  const maxCredibleChangePct = options.maxCredibleChangePct ?? config.maxCredibleChangePct;

  const [latest, baseline] = await Promise.all([
    loadSnapshotsPerCity(),
    loadSnapshotsPerCity(options.since),
  ]);

  const changes: CityMarketChange[] = [];

  for (const [key, current] of latest) {
    const previous = baseline.get(key);
    if (!previous) continue;
    if (current.capturedAt.getTime() <= options.since.getTime()) continue;
    if (String(previous._id) === String(current._id)) continue;

    const previousInput = toSnapshotInput(previous);
    const currentInput = toSnapshotInput(current);
    if (!previousInput || !currentInput) continue;

    const change = diffSnapshots(
      { ...previousInput, capturedAt: previous.capturedAt },
      { ...currentInput, capturedAt: current.capturedAt },
      { minPriceChangePct, maxCredibleChangePct },
    );
    if (change) changes.push(change);
  }

  changes.sort((a, b) => b.magnitude - a.magnitude || a.city.localeCompare(b.city));
  return changes;
}

/**
 * Drop snapshots older than the retention window.
 * Returns the number of documents removed.
 */
export async function pruneCityMarketSnapshots(
  olderThanDays: number,
  now: Date = new Date(),
): Promise<number> {
  if (!Number.isFinite(olderThanDays) || olderThanDays <= 0) return 0;

  const cutoff = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000);
  const { deletedCount } = await CityMarketSnapshot.deleteMany({ capturedAt: { $lt: cutoff } });
  return deletedCount ?? 0;
}
