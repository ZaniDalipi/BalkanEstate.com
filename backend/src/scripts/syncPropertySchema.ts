/**
 * Standalone script to sync property schema across environments.
 * Ensures all property documents have every field with proper defaults.
 *
 * Usage:
 *   npm run migrate:property-schema                  (development)
 *   NODE_ENV=production npm run migrate:property-schema  (production)
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { migratePropertySchema } from '../utils/migratePropertySchema';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : process.env.NODE_ENV === 'staging'
      ? '.env.staging'
      : '.env.development';

dotenv.config({ path: envFile });
dotenv.config(); // fallback

const run = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
  console.log(`Connecting to ${process.env.NODE_ENV || 'development'} database...`);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const { commonUpdated, rentalUpdated } = await migratePropertySchema();

  console.log(`Done! ${commonUpdated} properties updated, ${rentalUpdated} rental listings updated.`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
