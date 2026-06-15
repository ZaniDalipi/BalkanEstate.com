import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import { CITY_TO_COUNTRY_MAP } from '../services/locationLookup';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('BackfillPropertyLocations');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Backfill required location fields (address, city, country) on properties that
 * were stored without them.
 *
 * Why this is needed:
 *   Scraped listings are persisted via `Property.findOneAndUpdate(..., { upsert: true })`
 *   which does NOT run Mongoose validators. Before the normalizer was hardened,
 *   listings missing address/city/country were silently stored as broken
 *   documents. Reading them used to 500 (the GET handler called `.save()`), and
 *   any future `.save()` (e.g. the owner editing the listing) still throws
 *   "Path `address`/`city`/`country` is required".
 *
 * Strategy (mirrors listingNormalizerService):
 *   - country: infer from city via CITY_TO_COUNTRY_MAP, else 'Unknown'
 *   - city:    keep existing, else fall back to country, else 'Unknown'
 *   - address: keep existing, else city → country → 'Unknown'
 *
 * Uses updateOne with $set so we only touch the location fields and don't trip
 * validation on any other field that might also be missing on legacy documents.
 */
async function backfillPropertyLocations() {
  log.info('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  log.info('✅ Connected to MongoDB');

  const broken = await Property.find({
    $or: [
      { address: { $in: [null, ''] } },
      { address: { $exists: false } },
      { city: { $in: [null, ''] } },
      { city: { $exists: false } },
      { country: { $in: [null, ''] } },
      { country: { $exists: false } },
    ],
  }).select('_id address city country').lean();

  log.info(`\n📊 Found ${broken.length} properties with missing location fields`);

  if (broken.length === 0) {
    log.info('✨ Nothing to backfill. All properties have address/city/country.');
    await mongoose.disconnect();
    return;
  }

  let fixed = 0;
  let errors = 0;

  for (const p of broken) {
    try {
      let city = (p.city || '').toString().trim();
      let country = (p.country || '').toString().trim();
      let address = (p.address || '').toString().trim();

      // Infer country from city when missing
      if (!country && city) {
        const slug = city.toLowerCase().replace(/[-\s]/g, '');
        country = CITY_TO_COUNTRY_MAP[slug] ?? CITY_TO_COUNTRY_MAP[city.toLowerCase()] ?? '';
      }

      if (!city) city = country || 'Unknown';
      if (!country) country = 'Unknown';
      if (!address) address = city || country || 'Unknown';

      await Property.updateOne(
        { _id: p._id },
        { $set: { address, city, country } }
      );
      fixed++;
      log.info(`✅ ${p._id}: address="${address}", city="${city}", country="${country}"`);
    } catch (error) {
      errors++;
      log.error(`❌ Error backfilling property ${p._id}:`, error);
    }
  }

  log.info('\n' + '='.repeat(60));
  log.info('✨ Backfill complete!');
  log.info(`   - Processed: ${broken.length}`);
  log.info(`   - Fixed:     ${fixed}`);
  log.info(`   - Errors:    ${errors}`);
  log.info('='.repeat(60));

  await mongoose.disconnect();
  log.info('🔌 Disconnected from MongoDB');
}

backfillPropertyLocations()
  .then(() => {
    log.info('\n✅ Backfill script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    log.error('\n❌ Backfill script failed:', error);
    process.exit(1);
  });
