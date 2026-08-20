import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import VillaDestination from '../models/VillaDestination';
import { scriptLogger } from '../utils/logger';
import { DEFAULT_VILLA_DESTINATIONS } from '../data/defaultVillaDestinations';

const log = scriptLogger.child('SeedVillaDestinations');

const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

async function seedVillaDestinations(): Promise<void> {
  log.info(`🌍 Environment: ${env.toUpperCase()}`);

  try {
    await mongoose.connect(MONGODB_URI);
    log.info('✅ Connected to MongoDB');

    let created = 0;
    let skipped = 0;

    for (const [index, dest] of DEFAULT_VILLA_DESTINATIONS.entries()) {
      // Match on `query`, the field that actually drives the villa search —
      // re-running must never duplicate a destination an admin has renamed.
      const existing = await VillaDestination.findOne({ query: dest.query });
      if (existing) {
        skipped++;
        continue;
      }
      await VillaDestination.create({ ...dest, displayOrder: index, isActive: true });
      created++;
    }

    log.info(`🎉 Created ${created} destination(s), left ${skipped} existing untouched`);
    log.info('   Admins can now edit these and upload a photo per place.');
  } catch (error) {
    log.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

seedVillaDestinations();
