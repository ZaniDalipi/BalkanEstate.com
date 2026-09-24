import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Property from '../models/Property';
import { resolveTotalArea } from '../config/propertyArea';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('BackfillPropertyAreas');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Fill in the total area of listings that only ever stated a breakdown.
 *
 * A flat quoted "79 m² gross, 70 m² net" whose separate total-area box was
 * left blank was stored with `sqft: 0`. The read path now shows the gross
 * area instead of that zero, but search cannot: `minSqft`/`maxSqft`, the area
 * sorts and the price-per-m² filter all run in MongoDB against the stored
 * field, so the flat is missing from "50 m² and up", sorts last by size, and
 * is skipped by price-per-m² entirely. The schema's pre-validate hook fixes
 * this on the next write, which for a listing nobody edits is never.
 *
 * What it touches, and nothing else:
 *   - only documents whose `sqft` is missing, null or 0,
 *   - only where the type's own breakdown gives a real measurement,
 *   - only the `sqft` field.
 *
 * A listing that already states a size keeps it, whatever its breakdown says
 * — this fills blanks, it does not re-measure. The value written is the one
 * the cards and the detail page already show (`resolveTotalArea`: gross before
 * net for a flat, the whole plot before the building for a house or villa), so nothing on
 * screen changes; the listing simply becomes findable. That also makes it
 * re-runnable: a row it fixes stops matching the filter.
 *
 * Written with `updateOne`/`$set` rather than `save()` on purpose. Saving
 * would run the schema's pre-validate hooks over a legacy document and
 * rewrite whatever else they normalise — type attributes, construction
 * fields — which is far more than this is allowed to change.
 *
 * Dry run unless `--apply` is passed:
 *   npm run backfill:areas          # report what would change
 *   npm run backfill:areas:apply    # write it
 */

interface Options {
  /** Write the changes. Without it the script only reports them. */
  apply: boolean;
  /** How many example rows to print. */
  samples: number;
}

const parseOptions = (argv: string[]): Options => {
  const samplesArg = argv.find((arg) => arg.startsWith('--samples='));

  return {
    apply: argv.includes('--apply'),
    samples: samplesArg ? Number(samplesArg.split('=')[1]) : 10,
  };
};

/** How many updates to send per round trip. */
const BATCH_SIZE = 500;

/** A listing that never stated its total: absent, null, or a literal zero. */
const MISSING_TOTAL = {
  $or: [{ sqft: { $exists: false } }, { sqft: null }, { sqft: 0 }],
};

/** ...but did state at least one real measurement of its own. */
const HAS_BREAKDOWN = {
  $or: [
    { grossArea: { $gt: 0 } },
    { netArea: { $gt: 0 } },
    { buildingArea: { $gt: 0 } },
    { landArea: { $gt: 0 } },
    { openPlanArea: { $gt: 0 } },
  ],
};

export const CANDIDATE_FILTER = { $and: [MISSING_TOTAL, HAS_BREAKDOWN] };

interface Change {
  id: string;
  propertyType: string;
  sqft: number;
}

export async function backfillPropertyAreas(options: Options): Promise<void> {
  log.info(`🌍 Environment: ${env.toUpperCase()}`);
  log.info(options.apply ? '✍️  APPLY — changes will be written' : '🔍 DRY RUN — nothing will be written');

  await mongoose.connect(MONGODB_URI);
  log.info('✅ Connected to MongoDB');

  const byType: Record<string, number> = {};
  const changes: Change[] = [];
  // Types with no breakdown of their own (land, parking) can still match the
  // filter — a plot may carry a landArea the type table does not describe it
  // by — and resolve to nothing. Counted and left alone, never guessed at.
  let unresolved = 0;
  /** Already stated a size, so not this migration's business. */
  let stated = 0;
  let written = 0;
  let operations: Parameters<typeof Property.bulkWrite>[0] = [];

  const flush = async () => {
    if (operations.length === 0) return;
    if (options.apply) {
      const result = await Property.bulkWrite(operations);
      written += result.modifiedCount;
    }
    operations = [];
  };

  const cursor = Property.find(CANDIDATE_FILTER)
    .select('_id propertyType sqft grossArea netArea buildingArea landArea openPlanArea')
    .lean()
    .cursor();

  for await (const doc of cursor) {
    // The filter already excludes these, but the guarantee belongs in the
    // code that writes rather than only in the query that feeds it: a row
    // that states a size is never re-measured, and never written at all —
    // even `$set`ting the value it already has would bump `updatedAt` on a
    // listing this has no business touching.
    if (typeof doc.sqft === 'number' && doc.sqft > 0) {
      stated += 1;
      continue;
    }

    const sqft = resolveTotalArea(doc.propertyType, doc);

    if (!(sqft > 0)) {
      unresolved += 1;
      continue;
    }

    byType[doc.propertyType] = (byType[doc.propertyType] ?? 0) + 1;
    changes.push({ id: String(doc._id), propertyType: doc.propertyType, sqft });

    operations.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { sqft } } } });
    if (operations.length >= BATCH_SIZE) await flush();
  }

  await flush();

  log.info(`📊 ${changes.length} listing(s) with a breakdown but no stated size`);

  if (changes.length === 0 && unresolved === 0) {
    log.info('✨ Nothing to do — every listing with a breakdown already states its size.');
  }

  if (changes.length > 0) {
    log.info('📋 By type:');
    for (const [propertyType, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
      log.info(`   ${propertyType.padEnd(14)} ${count}`);
    }
  }

  if (changes.length > 0 && options.samples > 0) {
    log.info(`First ${Math.min(options.samples, changes.length)} changes:`);
    for (const change of changes.slice(0, options.samples)) {
      log.info(`   ${change.id}  ${change.propertyType.padEnd(14)} 0 → ${change.sqft} m²`);
    }
  }

  if (unresolved > 0) {
    log.warn(`⚠️  ${unresolved} listing(s) left alone — their type is not described by the area they carry`);
  }

  if (stated > 0) {
    log.info(`↩️  ${stated} listing(s) left alone — they already state a size`);
  }

  if (options.apply) {
    log.info(`🎉 Backfilled ${written} listing(s)`);
  } else if (changes.length > 0) {
    log.info('Nothing was written. Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
  log.info('👋 Disconnected');
}

if (require.main === module) {
  backfillPropertyAreas(parseOptions(process.argv.slice(2)))
    .then(() => process.exit(0))
    .catch((error) => {
      log.error('Backfill failed:', error);
      process.exit(1);
    });
}
