import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Property from '../models/Property';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('ArchiveProperties');

// Load environment variables from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan-estate';

/**
 * Archive or delete properties that have been sold for more than 24 hours
 * This script should be run periodically via cron job
 */
const archiveSoldProperties = async () => {
  try {
    log.info('\n🔄 Starting sold properties cleanup...');
    log.info(`MongoDB URI: ${MONGODB_URI}`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    log.info('✓ Connected to MongoDB\n');

    // Find properties that were sold more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const oldSoldProperties = await Property.find({
      status: 'sold',
      soldAt: { $lt: twentyFourHoursAgo }
    });

    log.info(`Found ${oldSoldProperties.length} properties sold more than 24 hours ago`);

    if (oldSoldProperties.length === 0) {
      log.info('✓ No properties to archive\n');
      await mongoose.disconnect();
      log.info('Disconnected from MongoDB');
      return;
    }

    // Option 1: Delete the properties completely
    // Uncomment the following lines if you want to delete instead of archive
    // const deleteResult = await Property.deleteMany({
    //   status: 'sold',
    //   soldAt: { $lt: twentyFourHoursAgo }
    // });
    // console.log(`✓ Deleted ${deleteResult.deletedCount} properties\n`);

    // Option 2: Archive by changing status to 'archived' (recommended)
    // First, we need to add 'archived' to the status enum in the Property model
    // For now, we'll just delete them as per the original requirement

    const deleteResult = await Property.deleteMany({
      status: 'sold',
      soldAt: { $lt: twentyFourHoursAgo }
    });

    log.info(`✓ Processed ${deleteResult.deletedCount} properties:`);
    oldSoldProperties.forEach(prop => {
      log.info(`  - ${prop.address}, ${prop.city} (Sold: ${prop.soldAt?.toISOString()})`);
    });

    log.info('\n✓ Cleanup completed successfully');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    log.info('Disconnected from MongoDB\n');

  } catch (error: any) {
    log.error('\n❌ Cleanup error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the script
archiveSoldProperties();
