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

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedCityData() {
  try {
    console.log('🌱 Starting city market data seeder...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
      console.warn('⚠️ Warning: No Gemini API key found!');
      console.warn('   Set GEMINI_API_KEY or GOOGLE_AI_API_KEY in .env file');
      console.warn('   The seeder will create placeholder data for now.\n');
    }

    // Run the update function (same as biweekly cron job)
    await updateAllCityMarketData();

    console.log('\n✅ City market data seeded successfully!');
    console.log('   You can now view cities at /explore-cities');
    console.log('   Data will be refreshed automatically on 1st and 15th of each month');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeder
seedCityData();
