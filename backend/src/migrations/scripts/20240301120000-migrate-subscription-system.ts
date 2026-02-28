import type { Migration, MigrationContext, MigrationResult } from '../types';

const migration: Migration = {
  id: '20240301120000-migrate-subscription-system',
  name: 'Migrate to new subscription system',
  description:
    'Migrates users from the old dual subscription system (proSubscription + freeSubscription) to the new unified subscription structure with tier, status, limits, and promotion coupons.',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const users = db.collection('users');
      const agencies = db.collection('agencies');
      const products = db.collection('products');

      // Get agent listings limit from the product config
      const agentProduct = await products.findOne({ productId: 'agency_agent_yearly' });
      const agentListingsLimit = agentProduct?.listingsLimit ?? 25;

      // Find users that haven't been migrated yet (no subscription.tier)
      const pendingUsers = await users
        .find({
          $or: [
            { 'subscription.tier': { $exists: false } },
            { subscription: { $exists: false } },
          ],
        })
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
        let tier: string = 'free';
        let listingsLimit = 3;
        let promotionCouponsMonthly = 0;
        let savedSearchesLimit = 1;
        let status = 'active';
        let expiresAt: Date | undefined;

        // Check Pro subscription
        if (user.proSubscription?.isActive) {
          tier = 'pro';
          listingsLimit = agentListingsLimit;
          promotionCouponsMonthly = 3;
          savedSearchesLimit = 10;
          expiresAt = user.proSubscription.expiresAt;
        }

        // Check agency owner
        if (user.agencyId) {
          const ownerAgency = await agencies.findOne({ ownerId: user._id });
          if (ownerAgency) {
            tier = 'agency_owner';
            listingsLimit = 0;
            promotionCouponsMonthly = 0;
          } else {
            const agentAgency = await agencies.findOne({ _id: user.agencyId });
            if (agentAgency) {
              tier = 'agency_agent';
              listingsLimit = agentListingsLimit;
              promotionCouponsMonthly = 0;
            }
          }
        }

        // Check buyer
        if (user.role === 'buyer') {
          tier = 'buyer';
          listingsLimit = 0;
          promotionCouponsMonthly = 0;
          savedSearchesLimit = -1;
        }

        const updateDoc: Record<string, any> = {
          'subscription.tier': tier,
          'subscription.status': status,
          'subscription.listingsLimit': listingsLimit,
          'subscription.activeListingsCount': user.proSubscription?.activeListingsCount || 0,
          'subscription.privateSellerCount': user.proSubscription?.privateSellerCount || 0,
          'subscription.agentCount': user.proSubscription?.agentCount || 0,
          'subscription.promotionCoupons.monthly': promotionCouponsMonthly,
          'subscription.promotionCoupons.available': promotionCouponsMonthly,
          'subscription.promotionCoupons.used': 0,
          'subscription.promotionCoupons.rollover': 0,
          'subscription.promotionCoupons.lastRefresh': new Date(),
          'subscription.savedSearchesLimit': savedSearchesLimit,
          'subscription.totalPaid': 0,
        };

        if (expiresAt) {
          updateDoc['subscription.expiresAt'] = expiresAt;
        }

        if (user.agencyId) {
          updateDoc['agency.agencyId'] = user.agencyId;
          updateDoc['agency.role'] =
            tier === 'agency_owner' ? 'owner' : tier === 'agency_agent' ? 'agent' : 'none';
          updateDoc['agency.joinedAt'] = new Date();
        }

        await users.updateOne({ _id: user._id }, { $set: updateDoc });
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
    let affectedDocuments = 0;

    try {
      const users = db.collection('users');

      const migratedUsers = await users
        .find({ 'subscription.tier': { $exists: true } })
        .toArray();

      if (dryRun) {
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'down',
          success: true,
          durationMs: 0,
          affectedDocuments: migratedUsers.length,
        };
      }

      for (const user of migratedUsers) {
        await users.updateOne(
          { _id: user._id },
          { $unset: { subscription: '', agency: '' } }
        );
        affectedDocuments++;
      }

      return {
        migrationId: migration.id,
        name: migration.name,
        direction: 'down',
        success: true,
        durationMs: 0,
        affectedDocuments,
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
