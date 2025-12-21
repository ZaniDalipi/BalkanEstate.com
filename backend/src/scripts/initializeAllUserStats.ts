import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration script to initialize stats for all existing users
 * Run this script once to ensure all users have the stats object initialized
 *
 * Usage: npx ts-node src/scripts/initializeAllUserStats.ts
 */

async function initializeAllUserStats() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkanestate';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all users without stats or with incomplete stats
    const users = await User.find({
      $or: [
        { stats: { $exists: false } },
        { 'stats.totalViews': { $exists: false } },
        { 'stats.totalSaves': { $exists: false } },
        { 'stats.totalInquiries': { $exists: false } },
        { 'stats.propertiesSold': { $exists: false } },
        { 'stats.totalSalesValue': { $exists: false } }
      ]
    });

    console.log(`Found ${users.length} users without properly initialized stats`);

    let updatedCount = 0;

    for (const user of users) {
      // Initialize stats with default values
      await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            stats: {
              totalViews: user.stats?.totalViews || 0,
              totalSaves: user.stats?.totalSaves || 0,
              totalInquiries: user.stats?.totalInquiries || 0,
              propertiesSold: user.stats?.propertiesSold || 0,
              totalSalesValue: user.stats?.totalSalesValue || 0,
              lastUpdated: new Date()
            }
          }
        }
      );

      updatedCount++;

      if (updatedCount % 100 === 0) {
        console.log(`Processed ${updatedCount}/${users.length} users...`);
      }
    }

    console.log(`\n✅ Successfully initialized stats for ${updatedCount} users`);
    console.log('\nStats initialization complete!');

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

    process.exit(0);
  } catch (error) {
    console.error('Error initializing user stats:', error);
    process.exit(1);
  }
}

// Run the script
initializeAllUserStats();
