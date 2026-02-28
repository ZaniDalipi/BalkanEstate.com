import type { Migration, MigrationContext, MigrationResult } from '../types';

const migration: Migration = {
  id: '20240325100000-migrate-user-subscription',
  name: 'Initialize user subscription objects',
  description:
    'Creates the subscription object for users that still lack one, syncing from legacy proSubscription and counting existing active properties.',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const users = db.collection('users');
      const properties = db.collection('properties');

      const pendingUsers = await users
        .find({ subscription: { $exists: false } })
        .toArray();

      if (dryRun) {
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'up',
          success: true,
          durationMs: 0,
          affectedDocuments: pendingUsers.length,
        };
      }

      for (const user of pendingUsers) {
        let tier = 'free';
        let listingsLimit = 3;
        let promotionCoupons = {
          monthly: 0,
          available: 0,
          used: 0,
          rollover: 0,
          lastRefresh: new Date(),
        };
        let savedSearchesLimit = 1;

        if (user.proSubscription?.isActive) {
          tier = 'pro';
          listingsLimit = user.proSubscription.totalListingsLimit || 25;
          promotionCoupons = {
            monthly: user.proSubscription.promotionCoupons?.monthly || 3,
            available: user.proSubscription.promotionCoupons?.available || 3,
            used: user.proSubscription.promotionCoupons?.used || 0,
            rollover: 0,
            lastRefresh: new Date(),
          };
          savedSearchesLimit = 10;
        }

        // Count existing active properties
        const existingProperties = await properties
          .find({
            sellerId: user._id,
            status: { $in: ['active', 'pending', 'draft'] },
          })
          .toArray();

        const activeListingsCount = existingProperties.length;
        const privateSellerCount = existingProperties.filter(
          (p: any) => p.createdAsRole === 'private_seller'
        ).length;
        const agentCount = existingProperties.filter(
          (p: any) => p.createdAsRole === 'agent'
        ).length;

        const subscriptionDoc: Record<string, any> = {
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
        };

        if (user.proSubscription?.expiresAt) {
          subscriptionDoc.expiresAt = user.proSubscription.expiresAt;
        }

        await users.updateOne(
          { _id: user._id },
          { $set: { subscription: subscriptionDoc } }
        );
        affectedDocuments++;
      }

      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'up',
        success: true,
        durationMs: 0,
        affectedDocuments,
      };
    } catch (error: any) {
      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'up',
        success: false,
        durationMs: 0,
        error: error.message,
      };
    }
  },

  async down(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;

    try {
      const users = db.collection('users');

      if (dryRun) {
        const count = await users.countDocuments({
          subscription: { $exists: true },
        });
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'down',
          success: true,
          durationMs: 0,
          affectedDocuments: count,
        };
      }

      const result = await users.updateMany(
        { subscription: { $exists: true } },
        { $unset: { subscription: '' } }
      );

      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: true,
        durationMs: 0,
        affectedDocuments: result.modifiedCount,
      };
    } catch (error: any) {
      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: false,
        durationMs: 0,
        error: error.message,
      };
    }
  },
};

export default migration;
