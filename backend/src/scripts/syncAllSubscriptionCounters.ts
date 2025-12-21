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

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const syncAllSubscriptionCounters = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`\n📊 Found ${users.length} users to sync\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n🔄 Processing user: ${user.email}`);

        // Determine tier and limit from proSubscription or default to free
        let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
        let listingsLimit = 3;

        if (user.proSubscription?.isActive) {
          tier = 'pro';
          listingsLimit = user.proSubscription.totalListingsLimit || 25;
        }

        // Count existing properties for this user
        const existingProperties = await Property.find({
          sellerId: user._id,
          status: { $in: ['active', 'pending', 'draft'] }
        });

        const activeListingsCount = existingProperties.length;
        const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
        const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

        console.log(`   📈 Found ${activeListingsCount} properties: ${privateSellerCount} private seller, ${agentCount} agent`);

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
          console.log(`   ✨ Created new subscription: ${tier} tier with ${listingsLimit} limit`);
        } else {
          // Update existing subscription counters
          user.subscription.activeListingsCount = activeListingsCount;
          user.subscription.privateSellerCount = privateSellerCount;
          user.subscription.agentCount = agentCount;

          // Ensure listingsLimit is correct
          if (user.subscription.tier === 'pro' && user.subscription.listingsLimit !== 25) {
            user.subscription.listingsLimit = 25;
            console.log(`   🔧 Fixed listingsLimit: ${user.subscription.listingsLimit} -> 25`);
          }

          console.log(`   ✅ Updated subscription counters`);
        }

        await user.save();
        console.log(`   💾 Saved to database: ${activeListingsCount}/${listingsLimit} listings used`);

        syncedCount++;
      } catch (error) {
        console.error(`   ❌ Error processing ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully synced: ${syncedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the migration
syncAllSubscriptionCounters();
