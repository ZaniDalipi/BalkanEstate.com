import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  cleanupExpiredConversations,
  getExpirationStats,
} from '../services/conversationCleanupService';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('CleanupConversations');

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
  log.info('='.repeat(60));
  log.info('🧹 Conversation Cleanup Script');
  log.info('='.repeat(60));
  log.info('');

  if (!MONGODB_URI) {
    log.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    log.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    log.info('✅ Connected to MongoDB');
    log.info('');

    // Get stats before cleanup
    log.info('📊 Getting conversation stats...');
    const statsBefore = await getExpirationStats();
    log.info('  Current state:');
    log.info(`    - Total conversations: ${statsBefore.totalCount}`);
    log.info(`    - Expired conversations: ${statsBefore.expiredCount}`);
    log.info(`    - Expiring soon (7 days): ${statsBefore.expiringSoonCount}`);
    log.info('');

    if (statsBefore.expiredCount === 0) {
      log.info('✨ No conversations to clean up. Everything is good!');
      log.info('');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Run cleanup
    log.info('🧹 Starting cleanup...');
    log.info('');
    const result = await cleanupExpiredConversations();
    log.info('');

    // Get stats after cleanup
    log.info('📊 Getting updated stats...');
    const statsAfter = await getExpirationStats();
    log.info('  After cleanup:');
    log.info(`    - Total conversations: ${statsAfter.totalCount}`);
    log.info(`    - Expired conversations: ${statsAfter.expiredCount}`);
    log.info(`    - Expiring soon (7 days): ${statsAfter.expiringSoonCount}`);
    log.info('');

    // Summary
    log.info('='.repeat(60));
    log.info('✅ Cleanup Complete');
    log.info('='.repeat(60));
    log.info(`  📈 Results:`);
    log.info(`    - Conversations deleted: ${result.deletedConversations}`);
    log.info(`    - Messages deleted: ${result.deletedMessages}`);
    log.info(`    - Images deleted: ${result.deletedImages}`);
    log.info('');

    if (statsAfter.expiringSoonCount > 0) {
      log.warn(`⚠️  Note: ${statsAfter.expiringSoonCount} conversations will expire in the next 7 days`);
      log.warn('');
    }

    // Close connection
    await mongoose.connection.close();
    log.info('✅ Database connection closed');
    log.info('');

    process.exit(0);
  } catch (error) {
    log.error('');
    log.error('❌ Error during cleanup:', error);
    log.error('');

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
