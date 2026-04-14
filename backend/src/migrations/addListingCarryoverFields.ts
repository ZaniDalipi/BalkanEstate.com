import mongoose from 'mongoose';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * Migration: Initialize monthly listing fields
 *
 * This migration adds new fields to existing user subscriptions for the
 * simplified monthly reset model.
 *
 * New fields:
 * - listingsCreatedThisMonth: Count for current month
 * - monthResetDate: When the monthly counter was last reset
 */

async function migrateListingCarryoverFields(): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find all users with active subscriptions
    const users = await User.find({
      isSubscribed: true,
    }).session(session);

    logger.info(`Starting migration for ${users.length} users with subscriptions`);

    let migratedCount = 0;

    for (const user of users) {
      try {
        if (!user.subscription) {
          continue;
        }

        // Initialize monthly fields if not set
        let needsSave = false;

        if (user.subscription.listingsCreatedThisMonth === undefined) {
          user.subscription.listingsCreatedThisMonth = 0;
          needsSave = true;
        }

        if (user.subscription.monthResetDate === undefined) {
          // Set to current date - will be updated by cron job
          user.subscription.monthResetDate = new Date();
          needsSave = true;
        }

        if (needsSave) {
          user.markModified('subscription');
          await user.save({ session });
          migratedCount++;
        }
      } catch (userError) {
        logger.error(`Error migrating user ${user._id}:`, userError);
      }
    }

    await session.commitTransaction();

    logger.info(`Migration completed: ${migratedCount} users updated`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Main migration function
 * Call this from the CLI or from your migration runner
 */
export async function up(): Promise<void> {
  try {
    logger.info('Starting monthly listing migration...');
    await migrateListingCarryoverFields();
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function (if needed)
 * Removes the new monthly listing fields
 */
export async function down(): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.warn('Rolling back monthly listing migration...');

    await User.updateMany(
      {},
      {
        $unset: {
          'subscription.listingsCreatedThisMonth': 1,
          'subscription.monthResetDate': 1,
        },
      },
      { session }
    );

    await session.commitTransaction();
    logger.info('Rollback completed');
  } catch (error) {
    await session.abortTransaction();
    logger.error('Rollback failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}
