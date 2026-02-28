/**
 * Migration Script: Initialize subscription object for existing users
 * Run this once to migrate all users from legacy proSubscription to new subscription system
 *
 * Usage: npx ts-node src/scripts/migrateUserSubscription.ts <userEmail>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Property from '../models/Property';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('MigrateUserSub');

dotenv.config();

async function migrateUserSubscription(userEmail?: string) {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan_estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // Find users to migrate
    const query = userEmail ? { email: userEmail } : { subscription: { $exists: false } };
    const users = await User.find(query);

    log.info(`\n📊 Found ${users.length} user(s) to migrate\n`);

    for (const user of users) {
      log.info(`\n🔄 Migrating user: ${user.email} (${user._id})`);

      // Check if user has an active Pro subscription (legacy or new system)
      let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
      let listingsLimit = 3;
      let promotionCoupons = { monthly: 0, available: 0, used: 0, rollover: 0, lastRefresh: new Date() };
      let savedSearchesLimit = 1;

      // Sync from proSubscription (legacy system)
      if (user.proSubscription?.isActive) {
        tier = 'pro';
        listingsLimit = user.proSubscription.totalListingsLimit || 25;
        if (user.proSubscription.promotionCoupons) {
          promotionCoupons = {
            monthly: user.proSubscription.promotionCoupons.monthly || 3,
            available: user.proSubscription.promotionCoupons.available || 3,
            used: user.proSubscription.promotionCoupons.used || 0,
            rollover: 0,
            lastRefresh: new Date(),
          };
        }
        savedSearchesLimit = 10;
        log.info(`   ✅ Detected Pro subscription: ${listingsLimit} listings limit`);
      }

      // Count existing active properties to initialize counters correctly
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      const activeListingsCount = existingProperties.length;
      const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
      const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

      log.info(`   📊 Found ${activeListingsCount} existing properties: ${privateSellerCount} private, ${agentCount} agent`);

      // Create subscription object
      user.subscription = {
        tier,
        status: 'active',
        listingsLimit,
        activeListingsCount,
        privateSellerCount,
        agentCount,
        promotionCoupons,
        savedSearchesLimit,
        totalPaid: 0,
        startDate: user.proSubscription?.startedAt || new Date(),
        expiresAt: user.proSubscription?.expiresAt,
      };

      await user.save();

      log.info(`   ✅ Subscription initialized: ${tier} tier with ${listingsLimit} listings (${activeListingsCount}/${listingsLimit} used)`);
    }

    log.info(`\n✅ Migration complete! Migrated ${users.length} user(s)\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    log.error('❌ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get user email from command line args
const userEmail = process.argv[2];

if (userEmail) {
  log.info(`\n🎯 Migrating specific user: ${userEmail}\n`);
} else {
  log.info(`\n🎯 Migrating all users without subscription object\n`);
}

migrateUserSubscription(userEmail);
