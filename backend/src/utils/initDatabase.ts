import mongoose from 'mongoose';
import CityMarketData from '../models/CityMarketData';
import EmailConfig from '../models/EmailConfig';
import { updateAllCityMarketData } from '../services/cityMarketDataService';
import { seedEmailConfigs } from '../seeds/emailConfigSeed';
import { ensurePropertySchemaSync } from './migratePropertySchema';
import { dbLogger } from './logger';

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      dbLogger.warn('⚠️  Database not connected yet, skipping index initialization');
      return;
    }

    const usersCollection = db.collection('users');

    // Check if the old problematic index exists
    const indexes = await usersCollection.indexes();
    const oldIndex = indexes.find(
      (idx) => idx.name === 'provider_1_providerId_1' && !idx.partialFilterExpression
    );

    if (oldIndex) {
      dbLogger.info('🔧 Fixing User index for multiple local users...');

      try {
        // Drop the old index
        await usersCollection.dropIndex('provider_1_providerId_1');
        dbLogger.info('  ✅ Dropped old provider_providerId index');

        // The new index will be created automatically by Mongoose
        dbLogger.info('  ✅ New partial index will be created by Mongoose');
      } catch (error: any) {
        if (error.code === 27) {
          dbLogger.info('  ℹ️  Index already dropped');
        } else {
          dbLogger.error('  ❌ Error dropping index:', error.message);
        }
      }
    } else {
      dbLogger.info('✅ User indexes are up to date');
    }

    // Ensure all property documents have the same attributes across environments
    await ensurePropertySchemaSync();

    // Initialize email configurations if empty
    try {
      const emailConfigCount = await EmailConfig.countDocuments();
      if (emailConfigCount === 0) {
        dbLogger.info('🌱 No email configurations found. Seeding defaults...');
        await seedEmailConfigs();
        dbLogger.info('✅ Email configurations seeded successfully!');
      } else {
        dbLogger.info(`✅ Email configurations loaded (${emailConfigCount} templates)`);
      }
    } catch (error) {
      dbLogger.error('❌ Error initializing email configurations:', error);
    }

    // Initialize city market data if empty
    try {
      const cityCount = await CityMarketData.countDocuments();
      if (cityCount === 0) {
        dbLogger.info('🌱 No city market data found. Initializing database with Balkan cities...');
        dbLogger.info('   This may take 1-2 minutes depending on API rate limits.');

        // Run initial seed in background to avoid blocking server startup
        setTimeout(async () => {
          try {
            await updateAllCityMarketData();
            dbLogger.info('✅ City market data initialized successfully!');
            dbLogger.info('   Data will be refreshed automatically on 1st and 15th of each month.');
          } catch (error) {
            dbLogger.error('❌ Failed to initialize city data:', error);
            dbLogger.warn('   City data will be populated during next scheduled update.');
          }
        }, 5000); // 5 second delay to let server fully start first
      } else {
        dbLogger.info(`✅ City market data loaded (${cityCount} cities)`);
      }
    } catch (error) {
      dbLogger.error('❌ Error checking city market data:', error);
    }
  } catch (error) {
    dbLogger.error('❌ Error initializing database:', error);
    // Don't throw - let the app continue even if index fix fails
  }
};
