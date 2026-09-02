import mongoose, { Document, Schema } from 'mongoose';

export type CityMarketDigestReason = 'monthly' | 'source-update' | 'manual';

/**
 * `sent`    — recipients were emailed; `windowEnd` becomes the next comparison baseline.
 * `skipped` — nothing to report or the cadence guard blocked the run.
 * `failed`  — the run aborted before it could finish.
 */
export type CityMarketDigestStatus = 'sent' | 'skipped' | 'failed';

/**
 * `all`          — every opted-in reader; this is the run that advances the
 *                  comparison window, because everyone has now been told.
 * `saved-cities` — only readers following a city that moved. Used between
 *                  monthly sends, so a follower hears about *their* city
 *                  without the whole audience getting an extra email. It does
 *                  not advance the window: the rest of the audience is still
 *                  owed those changes.
 */
export type CityMarketDigestAudience = 'all' | 'saved-cities';

/**
 * One execution of the Explore-Cities digest.
 *
 * This collection is the single source of truth for two things, so the job
 * itself stays stateless:
 *  - **cadence** — the newest run of any status says how long ago we last tried,
 *    which is what stops a monthly email from going out twice.
 *  - **comparison window** — the newest `sent` run's `windowEnd` is where the
 *    next diff starts, so a change is never reported twice and a skipped run
 *    never silently swallows changes that accumulated in its window.
 */
export interface ICityMarketDigestRun extends Document {
  reason: CityMarketDigestReason;
  status: CityMarketDigestStatus;
  audience: CityMarketDigestAudience;

  /** Inclusive start of the compared period (baseline snapshots at or before it). */
  windowStart: Date;
  /** End of the compared period — the next `sent` run starts here. */
  windowEnd: Date;

  citiesChanged: number;
  /** Cities whose move cleared the "significant" threshold. */
  significantCities: number;
  topCity?: string;
  topCountry?: string;
  topChangePct?: number;

  recipientsConsidered: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;

  dryRun: boolean;
  /** Why a `skipped` run did nothing, or the error summary of a `failed` one. */
  note?: string;

  startedAt: Date;
  finishedAt: Date;
}

const CityMarketDigestRunSchema = new Schema<ICityMarketDigestRun>({
  reason: {
    type: String,
    enum: ['monthly', 'source-update', 'manual'],
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'skipped', 'failed'],
    required: true,
  },
  audience: {
    type: String,
    enum: ['all', 'saved-cities'],
    required: true,
    default: 'all',
  },

  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },

  citiesChanged: { type: Number, required: true, default: 0, min: 0 },
  significantCities: { type: Number, required: true, default: 0, min: 0 },
  topCity: { type: String },
  topCountry: { type: String },
  topChangePct: { type: Number },

  recipientsConsidered: { type: Number, required: true, default: 0, min: 0 },
  emailsSent: { type: Number, required: true, default: 0, min: 0 },
  emailsSkipped: { type: Number, required: true, default: 0, min: 0 },
  emailsFailed: { type: Number, required: true, default: 0, min: 0 },

  dryRun: { type: Boolean, required: true, default: false },
  note: { type: String },

  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, required: true },
}, {
  timestamps: true,
});

// Cadence lookup ("newest delivered run", optionally per audience) and window
// lookup ("newest delivered run for the whole audience").
CityMarketDigestRunSchema.index({ startedAt: -1 });
CityMarketDigestRunSchema.index({ status: 1, dryRun: 1, startedAt: -1 });
CityMarketDigestRunSchema.index({ status: 1, audience: 1, windowEnd: -1 });

const CityMarketDigestRun = mongoose.model<ICityMarketDigestRun>(
  'CityMarketDigestRun',
  CityMarketDigestRunSchema,
);

export default CityMarketDigestRun;
