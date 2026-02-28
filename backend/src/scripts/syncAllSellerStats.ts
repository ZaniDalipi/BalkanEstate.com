import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncAllSellerStats } from '../utils/statsUpdater';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SyncSellerStats');

// Load environment variables
dotenv.config();

/**
 * Script to sync statistics for all sellers (agents and private sellers)
 * This will calculate real stats from properties and conversations
 *
 * Usage: npm run sync:stats
 */

async function main() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Sync all seller stats
    await syncAllSellerStats();

    log.info('\n🎉 Successfully synced all seller statistics!');
    log.info('Stats now include:');
    log.info('  - Total Views');
    log.info('  - Total Saves');
    log.info('  - Total Inquiries');
    log.info('  - Properties Sold');
    log.info('  - Total Sales Value');
    log.info('  - Active Listings');
    log.info('  - Rating (placeholder)');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    log.error('❌ Error syncing seller stats:', error);
    process.exit(1);
  }
}

// Run the script
main();
