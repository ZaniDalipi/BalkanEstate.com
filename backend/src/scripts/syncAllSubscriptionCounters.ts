/**
 * Migration Script: Sync All Subscription Counters
 *
 * This script recounts all existing properties for all users and updates their subscription counters.
 * Run this to ensure the database is the single source of truth for subscription limits.
 *
 * Usage:
 *   npx ts-node src/scripts/syncAllSubscriptionCounters.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Property from '../models/Property';
import Product from '../models/Product';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('SyncSubCounters');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const syncAllSubscriptionCounters = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Get agent listings limit from DB product (configurable in admin)
    const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
    const agentListingsLimit = agentProduct?.listingsLimit ?? 25;

    // Get all users
    const users = await User.find({});
    log.info(`\n📊 Found ${users.length} users to sync\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        log.info(`\n🔄 Processing user: ${user.email}`);

        // Determine tier and limit from proSubscription or default to free
        let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
        let listingsLimit = 3;

        if (user.proSubscription?.isActive) {
          tier = 'pro';
          listingsLimit = user.proSubscription.totalListingsLimit || agentListingsLimit;
        }

        // Count existing properties for this user
        const existingProperties = await Property.find({
          sellerId: user._id,
          status: { $in: ['active', 'pending', 'draft'] }
        });

        const activeListingsCount = existingProperties.length;
        const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
        const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

        log.info(`   📈 Found ${activeListingsCount} properties: ${privateSellerCount} private seller, ${agentCount} agent`);

        // Initialize or update subscription object
        if (!user.subscription) {
          // Initialize new subscription
          const legacyCoupons = user.proSubscription?.promotionCoupons;
          const promotionCoupons = {
            monthly: tier === 'pro' ? 3 : 0,
            available: legacyCoupons?.highlightCoupons ?? (tier === 'pro' ? 3 : 0),
            used: legacyCoupons?.usedHighlightCoupons ?? 0,
            rollover: 0,
            lastRefresh: new Date(),
          };

          user.subscription = {
            tier,
            status: 'active',
            listingsLimit,
            activeListingsCount,
            privateSellerCount,
            agentCount,
            promotionCoupons,
            savedSearchesLimit: tier === 'pro' ? 10 : 3,
            totalPaid: 0,
            startDate: user.proSubscription?.startedAt || new Date(),
            expiresAt: user.proSubscription?.expiresAt,
          };
          log.info(`   ✨ Created new subscription: ${tier} tier with ${listingsLimit} limit`);
        } else {
          // Update existing subscription counters
          user.subscription.activeListingsCount = activeListingsCount;
          user.subscription.privateSellerCount = privateSellerCount;
          user.subscription.agentCount = agentCount;

          // Ensure listingsLimit is correct for agency agents
          if (user.subscription.tier === 'agency_agent' && user.subscription.listingsLimit !== agentListingsLimit) {
            log.info(`   🔧 Fixed listingsLimit: ${user.subscription.listingsLimit} -> ${agentListingsLimit}`);
            user.subscription.listingsLimit = agentListingsLimit;
          }

          log.info(`   ✅ Updated subscription counters`);
        }

        await user.save();
        log.info(`   💾 Saved to database: ${activeListingsCount}/${listingsLimit} listings used`);

        syncedCount++;
      } catch (error) {
        log.error(`   ❌ Error processing ${user.email}:`, error);
        errorCount++;
      }
    }

    log.info('\n' + '='.repeat(60));
    log.info('📊 SYNC COMPLETE');
    log.info('='.repeat(60));
    log.info(`✅ Successfully synced: ${syncedCount} users`);
    log.info(`⏭️  Skipped: ${skippedCount} users`);
    log.info(`❌ Errors: ${errorCount} users`);
    log.info('='.repeat(60) + '\n');

  } catch (error) {
    log.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the migration
syncAllSubscriptionCounters();
