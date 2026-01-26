import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';

dotenv.config();

async function cleanup10kListings() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find the demo user
    const demoUser = await User.findOne({ email: 'demo@balkanestate.com' });

    if (!demoUser) {
      console.log('⚠️  Demo user not found. Nothing to clean up.');
      return;
    }

    // Count properties before deletion
    const countBefore = await Property.countDocuments({ sellerId: demoUser._id });
    console.log(`📊 Found ${countBefore} properties from demo user`);

    if (countBefore === 0) {
      console.log('✅ No demo properties to delete');
      return;
    }

    // Confirm deletion
    console.log(`\n⚠️  About to delete ${countBefore} demo properties...`);
    console.log('   (This only removes properties created by demo@balkanestate.com)\n');

    // Delete all properties from demo user
    const result = await Property.deleteMany({ sellerId: demoUser._id });
    console.log(`🗑️  Deleted ${result.deletedCount} properties`);

    // Optionally delete the demo user too
    const deleteUser = process.argv.includes('--delete-user');
    if (deleteUser) {
      await User.deleteOne({ _id: demoUser._id });
      console.log('🗑️  Deleted demo user');
    }

    // Show remaining count
    const countAfter = await Property.countDocuments();
    console.log(`\n📊 Remaining properties in database: ${countAfter}`);
    console.log('✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run
cleanup10kListings();
