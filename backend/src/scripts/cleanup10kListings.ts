import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('Cleanup10k');

dotenv.config();

async function cleanup10kListings() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Find the demo user
    const demoUser = await User.findOne({ email: 'demo@balkanestate.com' });

    if (!demoUser) {
      log.info('⚠️  Demo user not found. Nothing to clean up.');
      return;
    }

    // Count properties before deletion
    const countBefore = await Property.countDocuments({ sellerId: demoUser._id });
    log.info(`📊 Found ${countBefore} properties from demo user`);

    if (countBefore === 0) {
      log.info('✅ No demo properties to delete');
      return;
    }

    // Confirm deletion
    log.info(`\n⚠️  About to delete ${countBefore} demo properties...`);
    log.info('   (This only removes properties created by demo@balkanestate.com)\n');

    // Delete all properties from demo user
    const result = await Property.deleteMany({ sellerId: demoUser._id });
    log.info(`🗑️  Deleted ${result.deletedCount} properties`);

    // Optionally delete the demo user too
    const deleteUser = process.argv.includes('--delete-user');
    if (deleteUser) {
      await User.deleteOne({ _id: demoUser._id });
      log.info('🗑️  Deleted demo user');
    }

    // Show remaining count
    const countAfter = await Property.countDocuments();
    log.info(`\n📊 Remaining properties in database: ${countAfter}`);
    log.info('✅ Cleanup complete!');

  } catch (error) {
    log.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('👋 Disconnected from MongoDB');
  }
}

// Run
cleanup10kListings();
