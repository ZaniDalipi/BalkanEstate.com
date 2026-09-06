import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Property from '../models/Property';
import { scriptLogger } from '../utils/logger';
import { createAddressFormatter } from '../services/placeAddress';

const log = scriptLogger.child('MigratePropertyAddresses');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Rewrite stored listing addresses into the app's one address shape:
 *
 *     <place>, <city>, <country>
 *     Knez Mihailova 42, Belgrade, Serbia
 *     Himarë, Vlorë, Albania
 *
 * Listings created before that shape existed carry two kinds of address: a
 * bare street line the seller typed, and whole geocoder strings the old
 * picker saved, complete with postcode and county. The screen already
 * normalises what it shows, but the stored value is what emails, exports,
 * the API and search indexes carry, so it is worth fixing at the source.
 *
 * The city and country are the listing's own — they are what it is filed
 * under and what its map pin agrees with — so no geocoding happens here and
 * the migration never moves a listing.
 *
 * Safe by construction:
 *   - a dry run unless `--apply` is passed, printing what it would change;
 *   - idempotent, because a correctly shaped address rewrites to itself, so
 *     it can be run again after a partial run without harm;
 *   - it only ever writes `address`, and only when the value actually differs.
 *
 *   npm run migrate:property-addresses            # dry run
 *   npm run migrate:property-addresses -- --apply
 */

interface Options {
  apply: boolean;
  limit?: number;
  /** How many before/after pairs to print. */
  samples: number;
}

const parseOptions = (argv: string[]): Options => {
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const samplesArg = argv.find((arg) => arg.startsWith('--samples='));

  return {
    apply: argv.includes('--apply'),
    limit: limitArg ? Number(limitArg.split('=')[1]) : undefined,
    samples: samplesArg ? Number(samplesArg.split('=')[1]) : 20,
  };
};

/** One listing's address, before and after. */
interface Change {
  id: string;
  from: string;
  to: string;
}

export async function migratePropertyAddresses(options: Options): Promise<void> {
  const formatter = createAddressFormatter();

  log.info(`🌍 Environment: ${env.toUpperCase()}`);
  log.info(options.apply ? '✍️  APPLY — addresses will be written' : '🔍 DRY RUN — nothing will be written');

  await mongoose.connect(MONGODB_URI);
  log.info('✅ Connected to MongoDB');

  const changes: Change[] = [];
  let scanned = 0;
  let unchanged = 0;
  let skipped = 0;
  let written = 0;

  // Streamed rather than loaded: this runs over the whole collection, and a
  // find().lean() of it would sit in memory for the length of the migration.
  const cursor = Property.find({}, { address: 1, city: 1, country: 1 })
    .limit(options.limit ?? 0)
    .lean()
    .cursor();

  // Batched so a large collection is a few hundred round trips, not one per
  // listing.
  let batch: Parameters<typeof Property.bulkWrite>[0] = [];

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return;
    if (options.apply) {
      const result = await Property.bulkWrite(batch);
      written += result.modifiedCount ?? 0;
    }
    batch = [];
  };

  for await (const property of cursor) {
    scanned += 1;

    const city = (property.city ?? '').trim();
    const country = (property.country ?? '').trim();

    // Without a city or a country there is no shape to write the address in,
    // and guessing one from the address itself is how a listing ends up filed
    // in the wrong place. Left exactly as it is, and reported.
    if (!city || !country) {
      skipped += 1;
      continue;
    }

    const from = (property.address ?? '').trim();
    const to = formatter.format({ address: from, city, country });

    if (!to || to === from) {
      unchanged += 1;
      continue;
    }

    changes.push({ id: String(property._id), from, to });
    batch.push({
      updateOne: { filter: { _id: property._id }, update: { $set: { address: to } } },
    });

    if (batch.length >= 500) await flush();
  }

  await flush();

  log.info('');
  log.info('─'.repeat(64));
  log.info(`Scanned:    ${scanned}`);
  log.info(`To rewrite: ${changes.length}`);
  log.info(`Unchanged:  ${unchanged} (already in shape)`);
  log.info(`Skipped:    ${skipped} (no city or no country on the listing)`);
  if (options.apply) log.info(`Written:    ${written}`);
  log.info('─'.repeat(64));

  if (changes.length > 0 && options.samples > 0) {
    log.info(`First ${Math.min(options.samples, changes.length)} changes:`);
    for (const change of changes.slice(0, options.samples)) {
      log.info(`  ${change.from || '(empty)'}`);
      log.info(`    → ${change.to}`);
    }
  }

  if (!options.apply && changes.length > 0) {
    log.info('');
    log.info('Nothing was written. Re-run with --apply to write these changes.');
  }

  await mongoose.disconnect();
  log.info('👋 Disconnected');
}

if (require.main === module) {
  migratePropertyAddresses(parseOptions(process.argv.slice(2)))
    .then(() => process.exit(0))
    .catch((error) => {
      log.error('Migration failed:', error);
      process.exit(1);
    });
}
