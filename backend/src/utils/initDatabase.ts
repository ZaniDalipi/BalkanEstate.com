import mongoose from 'mongoose';
import CityMarketData from '../models/CityMarketData';
import EmailConfig from '../models/EmailConfig';
import { updateAllCityMarketData } from '../services/cityMarketDataService';
import { seedEmailConfigs } from '../seeds/emailConfigSeed';

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.warn('⚠️  Database not connected yet, skipping index initialization');
      return;
    }

    const usersCollection = db.collection('users');

    // Check if the old problematic index exists
    const indexes = await usersCollection.indexes();
    const oldIndex = indexes.find(
      (idx) => idx.name === 'provider_1_providerId_1' && !idx.partialFilterExpression
    );

    if (oldIndex) {
      console.log('🔧 Fixing User index for multiple local users...');

      try {
        // Drop the old index
        await usersCollection.dropIndex('provider_1_providerId_1');
        console.log('  ✅ Dropped old provider_providerId index');

        // The new index will be created automatically by Mongoose
        console.log('  ✅ New partial index will be created by Mongoose');
      } catch (error: any) {
        if (error.code === 27) {
          console.log('  ℹ️  Index already dropped');
        } else {
          console.error('  ❌ Error dropping index:', error.message);
        }
      }
    } else {
      console.log('✅ User indexes are up to date');
    }

    // Initialize email configurations if empty
    try {
      const emailConfigCount = await EmailConfig.countDocuments();
      if (emailConfigCount === 0) {
        console.log('🌱 No email configurations found. Seeding defaults...');
        await seedEmailConfigs();
        console.log('✅ Email configurations seeded successfully!');
      } else {
        console.log(`✅ Email configurations loaded (${emailConfigCount} templates)`);
      }
    } catch (error) {
      console.error('❌ Error initializing email configurations:', error);
    }

    // Initialize city market data if empty
    try {
      const cityCount = await CityMarketData.countDocuments();
      if (cityCount === 0) {
        console.log('🌱 No city market data found. Initializing database with Balkan cities...');
        console.log('   This may take 1-2 minutes depending on API rate limits.');

        // Run initial seed in background to avoid blocking server startup
        setTimeout(async () => {
          try {
            await updateAllCityMarketData();
            console.log('✅ City market data initialized successfully!');
            console.log('   Data will be refreshed automatically on 1st and 15th of each month.');
          } catch (error) {
            console.error('❌ Failed to initialize city data:', error);
            console.warn('   City data will be populated during next scheduled update.');
          }
        }, 5000); // 5 second delay to let server fully start first
      } else {
        console.log(`✅ City market data loaded (${cityCount} cities)`);
      }
    } catch (error) {
      console.error('❌ Error checking city market data:', error);
    }
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    // Don't throw - let the app continue even if index fix fails
  }
};
