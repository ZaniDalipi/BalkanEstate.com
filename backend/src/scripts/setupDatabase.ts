/**
 * Database Setup Script
 *
 * Initializes all MongoDB collections with proper indexes for any environment.
 *
 * Usage:
 *   Development: npm run setup:db
 *   Staging:     npm run setup:db:staging
 *   Production:  npm run setup:db:production
 *
 * This script will:
 * 1. Connect to the MongoDB database for the specified environment
 * 2. Create all collections with proper indexes
 * 3. Initialize required data (products, city data)
 * 4. Verify the setup was successful
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// Import all models to ensure indexes are created
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
import DiscountCode from '../models/DiscountCode';
import PaymentRecord from '../models/PaymentRecord';
import SalesHistory from '../models/SalesHistory';
import SubscriptionEvent from '../models/SubscriptionEvent';
import CityMarketData from '../models/CityMarketData';
import BankExport from '../models/BankExport';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import AgencyJoinRequest from '../models/AgencyJoinRequest';
import AgentRequest from '../models/AgentRequest';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkanestate';

// All models with their names
const models = [
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
  { name: 'DiscountCode', model: DiscountCode },
  { name: 'PaymentRecord', model: PaymentRecord },
  { name: 'SalesHistory', model: SalesHistory },
  { name: 'SubscriptionEvent', model: SubscriptionEvent },
  { name: 'CityMarketData', model: CityMarketData },
  { name: 'BankExport', model: BankExport },
  { name: 'AgencyFeaturedSubscription', model: AgencyFeaturedSubscription },
  { name: 'AgencyJoinRequest', model: AgencyJoinRequest },
  { name: 'AgentRequest', model: AgentRequest },
];

async function setupDatabase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           BALKAN ESTATE - DATABASE SETUP                   ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${env.toUpperCase().padEnd(44)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Get existing collections
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    console.log('📦 Setting up collections and indexes...\n');

    let created = 0;
    let existing = 0;
    let indexesCreated = 0;

    for (const { name, model } of models) {
      const collectionName = model.collection.name;
      const exists = existingNames.includes(collectionName);

      if (exists) {
        console.log(`   ✓ ${name} (${collectionName}) - exists`);
        existing++;
      } else {
        // Create collection by ensuring indexes
        await model.createCollection();
        console.log(`   + ${name} (${collectionName}) - created`);
        created++;
      }

      // Ensure indexes are created/synced
      try {
        await model.syncIndexes();
        const indexes = await model.collection.indexes();
        indexesCreated += indexes.length;
      } catch (err: any) {
        console.log(`     ⚠️  Index sync warning for ${name}: ${err.message}`);
      }
    }

    console.log('\n────────────────────────────────────────────────────────────');
    console.log(`📊 Summary:`);
    console.log(`   • Collections created: ${created}`);
    console.log(`   • Collections existing: ${existing}`);
    console.log(`   • Total indexes: ${indexesCreated}`);
    console.log('────────────────────────────────────────────────────────────\n');

    // Check for required seed data
    console.log('🌱 Checking required seed data...\n');

    // Check products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('   ⚠️  No products found. Run: npm run seed:products');
    } else {
      console.log(`   ✓ Products: ${productCount} items`);
    }

    // Check city market data
    const cityCount = await CityMarketData.countDocuments();
    if (cityCount === 0) {
      console.log('   ⚠️  No city data found. Run: npm run seed:cities');
    } else {
      console.log(`   ✓ City Market Data: ${cityCount} cities`);
    }

    // Check promotion coupons
    const couponCount = await PromotionCoupon.countDocuments();
    console.log(`   ✓ Promotion Coupons: ${couponCount} coupons`);

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('════════════════════════════════════════════════════════════\n');

    if (productCount === 0 || cityCount === 0) {
      console.log('📝 Next steps:');
      if (productCount === 0) {
        console.log('   1. Run: npm run seed:products');
      }
      if (cityCount === 0) {
        console.log('   2. Run: npm run seed:cities');
      }
      console.log('');
    }

  } catch (error: any) {
    console.error('\n❌ DATABASE SETUP FAILED!');
    console.error('   Error:', error.message);

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   • Check if MongoDB is running');
      console.error('   • Verify MONGODB_URI in your .env file');
      console.error('   • For cloud MongoDB, check network access settings');
    }

    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
  }
}

// Run the setup
setupDatabase();
