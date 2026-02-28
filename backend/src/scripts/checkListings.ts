import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('CheckListings');

dotenv.config();

async function checkListings() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Total count
    const totalCount = await Property.countDocuments();
    log.info(`\n📊 Total properties: ${totalCount}`);

    // Count by status
    const statusCounts = await Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    log.info('\n📋 By status:');
    statusCounts.forEach(s => log.info(`   ${s._id}: ${s.count}`));

    // Count demo properties
    const demoUser = await User.findOne({ email: 'demo@balkanestate.com' });
    if (demoUser) {
      const demoCount = await Property.countDocuments({ sellerId: demoUser._id });
      log.info(`\n🧪 Demo user properties: ${demoCount}`);
    } else {
      log.info('\n⚠️  No demo user found');
    }

    // Check active properties
    const activeCount = await Property.countDocuments({ status: 'active' });
    log.info(`\n✅ Active properties: ${activeCount}`);

    // Sample a property to check its fields
    const sample = await Property.findOne({ status: 'active' }).lean();
    if (sample) {
      log.info('\n📝 Sample property fields:');
      log.info(`   sellerId: ${sample.sellerId}`);
      log.info(`   status: ${sample.status}`);
      log.info(`   createdAsRole: ${sample.createdAsRole}`);
      log.info(`   city: ${sample.city}`);
      log.info(`   country: ${sample.country}`);
      log.info(`   lat/lng: ${sample.lat}, ${sample.lng}`);
    }

  } catch (error) {
    log.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected');
  }
}

checkListings();
