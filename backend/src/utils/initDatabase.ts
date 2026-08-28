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
 * Seeds missing products from seed data into the database.
 * Only inserts products that do not exist yet — existing products are never overwritten,
 * so admin changes made via the PricingManager UI are preserved across deployments.
 */
const syncProductPricing = async (): Promise<void> => {
  try {
    const { PRODUCTS } = await import('../scripts/seedProducts');

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const productData of PRODUCTS) {
      try {
        // $setOnInsert only writes data when creating a new document.
        // If the product already exists it is left completely unchanged.
        const result = await Product.findOneAndUpdate(
          { productId: productData.productId },
          { $setOnInsert: productData },
          { upsert: true, new: false }
        );
        if (result === null) {
          // null means the document did not exist before → was just inserted
          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (error: any) {
        errors.push(`${productData.productId}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      dbLogger.warn(`⚠️  Product sync had ${errors.length} error(s): ${errors.join('; ')}`);
    }

    dbLogger.info(`✅ Products synced (${insertedCount} new, ${skippedCount} existing preserved)`);
  } catch (error: any) {
    dbLogger.error('❌ Error syncing product pricing:', error.message);
    // Don't throw - let app continue even if product sync fails
  }
};

/**
 * Creates a model's indexes one at a time, so a single failure doesn't take the
 * rest with it.
 *
 * `syncIndexes()` builds a model's indexes as one operation: whatever it was
 * working on when it threw, everything after that is silently left uncreated.
 * A production database was found with 11 of 18 declared property indexes
 * missing — including the text index, without which `?query=` returns an error
 * rather than results — while the only trace was one aggregate warning line.
 *
 * Each failure is now logged with the index it belongs to, which is the
 * information needed to actually fix it (a unique index that can't build over
 * existing duplicates, say).
 */
const createIndexesIndividually = async (name: string, model: any): Promise<string[]> => {
  const failures: string[] = [];

  for (const [key, options] of model.schema.indexes()) {
    try {
      await model.collection.createIndex(key, { ...options, background: true });
    } catch (err: any) {
      failures.push(`${name}.${JSON.stringify(key)}: ${err.message}`);
    }
  }

  return failures;
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
    } catch (err: any) {
      // syncIndexes stops at the first failure. Fall back to per-index
      // creation so one bad index doesn't cost the model every other one.
      issues.push(`${name}: ${err.message}`);
      const failures = await createIndexesIndividually(name, model);
      issues.push(...failures);
    }

    try {
      const indexes = await model.collection.indexes();
      totalCreated += indexes.length;

      const declared = model.schema.indexes().length;
      // +1 for the implicit _id index.
      if (indexes.length < declared + 1) {
        issues.push(`${name}: ${declared + 1 - indexes.length} declared index(es) still missing after sync`);
      }
    } catch {
      // Counting is diagnostic only — never fail startup over it.
    }
  }

  if (issues.length > 0) {
    dbLogger.warn(`⚠️  Index sync had ${issues.length} warning(s):`);
    for (const issue of issues) dbLogger.warn(`   • ${issue}`);
  }

  dbLogger.info(`✅ All indexes synced (${totalCreated} total across ${allModels.length} collections)`);
};

/**
 * Backfills the normalised location keys the listing query matches on.
 *
 * Runs as a single aggregation-pipeline update — the documents never leave the
 * database — and matches nothing once every document has been converted, so it
 * is safe (and cheap) to leave in the startup path. Without it, listings
 * written before cityKey existed would be invisible to city/country filters.
 */
const backfillPropertyLocationKeys = async (): Promise<void> => {
  try {
    const Property = mongoose.model('Property');
    const result = await Property.collection.updateMany(
      { $or: [{ cityKey: { $exists: false } }, { countryKey: { $exists: false } }] },
      [{
        $set: {
          cityKey: { $toLower: { $trim: { input: { $ifNull: ['$city', ''] } } } },
          countryKey: { $toLower: { $trim: { input: { $ifNull: ['$country', ''] } } } },
        },
      }]
    );

    if (result.modifiedCount > 0) {
      dbLogger.info(`✅ Backfilled location keys on ${result.modifiedCount} propert${result.modifiedCount === 1 ? 'y' : 'ies'}`);
    }
  } catch (err: any) {
    dbLogger.warn(`⚠️  Location key backfill skipped: ${err.message}`);
  }
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

    // Populate cityKey/countryKey on any documents written before they existed.
    // No-ops once every document has them.
    await backfillPropertyLocationKeys();

    // Ensure all property documents have the same attributes across environments
    await ensurePropertySchemaSync();

    // Seed any missing products on startup (existing products are never overwritten)
    try {
      dbLogger.info('🔄 Checking for missing products...');
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
