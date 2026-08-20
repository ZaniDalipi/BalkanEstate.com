import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Property from '../models/Property';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('BackfillVillaApproval');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Luxury villas now publish immediately (admin review is optional curation), so
 * every villa needs an explicit `villaApprovalStatus`. Villas created before that
 * change either carry 'pending' or are missing the field entirely — the public
 * filter uses `$nin: ['pending','rejected']`, which matches missing fields, so
 * the two behave differently in the admin queue while looking identical publicly.
 *
 * This backfills both to 'approved'. Explicitly rejected villas are left alone.
 */
async function backfillVillaApproval(): Promise<void> {
  log.info(`🌍 Environment: ${env.toUpperCase()}`);

  try {
    await mongoose.connect(MONGODB_URI);
    log.info('✅ Connected to MongoDB');

    const filter = {
      propertyType: 'luxury-villa',
      $or: [
        { villaApprovalStatus: { $exists: false } },
        { villaApprovalStatus: null },
        { villaApprovalStatus: 'pending' },
      ],
    };

    const total = await Property.countDocuments({ propertyType: 'luxury-villa' });
    const pending = await Property.countDocuments(filter);
    log.info(`📊 ${total} luxury villa(s) total, ${pending} awaiting backfill`);

    if (pending === 0) {
      log.info('✨ Nothing to do — all villas already have an approval status.');
      return;
    }

    const result = await Property.updateMany(filter, {
      $set: { villaApprovalStatus: 'approved' },
      $unset: { villaApprovalReason: '' },
    });

    log.info(`🎉 Backfilled ${result.modifiedCount} villa(s) to 'approved'`);
  } catch (error) {
    log.error('❌ Backfill error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

backfillVillaApproval();
