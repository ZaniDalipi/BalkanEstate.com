import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';
import { scriptLogger } from '../utils/logger';

const log = scriptLogger.child('MigrateProductCoupons');

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

log.info(`🌍 Environment: ${env.toUpperCase()}`);

/**
 * Coupon values for each product type
 * These values should match the seedProducts.ts
 */
const COUPON_VALUES: Record<string, {
  promotionCoupons: number;
  premiumCoupons: number;
  highlightedCoupons: number;
  featuredCoupons: number;
  agentCoupons: number;
  teamMembersLimit?: number;
}> = {
  // Free tier
  free_tier: {
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
  },
  // Pro Monthly
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
  // Pro Yearly
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
  // Enterprise/Agency
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

async function migrateProductCoupons() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    log.info('✅ Connected to MongoDB');

    // First, check for any duplicate productIds
    log.info('\n📊 Checking for duplicates...');
    const allProducts = await Product.find({}).lean();
    const productIdCounts = new Map<string, number>();

    allProducts.forEach(p => {
      const count = productIdCounts.get(p.productId) || 0;
      productIdCounts.set(p.productId, count + 1);
    });

    const duplicates = Array.from(productIdCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      log.warn('⚠️  Found duplicate productIds:');
      duplicates.forEach(([id, count]) => {
        log.warn(`   - ${id}: ${count} entries`);
      });
    } else {
      log.info('✅ No duplicates found');
    }

    // Show current values
    log.info('\n📋 Current product coupon values:');
    for (const product of allProducts) {
      if (COUPON_VALUES[product.productId]) {
        log.info(`\n   ${product.name} (${product.productId}):`);
        log.info(`     promotionCoupons: ${product.promotionCoupons ?? 'undefined'}`);
        log.info(`     premiumCoupons: ${product.premiumCoupons ?? 'undefined'}`);
        log.info(`     highlightedCoupons: ${product.highlightedCoupons ?? 'undefined'}`);
        log.info(`     featuredCoupons: ${product.featuredCoupons ?? 'undefined'}`);
        log.info(`     agentCoupons: ${product.agentCoupons ?? 'undefined'}`);
        log.info(`     teamMembersLimit: ${product.teamMembersLimit ?? 'undefined'}`);
      }
    }

    // Update products with correct coupon values
    log.info('\n🔄 Updating products with correct coupon values...');

    for (const [productId, values] of Object.entries(COUPON_VALUES)) {
      const result = await Product.findOneAndUpdate(
        { productId },
        {
          $set: {
            promotionCoupons: values.promotionCoupons,
            premiumCoupons: values.premiumCoupons,
            highlightedCoupons: values.highlightedCoupons,
            featuredCoupons: values.featuredCoupons,
            agentCoupons: values.agentCoupons,
            ...(values.teamMembersLimit !== undefined && { teamMembersLimit: values.teamMembersLimit }),
          }
        },
        { new: true }
      );

      if (result) {
        log.info(`   ✅ Updated ${productId}:`);
        log.info(`      promotionCoupons: ${result.promotionCoupons}`);
        log.info(`      premiumCoupons: ${result.premiumCoupons}`);
        log.info(`      highlightedCoupons: ${result.highlightedCoupons}`);
        log.info(`      featuredCoupons: ${result.featuredCoupons}`);
        log.info(`      agentCoupons: ${result.agentCoupons}`);
      } else {
        log.warn(`   ⚠️  Product not found: ${productId}`);
      }
    }

    log.info('\n🎉 Migration completed successfully!');

  } catch (error) {
    log.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('\n👋 Disconnected from MongoDB');
  }
}

// Run the migration
migrateProductCoupons();
