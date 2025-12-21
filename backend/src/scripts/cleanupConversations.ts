import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  cleanupExpiredConversations,
  getExpirationStats,
} from '../services/conversationCleanupService';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

/**
 * Cleanup script for expired conversations
 * Run this manually or via cron job
 *
 * Usage:
 *   npm run cleanup:conversations
 *
 * Or with cron (run daily at 2 AM):
 *   0 2 * * * cd /path/to/backend && npm run cleanup:conversations
 */
const main = async () => {
  console.log('='.repeat(60));
  console.log('🧹 Conversation Cleanup Script');
  console.log('='.repeat(60));
  console.log('');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    console.log('');

    // Get stats before cleanup
    console.log('📊 Getting conversation stats...');
    const statsBefore = await getExpirationStats();
    console.log('  Current state:');
    console.log(`    - Total conversations: ${statsBefore.totalCount}`);
    console.log(`    - Expired conversations: ${statsBefore.expiredCount}`);
    console.log(`    - Expiring soon (7 days): ${statsBefore.expiringSoonCount}`);
    console.log('');

    if (statsBefore.expiredCount === 0) {
      console.log('✨ No conversations to clean up. Everything is good!');
      console.log('');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Run cleanup
    console.log('🧹 Starting cleanup...');
    console.log('');
    const result = await cleanupExpiredConversations();
    console.log('');

    // Get stats after cleanup
    console.log('📊 Getting updated stats...');
    const statsAfter = await getExpirationStats();
    console.log('  After cleanup:');
    console.log(`    - Total conversations: ${statsAfter.totalCount}`);
    console.log(`    - Expired conversations: ${statsAfter.expiredCount}`);
    console.log(`    - Expiring soon (7 days): ${statsAfter.expiringSoonCount}`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Cleanup Complete');
    console.log('='.repeat(60));
    console.log(`  📈 Results:`);
    console.log(`    - Conversations deleted: ${result.deletedConversations}`);
    console.log(`    - Messages deleted: ${result.deletedMessages}`);
    console.log(`    - Images deleted: ${result.deletedImages}`);
    console.log('');

    if (statsAfter.expiringSoonCount > 0) {
      console.log(`⚠️  Note: ${statsAfter.expiringSoonCount} conversations will expire in the next 7 days`);
      console.log('');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Error during cleanup:', error);
    console.error('');

    // Attempt to close connection
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      // Ignore close errors
    }

    process.exit(1);
  }
};

// Run the script
main();
