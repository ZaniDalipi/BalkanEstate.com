/**
 * Configuration for the Explore-Cities market update digest.
 *
 * Every value is env-overridable but validated: a malformed override falls back
 * to the documented default instead of poisoning the job with NaN. Thresholds
 * live here (and not inside the services) so the cadence of a *user-facing
 * email* is a deliberate, reviewable decision rather than a scattered literal.
 */

export interface CityMarketDigestConfig {
  /** A city is only "news" when its avg price/m² moved at least this much (%). */
  minPriceChangePct: number;
  /** A move this large (%) justifies an out-of-cycle email between monthly runs. */
  significantPriceChangePct: number;
  /** Absolute cap on a reported change (%) — guards against corrupt upstream data. */
  maxCredibleChangePct: number;
  /** How many city cards a single email may carry. */
  maxCitiesPerEmail: number;
  /** Minimum days between the monthly digest and any previous digest attempt. */
  monthlyMinIntervalDays: number;
  /** Minimum days before a source-triggered digest may follow another digest. */
  sourceUpdateMinIntervalDays: number;
  /** Comparison window used when no previous digest run has been recorded. */
  historyLookbackDays: number;
  /** Safety valve: never email more recipients than this in one run. */
  maxRecipientsPerRun: number;
  /** Recipients loaded (and emailed) per database page. */
  recipientBatchSize: number;
  /** Snapshots older than this are pruned after a successful run. */
  snapshotRetentionDays: number;
}

const DEFAULTS: CityMarketDigestConfig = {
  minPriceChangePct: 1.5,
  significantPriceChangePct: 5,
  maxCredibleChangePct: 200,
  maxCitiesPerEmail: 6,
  monthlyMinIntervalDays: 25,
  sourceUpdateMinIntervalDays: 7,
  historyLookbackDays: 45,
  maxRecipientsPerRun: 20000,
  recipientBatchSize: 200,
  snapshotRetentionDays: 730,
};

/**
 * Read a strictly positive number from the environment.
 * Anything unparseable, negative or non-finite is ignored in favour of the default.
 */
function positiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

/**
 * Read a strictly positive integer from the environment.
 */
function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = positiveNumber(raw, fallback);
  return Math.max(1, Math.floor(parsed));
}

/**
 * Build the effective config from the current environment.
 *
 * Read at call time (not module load) so tests and admin-triggered runs observe
 * env changes without re-importing the module.
 */
export function getCityMarketDigestConfig(): CityMarketDigestConfig {
  const minPriceChangePct = positiveNumber(
    process.env.CITY_DIGEST_MIN_CHANGE_PCT,
    DEFAULTS.minPriceChangePct,
  );
  const significantPriceChangePct = positiveNumber(
    process.env.CITY_DIGEST_SIGNIFICANT_CHANGE_PCT,
    DEFAULTS.significantPriceChangePct,
  );

  return {
    minPriceChangePct,
    // "Significant" must never be looser than "material", or an out-of-cycle
    // email could fire for a change the monthly digest would not even mention.
    significantPriceChangePct: Math.max(minPriceChangePct, significantPriceChangePct),
    maxCredibleChangePct: positiveNumber(
      process.env.CITY_DIGEST_MAX_CREDIBLE_CHANGE_PCT,
      DEFAULTS.maxCredibleChangePct,
    ),
    maxCitiesPerEmail: positiveInteger(
      process.env.CITY_DIGEST_MAX_CITIES,
      DEFAULTS.maxCitiesPerEmail,
    ),
    monthlyMinIntervalDays: positiveNumber(
      process.env.CITY_DIGEST_MONTHLY_MIN_INTERVAL_DAYS,
      DEFAULTS.monthlyMinIntervalDays,
    ),
    sourceUpdateMinIntervalDays: positiveNumber(
      process.env.CITY_DIGEST_SOURCE_MIN_INTERVAL_DAYS,
      DEFAULTS.sourceUpdateMinIntervalDays,
    ),
    historyLookbackDays: positiveNumber(
      process.env.CITY_DIGEST_HISTORY_LOOKBACK_DAYS,
      DEFAULTS.historyLookbackDays,
    ),
    maxRecipientsPerRun: positiveInteger(
      process.env.CITY_DIGEST_MAX_RECIPIENTS,
      DEFAULTS.maxRecipientsPerRun,
    ),
    recipientBatchSize: positiveInteger(
      process.env.CITY_DIGEST_RECIPIENT_BATCH_SIZE,
      DEFAULTS.recipientBatchSize,
    ),
    snapshotRetentionDays: positiveNumber(
      process.env.CITY_DIGEST_SNAPSHOT_RETENTION_DAYS,
      DEFAULTS.snapshotRetentionDays,
    ),
  };
}

export const CITY_MARKET_DIGEST_DEFAULTS: Readonly<CityMarketDigestConfig> = Object.freeze({ ...DEFAULTS });

/** Email-preference key and unsubscribe `type` for this digest. */
export const CITY_MARKET_DIGEST_EMAIL_TYPE = 'cityMarketUpdates' as const;
