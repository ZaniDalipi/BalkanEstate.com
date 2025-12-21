import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { syncAllSellerStats } from '../utils/statsUpdater';

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
    console.log('✅ Connected to MongoDB');

    // Sync all seller stats
    await syncAllSellerStats();

    console.log('\n🎉 Successfully synced all seller statistics!');
    console.log('Stats now include:');
    console.log('  - Total Views');
    console.log('  - Total Saves');
    console.log('  - Total Inquiries');
    console.log('  - Properties Sold');
    console.log('  - Total Sales Value');
    console.log('  - Active Listings');
    console.log('  - Rating (placeholder)');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing seller stats:', error);
    process.exit(1);
  }
}

// Run the script
main();
