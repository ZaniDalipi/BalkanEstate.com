import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PromotionCoupon from '../models/PromotionCoupon';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkan_estate';

const promotionCoupons = [
  // 100% off coupons for testing
  {
    code: 'TEST100',
    description: 'Test coupon - 100% off all promotion tiers',
    discountType: 'percentage' as const,
    discountValue: 100,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    status: 'active' as const,
    maxTotalUses: 1000,
    maxUsesPerUser: 100,
    applicableTiers: [],  // All tiers
    isPublic: false,
    notes: 'Development testing - 100% off',
  },
  {
    code: 'FREEPROMO',
    description: 'Free promotion for testing',
    discountType: 'percentage' as const,
    discountValue: 100,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxTotalUses: 500,
    maxUsesPerUser: 50,
    applicableTiers: [],
    isPublic: false,
    notes: 'Development testing - Free promotion',
  },

  // Percentage discount coupons
  {
    code: 'SUMMER25',
    description: 'Summer sale - 25% off all promotions',
    discountType: 'percentage' as const,
    discountValue: 25,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    status: 'active' as const,
    maxTotalUses: 200,
    maxUsesPerUser: 3,
    applicableTiers: [],
    isPublic: true,
    notes: 'Summer 2025 promotion campaign',
  },
  {
    code: 'FIRST50',
    description: 'First-time promotion - 50% off',
    discountType: 'percentage' as const,
    discountValue: 50,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    status: 'active' as const,
    maxTotalUses: 100,
    maxUsesPerUser: 1, // Only once per user
    applicableTiers: ['featured'], // Only for featured tier
    isPublic: true,
    notes: 'First-time user discount for featured tier',
  },
  {
    code: 'PREMIUM20',
    description: '20% off Premium promotions',
    discountType: 'percentage' as const,
    discountValue: 20,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    status: 'active' as const,
    maxTotalUses: 50,
    maxUsesPerUser: 2,
    applicableTiers: ['premium'],
    isPublic: true,
    notes: 'Premium tier special discount',
  },

  // Fixed amount discount coupons
  {
    code: 'SAVE5',
    description: 'Save €5 on any promotion',
    discountType: 'fixed' as const,
    discountValue: 5,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxTotalUses: 500,
    maxUsesPerUser: 5,
    minimumPurchaseAmount: 10, // Minimum €10 purchase
    applicableTiers: [],
    isPublic: true,
    notes: 'Fixed €5 discount coupon',
  },
  {
    code: 'SAVE10',
    description: 'Save €10 on highlight or premium',
    discountType: 'fixed' as const,
    discountValue: 10,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxTotalUses: 200,
    maxUsesPerUser: 3,
    minimumPurchaseAmount: 20,
    applicableTiers: ['highlight', 'premium'],
    isPublic: true,
    notes: 'Fixed €10 discount for higher tiers',
  },

  // Agency coupons
  {
    code: 'AGENCY30',
    description: 'Agency partner discount - 30% off',
    discountType: 'percentage' as const,
    discountValue: 30,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxTotalUses: 1000,
    maxUsesPerUser: 20,
    applicableTiers: [],
    isPublic: false, // Only shared with agencies
    notes: 'Agency partner program discount',
  },

  // Welcome coupon
  {
    code: 'WELCOME15',
    description: 'Welcome bonus - 15% off first promotion',
    discountType: 'percentage' as const,
    discountValue: 15,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxUsesPerUser: 1,
    applicableTiers: [],
    isPublic: true,
    notes: 'Welcome coupon for new users',
  },

  // Bulk promotion coupon
  {
    code: 'BULK40',
    description: '40% off for 30+ day promotions',
    discountType: 'percentage' as const,
    discountValue: 40,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    status: 'active' as const,
    maxTotalUses: 100,
    maxUsesPerUser: 5,
    minimumPurchaseAmount: 50, // Must spend at least €50
    applicableTiers: [],
    isPublic: true,
    notes: 'Discount for longer duration promotions',
  },
];

async function seedPromotionCoupons() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check existing coupons
    const existingCount = await PromotionCoupon.countDocuments();
    console.log(`📊 Found ${existingCount} existing promotion coupons`);

    // Delete existing coupons (optional - comment out if you want to keep existing ones)
    if (existingCount > 0) {
      console.log('🗑️ Removing existing promotion coupons...');
      await PromotionCoupon.deleteMany({});
    }

    // Insert new coupons
    console.log(`📝 Creating ${promotionCoupons.length} promotion coupons...`);

    for (const couponData of promotionCoupons) {
      const coupon = await PromotionCoupon.create(couponData);
      console.log(`  ✅ Created coupon: ${coupon.code} (${coupon.description})`);
    }

    console.log('\n🎉 Promotion coupons seeded successfully!');
    console.log('\n📋 Available test coupons:');
    console.log('   TEST100   - 100% off (for testing)');
    console.log('   FREEPROMO - 100% off (for testing)');
    console.log('   SUMMER25  - 25% off all tiers');
    console.log('   FIRST50   - 50% off featured tier (first use only)');
    console.log('   PREMIUM20 - 20% off premium tier');
    console.log('   SAVE5     - €5 off (min €10)');
    console.log('   SAVE10    - €10 off highlight/premium (min €20)');
    console.log('   AGENCY30  - 30% off (agency partners)');
    console.log('   WELCOME15 - 15% off first promotion');
    console.log('   BULK40    - 40% off (min €50 purchase)');

  } catch (error) {
    console.error('❌ Error seeding promotion coupons:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
    process.exit(0);
  }
}

seedPromotionCoupons();
