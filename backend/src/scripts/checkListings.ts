import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Property from '../models/Property';
import User from '../models/User';

dotenv.config();

async function checkListings() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Total count
    const totalCount = await Property.countDocuments();
    console.log(`\n📊 Total properties: ${totalCount}`);

    // Count by status
    const statusCounts = await Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('\n📋 By status:');
    statusCounts.forEach(s => console.log(`   ${s._id}: ${s.count}`));

    // Count demo properties
    const demoUser = await User.findOne({ email: 'demo@balkanestate.com' });
    if (demoUser) {
      const demoCount = await Property.countDocuments({ sellerId: demoUser._id });
      console.log(`\n🧪 Demo user properties: ${demoCount}`);
    } else {
      console.log('\n⚠️  No demo user found');
    }

    // Check active properties
    const activeCount = await Property.countDocuments({ status: 'active' });
    console.log(`\n✅ Active properties: ${activeCount}`);

    // Sample a property to check its fields
    const sample = await Property.findOne({ status: 'active' }).lean();
    if (sample) {
      console.log('\n📝 Sample property fields:');
      console.log(`   sellerId: ${sample.sellerId}`);
      console.log(`   status: ${sample.status}`);
      console.log(`   createdAsRole: ${sample.createdAsRole}`);
      console.log(`   city: ${sample.city}`);
      console.log(`   country: ${sample.country}`);
      console.log(`   lat/lng: ${sample.lat}, ${sample.lng}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
  }
}

checkListings();
