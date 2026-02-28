/**
 * Seed script to populate initial city market data
 * Run this once to initialize the database with Balkan city data
 *
 * Usage: npx ts-node backend/scripts/seedCityData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { updateAllCityMarketData } from '../src/services/cityMarketDataService';
import { scriptLogger } from '../src/utils/logger';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.join(__dirname, '..', envFile) });

const log = scriptLogger.child('SeedCities');

log.info(`🌍 Environment: ${env.toUpperCase()}`);

async function seedCityData() {
  try {
    log.info('🌱 Starting city market data seeder...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      log.warn('⚠️ Warning: No Gemini API key found!');
      log.warn('   Set GEMINI_API_KEY or GOOGLE_AI_API_KEY in .env file');
      log.warn('   The seeder will create placeholder data for now.\n');
    }

    // Run the update function (same as biweekly cron job)
    await updateAllCityMarketData();

    log.info('\n✅ City market data seeded successfully!');
    log.info('   You can now view cities at /explore-cities');
    log.info('   Data will be refreshed automatically on 1st and 15th of each month');

    process.exit(0);
  } catch (error) {
    log.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedCityData();
