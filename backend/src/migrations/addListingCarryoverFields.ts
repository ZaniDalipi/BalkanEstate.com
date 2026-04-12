import mongoose from 'mongoose';
import User from '../models/User';
import Product from '../models/Product';
import { logger } from '../utils/logger';

/**
 * Migration: Add listing carryover and annual cap fields
 *
 * This migration adds new fields to existing user subscriptions to support
 * the listing carryover and annual accumulation cap system.
 *
 * New fields:
 * - listingsAllowanceThisMonth: Current month allocation
 * - listingsAllowanceYTD: Cumulative YTD (for annual cap)
 * - carryoverListings: Unused from last month
 * - subscriptionCycleStartDate: When subscription started
 * - subscriptionCycleEndDate: 1 year from start
 * - listingsCreatedThisMonth: Count for current month
 * - listingsArchivedDate: When listings were archived
 * - archiveNotificationSent: Email notification flag
 */

async function migrateListingCarryoverFields(): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find all users with active subscriptions that support listing limits
    const users = await User.find({
      'subscription.tier': { $in: ['pro', 'agency_owner', 'agency_agent'] },
      'subscription.status': { $in: ['active', 'trial', 'grace'] },
    }).session(session);

    logger.info(`Starting migration for ${users.length} users with listing subscriptions`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        if (!user.subscription) {
          continue;
        }

        // Skip if already migrated with valid allowance
        if (
          user.subscription.listingsAllowanceThisMonth !== undefined &&
          user.subscription.listingsAllowanceThisMonth > 0 &&
          user.subscription.subscriptionCycleStartDate !== undefined
        ) {
          continue;
        }

        // Get monthly allowance from Product by productId (subscriptionPlan)
        let monthlyAllowance = 0;
        const subscriptionPlan = (user as any).subscriptionPlan;

        if (subscriptionPlan) {
          try {
            const product = await Product.findOne({
              productId: subscriptionPlan,
              isActive: true,
            }).session(session);

            if (product?.listingsLimit) {
              monthlyAllowance = product.listingsLimit;
              logger.info(`Found product ${subscriptionPlan} for user ${user._id}: listingsLimit=${monthlyAllowance}`);
            }
          } catch (productError) {
            logger.warn(`Could not find product for productId ${subscriptionPlan} for user ${user._id}`);
          }
        }

        // Fallback: default allowances if product not found
        if (monthlyAllowance === 0) {
          if (user.subscription.tier === 'agency_agent') {
            monthlyAllowance = 30;
          } else if (user.subscription.tier === 'pro') {
            monthlyAllowance = 20;
          } else if (user.subscription.tier === 'agency_owner') {
            monthlyAllowance = 500;
          }
          logger.warn(
            `Using fallback allowance ${monthlyAllowance} for user ${user._id} (tier: ${user.subscription.tier})`
          );
        }

        // Initialize carryover fields
        const cycleStartDate = user.subscription.startDate || user.createdAt || new Date();
        const cycleEndDate = new Date(
          cycleStartDate.getTime() + 365 * 24 * 60 * 60 * 1000
        );

        user.subscription.listingsAllowanceThisMonth = monthlyAllowance;
        user.subscription.listingsAllowanceYTD = Math.max(
          user.subscription.activeListingsCount || 0,
          monthlyAllowance
        );
        user.subscription.carryoverListings = 0; // No carryover on initial migration
        user.subscription.subscriptionCycleStartDate = cycleStartDate;
        user.subscription.subscriptionCycleEndDate = cycleEndDate;
        user.subscription.listingsCreatedThisMonth = 0;
        user.subscription.archiveNotificationSent = false;

        user.markModified('subscription');
        await user.save({ session });

        migratedCount++;

        if (migratedCount % 100 === 0) {
          logger.info(`Migrated ${migratedCount} users...`);
        }
      } catch (userError) {
        errorCount++;
        logger.error(`Error migrating user ${user._id}:`, userError);
      }
    }

    await session.commitTransaction();

    logger.info(`Migration completed: ${migratedCount} users migrated, ${errorCount} errors`);
  } catch (error) {
    await session.abortTransaction();
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Backfill function: Fix users stuck at 0 allowance after renewals under Bug 1
 *
 * Bug 1 caused users with 'agency_owner' / 'agency_agent' tiers to get 0 allowance
 * because the Product lookup used tier instead of productId. This function repairs
 * those users by re-populating their allowance from the Product DB via productId.
 */
async function backfillZeroAllowanceUsers(): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find users with subscriptions where listingsAllowanceThisMonth is 0 or undefined
    // but they have a subscriptionPlan that should have a positive allowance
    const users = await User.find({
      'subscription.tier': { $in: ['pro', 'agency_owner', 'agency_agent'] },
      'subscription.status': { $in: ['active', 'trial', 'grace'] },
      $or: [
        { 'subscription.listingsAllowanceThisMonth': { $eq: 0 } },
        { 'subscription.listingsAllowanceThisMonth': { $exists: false } },
      ],
    }).session(session);

    logger.info(`Starting backfill for ${users.length} users with zero/missing allowance`);

    let backfilledCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        if (!user.subscription) {
          skippedCount++;
          continue;
        }

        const subscriptionPlan = (user as any).subscriptionPlan;
        if (!subscriptionPlan) {
          logger.warn(`Skipping user ${user._id}: no subscriptionPlan found`);
          skippedCount++;
          continue;
        }

        // Look up Product by productId
        let monthlyAllowance = 0;
        try {
          const product = await Product.findOne({
            productId: subscriptionPlan,
            isActive: true,
          }).session(session);

          if (product?.listingsLimit && product.listingsLimit > 0) {
            monthlyAllowance = product.listingsLimit;
            logger.info(`Backfill: Found product ${subscriptionPlan} for user ${user._id}: allowance=${monthlyAllowance}`);
          }
        } catch (productError) {
          logger.warn(`Could not find product for productId ${subscriptionPlan} for user ${user._id}`);
        }

        if (monthlyAllowance <= 0) {
          logger.warn(`Skipping user ${user._id}: Product has no listingsLimit or not found`);
          skippedCount++;
          continue;
        }

        // Set allowance (only if missing/zero)
        if (!user.subscription.listingsAllowanceThisMonth || user.subscription.listingsAllowanceThisMonth === 0) {
          user.subscription.listingsAllowanceThisMonth = monthlyAllowance;
        }

        // Set YTD to at least the monthly allowance (preserve existing carryover)
        if (!user.subscription.listingsAllowanceYTD || user.subscription.listingsAllowanceYTD === 0) {
          user.subscription.listingsAllowanceYTD = monthlyAllowance;
        }

        // Ensure cycle dates are set
        if (!user.subscription.subscriptionCycleStartDate) {
          user.subscription.subscriptionCycleStartDate =
            user.subscription.startDate || user.createdAt || new Date();
        }
        if (!user.subscription.subscriptionCycleEndDate) {
          user.subscription.subscriptionCycleEndDate = new Date(
            user.subscription.subscriptionCycleStartDate!.getTime() + 365 * 24 * 60 * 60 * 1000
          );
        }

        user.markModified('subscription');
        await user.save({ session });

        logger.info(
          `Backfilled user ${user._id}: listingsAllowanceThisMonth=${user.subscription.listingsAllowanceThisMonth}, YTD=${user.subscription.listingsAllowanceYTD}`
        );

        backfilledCount++;

        if (backfilledCount % 50 === 0) {
          logger.info(`Backfilled ${backfilledCount} users...`);
        }
      } catch (userError) {
        errorCount++;
        logger.error(`Error backfilling user ${user._id}:`, userError);
      }
    }

    await session.commitTransaction();

    logger.info(
      `Backfill completed: ${backfilledCount} users fixed, ${skippedCount} skipped, ${errorCount} errors`
    );
  } catch (error) {
    await session.abortTransaction();
    logger.error('Backfill failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Main migration function
 * Call this from the CLI or from your migration runner
 * Runs both the initial migration and the backfill
 */
export async function up(): Promise<void> {
  try {
    logger.info('Starting listing carryover migration...');
    await migrateListingCarryoverFields();
    logger.info('Initial migration completed, running backfill...');
    await backfillZeroAllowanceUsers();
    logger.info('Migration and backfill completed successfully');
  } catch (error) {
    logger.error('Migration/backfill failed:', error);
    throw error;
  }
}

/**
 * Rollback function (if needed)
 * This would remove the carryover fields (data loss - use with caution)
 */
export async function down(): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    logger.warn('Rolling back listing carryover migration...');

    await User.updateMany(
      {},
      {
        $unset: {
          'subscription.listingsAllowanceThisMonth': 1,
          'subscription.listingsAllowanceYTD': 1,
          'subscription.carryoverListings': 1,
          'subscription.subscriptionCycleStartDate': 1,
          'subscription.subscriptionCycleEndDate': 1,
          'subscription.listingsCreatedThisMonth': 1,
          'subscription.listingsArchivedDate': 1,
          'subscription.archiveNotificationSent': 1,
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

// Export for command-line usage
if (require.main === module) {
  const command = process.argv[2];

  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/balkanestate')
    .then(async () => {
      try {
        if (command === 'down') {
          await down();
        } else {
          await up();
        }
        process.exit(0);
      } catch (error) {
        logger.error('Migration error:', error);
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('Database connection error:', error);
      process.exit(1);
    });
}
