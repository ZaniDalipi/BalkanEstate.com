import type { Migration, MigrationContext, MigrationResult } from '../types';

const COUPON_VALUES: Record<
  string,
  {
    promotionCoupons: number;
    premiumCoupons: number;
    highlightedCoupons: number;
    featuredCoupons: number;
    agentCoupons: number;
    teamMembersLimit?: number;
  }
> = {
  free_tier: {
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  pro_monthly: {
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  seller_pro_monthly: {
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  pro_yearly: {
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  seller_pro_yearly: {
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  agency_yearly: {
    promotionCoupons: 5,
    premiumCoupons: 2,
    highlightedCoupons: 2,
    featuredCoupons: 1,
    agentCoupons: 5,
    teamMembersLimit: 5,
  },
  seller_enterprise_yearly: {
    promotionCoupons: 5,
    premiumCoupons: 2,
    highlightedCoupons: 2,
    featuredCoupons: 1,
    agentCoupons: 5,
    teamMembersLimit: 5,
  },
};

const migration: Migration = {
  id: '20240320090000-migrate-product-coupons',
  name: 'Migrate product coupon values',
  description:
    'Updates all products with correct coupon allocations (promotion, premium, highlighted, featured, agent coupons and team limits).',

  async up(ctx: MigrationContext): Promise<MigrationResult> {
    const { db, dryRun } = ctx;
    let affectedDocuments = 0;

    try {
      const products = db.collection('products');

      if (dryRun) {
        const count = await products.countDocuments({
          productId: { $in: Object.keys(COUPON_VALUES) },
        });
        return {
          migrationId: migration.id,
          name: migration.name,
          direction: 'up',
          success: true,
          durationMs: 0,
          affectedDocuments: count,
        };
      }

      for (const [productId, values] of Object.entries(COUPON_VALUES)) {
        const setDoc: Record<string, any> = {
          promotionCoupons: values.promotionCoupons,
          premiumCoupons: values.premiumCoupons,
          highlightedCoupons: values.highlightedCoupons,
          featuredCoupons: values.featuredCoupons,
          agentCoupons: values.agentCoupons,
        };

        if (values.teamMembersLimit !== undefined) {
          setDoc.teamMembersLimit = values.teamMembersLimit;
        }

        const result = await products.updateOne(
          { productId },
          { $set: setDoc }
        );

        if (result.modifiedCount > 0) affectedDocuments++;
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

  // No safe rollback — we don't store the previous coupon values
  down: undefined,
};

export default migration;
