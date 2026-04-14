import mongoose from 'mongoose';
import CityMarketData from '../models/CityMarketData';
import EmailConfig from '../models/EmailConfig';
import { updateAllCityMarketData, ensureAllFeaturedCitiesExist } from '../services/cityMarketDataService';
import { seedEmailConfigs } from '../seeds/emailConfigSeed';
import { ensurePropertySchemaSync } from './migratePropertySchema';
import { dbLogger } from './logger';

// Import ALL models so syncIndexes can create any missing indexes
import User from '../models/User';
import Property from '../models/Property';
import Agency from '../models/Agency';
import Agent from '../models/Agent';
import Subscription from '../models/Subscription';
import Product from '../models/Product';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import Favorite from '../models/Favorite';
import SavedSearch from '../models/SavedSearch';
import SavedAgent from '../models/SavedAgent';
import Notification from '../models/Notification';
import PageView from '../models/PageView';
import Promotion from '../models/Promotion';
import PromotionCoupon from '../models/PromotionCoupon';
import PromotionPlan from '../models/PromotionPlan';
import DiscountCode from '../models/DiscountCode';
import PaymentRecord from '../models/PaymentRecord';
import SalesHistory from '../models/SalesHistory';
import SubscriptionEvent from '../models/SubscriptionEvent';
import BankExport from '../models/BankExport';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import AgencyJoinRequest from '../models/AgencyJoinRequest';
import AgentRequest from '../models/AgentRequest';
import Inquiry from '../models/Inquiry';
import PropertyAlert from '../models/PropertyAlert';
import SiteContent from '../models/SiteContent';
import PriceHistory from '../models/PriceHistory';
import PropertyValuation from '../models/PropertyValuation';
import ActivityLog from '../models/ActivityLog';
import Analytics from '../models/Analytics';

const allModels = [
  { name: 'User', model: User },
  { name: 'Property', model: Property },
  { name: 'Agency', model: Agency },
  { name: 'Agent', model: Agent },
  { name: 'Subscription', model: Subscription },
  { name: 'Product', model: Product },
  { name: 'Message', model: Message },
  { name: 'Conversation', model: Conversation },
  { name: 'Favorite', model: Favorite },
  { name: 'SavedSearch', model: SavedSearch },
  { name: 'SavedAgent', model: SavedAgent },
  { name: 'Notification', model: Notification },
  { name: 'PageView', model: PageView },
  { name: 'Promotion', model: Promotion },
  { name: 'PromotionCoupon', model: PromotionCoupon },
  { name: 'PromotionPlan', model: PromotionPlan },
  { name: 'DiscountCode', model: DiscountCode },
  { name: 'PaymentRecord', model: PaymentRecord },
  { name: 'SalesHistory', model: SalesHistory },
  { name: 'SubscriptionEvent', model: SubscriptionEvent },
  { name: 'CityMarketData', model: CityMarketData },
  { name: 'BankExport', model: BankExport },
  { name: 'AgencyFeaturedSubscription', model: AgencyFeaturedSubscription },
  { name: 'AgencyJoinRequest', model: AgencyJoinRequest },
  { name: 'AgentRequest', model: AgentRequest },
  { name: 'Inquiry', model: Inquiry },
  { name: 'PropertyAlert', model: PropertyAlert },
  { name: 'SiteContent', model: SiteContent },
  { name: 'PriceHistory', model: PriceHistory },
  { name: 'EmailConfig', model: EmailConfig },
  { name: 'PropertyValuation', model: PropertyValuation },
  { name: 'ActivityLog', model: ActivityLog },
  { name: 'Analytics', model: Analytics },
];

/**
 * Syncs products from seed data to the database.
 * Ensures all pricing and features are up-to-date without requiring manual seed commands.
 * This runs automatically on every server startup.
 */
const syncProductPricing = async (): Promise<void> => {
  try {
    // Import PRODUCTS from seedProducts
    const { PRODUCTS } = await import('../scripts/seedProducts');

    let upsertedCount = 0;
    const errors: string[] = [];

    for (const productData of PRODUCTS) {
      try {
        // Use findOneAndUpdate with upsert to keep existing data but sync pricing
        const result = await Product.findOneAndUpdate(
          { productId: productData.productId },
          productData,
          { upsert: true, new: true }
        );
        if (result) {
          upsertedCount++;
        }
      } catch (error: any) {
        errors.push(`${productData.productId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      dbLogger.warn(`⚠️  Product sync had ${errors.length} error(s): ${errors.join('; ')}`);
    }

    dbLogger.info(`✅ Product pricing synced (${upsertedCount} products updated/created)`);
  } catch (error: any) {
    dbLogger.error('❌ Error syncing product pricing:', error.message);
    // Don't throw - let app continue even if product sync fails
  }
};

/**
 * Syncs all Mongoose schema indexes to MongoDB.
 * Creates missing indexes and drops stale ones so production matches development.
 */
const syncAllIndexes = async (): Promise<void> => {
  let totalCreated = 0;
  const issues: string[] = [];

  for (const { name, model } of allModels) {
    try {
      await model.syncIndexes();
      const indexes = await model.collection.indexes();
      totalCreated += indexes.length;
    } catch (err: any) {
      issues.push(`${name}: ${err.message}`);
    }
  }

  if (issues.length > 0) {
    dbLogger.warn(`⚠️  Index sync had ${issues.length} warning(s): ${issues.join('; ')}`);
  }

  dbLogger.info(`✅ All indexes synced (${totalCreated} total across ${allModels.length} collections)`);
};

export const initializeDatabase = async (): Promise<void> => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      dbLogger.warn('⚠️  Database not connected yet, skipping initialization');
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

    // Sync all schema indexes to database (creates missing, drops stale)
    await syncAllIndexes();

    // Ensure all property documents have the same attributes across environments
    await ensurePropertySchemaSync();

    // Sync product pricing from seed data on every startup
    // This ensures frontend and backend pricing are always in sync without manual commands
    try {
      dbLogger.info('🔄 Syncing product pricing from seed data...');
      await syncProductPricing();
    } catch (error) {
      dbLogger.error('❌ Error syncing product pricing:', error);
    }

    // Initialize email configurations - seed missing configs on every startup
    try {
      const { defaultEmailConfigs } = await import('../seeds/emailConfigSeed');
      const emailConfigCount = await EmailConfig.countDocuments();
      const expectedCount = defaultEmailConfigs.length;

      if (emailConfigCount === 0) {
        dbLogger.info('🌱 No email configurations found. Seeding all defaults...');
        await seedEmailConfigs();
        dbLogger.info('✅ Email configurations seeded successfully!');
      } else if (emailConfigCount < expectedCount) {
        dbLogger.info(`🔄 Found ${emailConfigCount}/${expectedCount} email configs. Seeding missing ones...`);
        await seedEmailConfigs();
        const newCount = await EmailConfig.countDocuments();
        dbLogger.info(`✅ Email configurations synced (${newCount} templates)`);
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
            dbLogger.error('❌ Failed to initialize city data via API:', error);
            // Seed all cities with fallback data so the landing page is diverse
            try {
              await ensureAllFeaturedCitiesExist();
              dbLogger.info('✅ Seeded featured cities with fallback data.');
            } catch (seedErr) {
              dbLogger.error('❌ Failed to seed fallback city data:', seedErr);
            }
          }
        }, 5000); // 5 second delay to let server fully start first
      } else {
        dbLogger.info(`✅ City market data loaded (${cityCount} cities)`);
        // Ensure all countries are represented even if some cities were missed
        ensureAllFeaturedCitiesExist().catch(err =>
          dbLogger.error('❌ Error ensuring all featured cities exist:', err)
        );
      }
    } catch (error) {
      dbLogger.error('❌ Error checking city market data:', error);
    }
  } catch (error) {
    dbLogger.error('❌ Error initializing database:', error);
    // Don't throw - let the app continue even if index fix fails
  }
};
