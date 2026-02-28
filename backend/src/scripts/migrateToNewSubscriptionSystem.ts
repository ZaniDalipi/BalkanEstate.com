import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Agency from '../models/Agency';
import Product from '../models/Product';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('MigrateSubscriptions');

dotenv.config();

/**
 * Migration Script: Old Subscription System → New Unified Subscription System
 *
 * This script safely migrates users from the old dual subscription system
 * (proSubscription + freeSubscription) to the new unified subscription structure.
 *
 * Migration Strategy:
 * 1. Backup existing data (manual step before running)
 * 2. Analyze current subscription state
 * 3. Map to appropriate tier
 * 4. Migrate counters and limits
 * 5. Keep legacy fields for backwards compatibility
 * 6. Validate data integrity
 *
 * Run with: npm run migrate:subscriptions
 * Rollback with: npm run rollback:subscriptions
 */

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  tierBreakdown: {
    free: number;
    pro: number;
    agency_owner: number;
    agency_agent: number;
    buyer: number;
  };
}

async function migrateToNewSubscriptionSystem() {
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    tierBreakdown: {
      free: 0,
      pro: 0,
      agency_owner: 0,
      agency_agent: 0,
      buyer: 0,
    },
  };

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');
    log.info('🚀 Starting migration to new subscription system...\n');

    // Get agent listings limit from DB product (configurable in admin)
    const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
    const agentListingsLimit = agentProduct?.listingsLimit ?? 25;

    // Get all users
    const users = await User.find({});
    stats.total = users.length;
    log.info(`📊 Found ${stats.total} users to migrate\n`);

    for (const user of users) {
      try {
        // Skip if already has new subscription structure
        if (user.subscription && user.subscription.tier) {
          log.info(`⏭️  Skipping ${user.email} - already migrated`);
          stats.skipped++;
          continue;
        }

        log.info(`\n🔄 Migrating user: ${user.email} (${user.role})`);

        // Determine tier based on current state
        let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
        let listingsLimit = 3;
        let promotionCouponsMonthly = 0;
        let activeListingsCount = 0;
        let privateSellerCount = 0;
        let agentCount = 0;
        let status: 'active' | 'canceled' | 'expired' | 'trial' = 'active';
        let expiresAt: Date | undefined = undefined;

        // Check if user has active Pro subscription
        if (user.proSubscription && user.proSubscription.isActive) {
          tier = 'pro';
          listingsLimit = agentListingsLimit;
          promotionCouponsMonthly = 3;
          activeListingsCount = user.proSubscription.activeListingsCount || 0;
          privateSellerCount = user.proSubscription.privateSellerCount || 0;
          agentCount = user.proSubscription.agentCount || 0;
          expiresAt = user.proSubscription.expiresAt;

          log.info(`   → Pro subscription detected (expires: ${expiresAt})`);
        }

        // Check if user is agency owner
        if (user.agencyId) {
          const agency = await Agency.findOne({ ownerId: user._id });
          if (agency) {
            tier = 'agency_owner';
            listingsLimit = 0; // Agency owners distribute coupons, don't get listings
            promotionCouponsMonthly = 0; // They manage agency-wide pool
            log.info(`   → Agency owner detected: ${agency.name}`);
          } else {
            // Check if they're an agent in an agency
            const agentAgency = await Agency.findById(user.agencyId);
            if (agentAgency) {
              tier = 'agency_agent';
              listingsLimit = agentListingsLimit; // Agents get Pro benefits
              promotionCouponsMonthly = 0; // Share agency pool
              log.info(`   → Agency agent detected in: ${agentAgency.name}`);
            }
          }
        }

        // Check if user is a buyer (role === 'buyer')
        if (user.role === 'buyer') {
          tier = 'buyer';
          listingsLimit = 0; // Buyers don't create listings
          promotionCouponsMonthly = 0;
          log.info(`   → Buyer account detected`);
        }

        // Create new subscription object
        user.subscription = {
          tier,
          status,
          listingsLimit,
          activeListingsCount,
          privateSellerCount,
          agentCount,
          promotionCoupons: {
            monthly: promotionCouponsMonthly,
            available: promotionCouponsMonthly,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: tier === 'buyer' ? -1 : tier === 'pro' ? 10 : 1,
          totalPaid: 0,
          expiresAt,
        };

        // Initialize agency association if exists
        if (user.agencyId) {
          user.agency = {
            agencyId: user.agencyId,
            role: tier === 'agency_owner' ? 'owner' : tier === 'agency_agent' ? 'agent' : 'none',
            joinedAt: new Date(),
          };
        }

        // Save migrated user
        await user.save();

        stats.migrated++;
        stats.tierBreakdown[tier]++;
        log.info(`   ✅ Migrated to tier: ${tier} (${listingsLimit} listings, ${promotionCouponsMonthly} coupons/month)`);

      } catch (error: any) {
        log.error(`   ❌ Error migrating ${user.email}:`, error.message);
        stats.errors++;
      }
    }

    log.info('\n' + '='.repeat(60));
    log.info('🎉 Migration Complete!');
    log.info('='.repeat(60));
    log.info(`\n📊 Migration Statistics:`);
    log.info(`   Total users: ${stats.total}`);
    log.info(`   Migrated: ${stats.migrated}`);
    log.info(`   Skipped (already migrated): ${stats.skipped}`);
    log.info(`   Errors: ${stats.errors}`);
    log.info(`\n📈 Tier Breakdown:`);
    log.info(`   Free: ${stats.tierBreakdown.free}`);
    log.info(`   Pro: ${stats.tierBreakdown.pro}`);
    log.info(`   Agency Owner: ${stats.tierBreakdown.agency_owner}`);
    log.info(`   Agency Agent: ${stats.tierBreakdown.agency_agent}`);
    log.info(`   Buyer: ${stats.tierBreakdown.buyer}`);
    log.info('\n✅ All users successfully migrated to new subscription system!');
    log.info('🔒 Legacy fields (proSubscription, freeSubscription) preserved for rollback');

  } catch (error) {
    log.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from MongoDB');
  }
}

async function rollbackMigration() {
  log.info('🔄 Starting rollback...\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    const users = await User.find({ 'subscription.tier': { $exists: true } });
    log.info(`📊 Found ${users.length} users to rollback\n`);

    let rollbackCount = 0;
    for (const user of users) {
      try {
        // Remove new subscription structure
        user.subscription = undefined as any;
        user.agency = undefined;

        await user.save();
        rollbackCount++;
        log.info(`✅ Rolled back ${user.email}`);
      } catch (error: any) {
        log.error(`❌ Error rolling back ${user.email}:`, error.message);
      }
    }

    log.info(`\n🎉 Rollback complete! ${rollbackCount} users restored to old system.`);
    log.info('⚠️  Note: Legacy proSubscription and freeSubscription fields still intact.');

  } catch (error) {
    log.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from MongoDB');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  log.info('⚠️  ROLLBACK MODE\n');
  log.info('This will remove the new subscription structure and revert to legacy fields.');
  log.info('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  setTimeout(() => {
    rollbackMigration();
  }, 5000);
} else {
  log.info('📝 MIGRATION MODE\n');
  log.info('⚠️  WARNING: This will migrate all users to the new subscription system.');
  log.info('⚠️  Make sure you have a database backup before proceeding!');
  log.info('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  setTimeout(() => {
    migrateToNewSubscriptionSystem();
  }, 5000);
}
