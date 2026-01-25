import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env.toUpperCase()}`);

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
    console.log('✅ Connected to MongoDB');

    // First, check for any duplicate productIds
    console.log('\n📊 Checking for duplicates...');
    const allProducts = await Product.find({}).lean();
    const productIdCounts = new Map<string, number>();

    allProducts.forEach(p => {
      const count = productIdCounts.get(p.productId) || 0;
      productIdCounts.set(p.productId, count + 1);
    });

    const duplicates = Array.from(productIdCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate productIds:');
      duplicates.forEach(([id, count]) => {
        console.log(`   - ${id}: ${count} entries`);
      });
    } else {
      console.log('✅ No duplicates found');
    }

    // Show current values
    console.log('\n📋 Current product coupon values:');
    for (const product of allProducts) {
      if (COUPON_VALUES[product.productId]) {
        console.log(`\n   ${product.name} (${product.productId}):`);
        console.log(`     promotionCoupons: ${product.promotionCoupons ?? 'undefined'}`);
        console.log(`     premiumCoupons: ${product.premiumCoupons ?? 'undefined'}`);
        console.log(`     highlightedCoupons: ${product.highlightedCoupons ?? 'undefined'}`);
        console.log(`     featuredCoupons: ${product.featuredCoupons ?? 'undefined'}`);
        console.log(`     agentCoupons: ${product.agentCoupons ?? 'undefined'}`);
        console.log(`     teamMembersLimit: ${product.teamMembersLimit ?? 'undefined'}`);
      }
    }

    // Update products with correct coupon values
    console.log('\n🔄 Updating products with correct coupon values...');

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
        console.log(`   ✅ Updated ${productId}:`);
        console.log(`      promotionCoupons: ${result.promotionCoupons}`);
        console.log(`      premiumCoupons: ${result.premiumCoupons}`);
        console.log(`      highlightedCoupons: ${result.highlightedCoupons}`);
        console.log(`      featuredCoupons: ${result.featuredCoupons}`);
        console.log(`      agentCoupons: ${result.agentCoupons}`);
      } else {
        console.log(`   ⚠️  Product not found: ${productId}`);
      }
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the migration
migrateProductCoupons();
