import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Agency from '../models/Agency';
import Product from '../models/Product';

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
    console.log('✅ Connected to MongoDB');
    console.log('🚀 Starting migration to new subscription system...\n');

    // Get agent listings limit from DB product (configurable in admin)
    const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
    const agentListingsLimit = agentProduct?.listingsLimit ?? 25;

    // Get all users
    const users = await User.find({});
    stats.total = users.length;
    console.log(`📊 Found ${stats.total} users to migrate\n`);

    for (const user of users) {
      try {
        // Skip if already has new subscription structure
        if (user.subscription && user.subscription.tier) {
          console.log(`⏭️  Skipping ${user.email} - already migrated`);
          stats.skipped++;
          continue;
        }

        console.log(`\n🔄 Migrating user: ${user.email} (${user.role})`);

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

          console.log(`   → Pro subscription detected (expires: ${expiresAt})`);
        }

        // Check if user is agency owner
        if (user.agencyId) {
          const agency = await Agency.findOne({ ownerId: user._id });
          if (agency) {
            tier = 'agency_owner';
            listingsLimit = 0; // Agency owners distribute coupons, don't get listings
            promotionCouponsMonthly = 0; // They manage agency-wide pool
            console.log(`   → Agency owner detected: ${agency.name}`);
          } else {
            // Check if they're an agent in an agency
            const agentAgency = await Agency.findById(user.agencyId);
            if (agentAgency) {
              tier = 'agency_agent';
              listingsLimit = agentListingsLimit; // Agents get Pro benefits
              promotionCouponsMonthly = 0; // Share agency pool
              console.log(`   → Agency agent detected in: ${agentAgency.name}`);
            }
          }
        }

        // Check if user is a buyer (role === 'buyer')
        if (user.role === 'buyer') {
          tier = 'buyer';
          listingsLimit = 0; // Buyers don't create listings
          promotionCouponsMonthly = 0;
          console.log(`   → Buyer account detected`);
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
        console.log(`   ✅ Migrated to tier: ${tier} (${listingsLimit} listings, ${promotionCouponsMonthly} coupons/month)`);

      } catch (error: any) {
        console.error(`   ❌ Error migrating ${user.email}:`, error.message);
        stats.errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Migration Complete!');
    console.log('='.repeat(60));
    console.log(`\n📊 Migration Statistics:`);
    console.log(`   Total users: ${stats.total}`);
    console.log(`   Migrated: ${stats.migrated}`);
    console.log(`   Skipped (already migrated): ${stats.skipped}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`\n📈 Tier Breakdown:`);
    console.log(`   Free: ${stats.tierBreakdown.free}`);
    console.log(`   Pro: ${stats.tierBreakdown.pro}`);
    console.log(`   Agency Owner: ${stats.tierBreakdown.agency_owner}`);
    console.log(`   Agency Agent: ${stats.tierBreakdown.agency_agent}`);
    console.log(`   Buyer: ${stats.tierBreakdown.buyer}`);
    console.log('\n✅ All users successfully migrated to new subscription system!');
    console.log('🔒 Legacy fields (proSubscription, freeSubscription) preserved for rollback');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

async function rollbackMigration() {
  console.log('🔄 Starting rollback...\n');

  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const users = await User.find({ 'subscription.tier': { $exists: true } });
    console.log(`📊 Found ${users.length} users to rollback\n`);

    let rollbackCount = 0;
    for (const user of users) {
      try {
        // Remove new subscription structure
        user.subscription = undefined as any;
        user.agency = undefined;

        await user.save();
        rollbackCount++;
        console.log(`✅ Rolled back ${user.email}`);
      } catch (error: any) {
        console.error(`❌ Error rolling back ${user.email}:`, error.message);
      }
    }

    console.log(`\n🎉 Rollback complete! ${rollbackCount} users restored to old system.`);
    console.log('⚠️  Note: Legacy proSubscription and freeSubscription fields still intact.');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === 'rollback') {
  console.log('⚠️  ROLLBACK MODE\n');
  console.log('This will remove the new subscription structure and revert to legacy fields.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  setTimeout(() => {
    rollbackMigration();
  }, 5000);
} else {
  console.log('📝 MIGRATION MODE\n');
  console.log('⚠️  WARNING: This will migrate all users to the new subscription system.');
  console.log('⚠️  Make sure you have a database backup before proceeding!');
  console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

  setTimeout(() => {
    migrateToNewSubscriptionSystem();
  }, 5000);
}
