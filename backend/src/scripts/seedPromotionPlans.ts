import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import PromotionPlan from '../models/PromotionPlan';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env.toUpperCase()}`);

const PROMOTION_PLANS = [
  // ============================================================================
  // LISTING PROMOTION PLANS
  // ============================================================================
  {
    category: 'listing',
    tier: 'featured',
    name: 'Featured',
    description: 'Priority in search',
    icon: '⭐',
    pricing: { duration7: 9, duration30: 29, duration90: 69 },
    features: ['Top of search', 'Featured badge', '2x visibility'],
    visibilityMultiplier: '2x',
    displayOrder: 1,
    isAddOn: false,
    highlighted: false,
    isActive: true,
    isVisible: true,
    cardStyle: {
      gradientFrom: 'purple-50',
      gradientTo: 'purple-100/50',
      borderColor: 'purple-200',
      iconBgColor: 'purple-500',
      priceColor: 'purple-600',
    },
  },
  {
    category: 'listing',
    tier: 'highlight',
    name: 'Highlight',
    description: 'Stand out',
    icon: '💎',
    pricing: { duration7: 19, duration30: 49, duration90: 119 },
    features: ['Featured benefits', 'Colored highlight', '3x visibility'],
    visibilityMultiplier: '3x',
    displayOrder: 2,
    badge: 'Popular',
    highlighted: true,
    isAddOn: false,
    isActive: true,
    isVisible: true,
    cardStyle: {
      gradientFrom: 'cyan-50',
      gradientTo: 'cyan-100/50',
      borderColor: 'cyan-300',
      iconBgColor: 'gradient-to-br from-cyan-400 to-blue-500',
      priceColor: 'cyan-600',
    },
  },
  {
    category: 'listing',
    tier: 'premium',
    name: 'Premium',
    description: 'Homepage featured',
    icon: '🏆',
    pricing: { duration7: 39, duration30: 99, duration90: 229 },
    features: ['Highlight benefits', 'Homepage carousel', '5x visibility'],
    visibilityMultiplier: '5x',
    displayOrder: 3,
    isAddOn: false,
    highlighted: false,
    isActive: true,
    isVisible: true,
    cardStyle: {
      gradientFrom: 'amber-50',
      gradientTo: 'yellow-100/50',
      borderColor: 'amber-200',
      iconBgColor: 'gradient-to-br from-amber-400 to-yellow-500',
      priceColor: 'amber-600',
    },
  },

  // ============================================================================
  // AGENCY PROMOTION PLANS
  // ============================================================================
  {
    category: 'agency',
    tier: 'featured',
    name: 'Featured Agency',
    description: 'Featured everywhere on the platform',
    icon: '🏢',
    pricing: { duration7: 19 }, // Only 7-day option
    features: [
      'Featured in agency directory',
      'Priority in search results',
      'Homepage agency carousel',
      'Featured badge on profile',
      'Boosted visibility everywhere',
    ],
    visibilityMultiplier: '3x',
    displayOrder: 1,
    isAddOn: false,
    highlighted: true,
    badge: 'Popular',
    isActive: true,
    isVisible: true,
    cardStyle: {
      gradientFrom: 'amber-50',
      gradientTo: 'orange-50',
      borderColor: 'amber-300',
      iconBgColor: 'gradient-to-br from-amber-400 to-orange-500',
      priceColor: 'amber-600',
    },
  },
];

async function seedPromotionPlans() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check for --force flag to override existing data
    const forceUpdate = process.argv.includes('--force');

    if (!forceUpdate) {
      // Check if plans already exist
      const existingCount = await PromotionPlan.countDocuments();
      if (existingCount > 0) {
        console.log(`⚠️  Promotion plans already exist (${existingCount} plans)`);
        console.log('   Use --force flag to update existing plans');
        await mongoose.disconnect();
        return;
      }
    }

    // Use upsert to update or create
    for (const planData of PROMOTION_PLANS) {
      await PromotionPlan.findOneAndUpdate(
        { category: planData.category, tier: planData.tier, name: planData.name },
        planData,
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded: ${planData.name} (${planData.category}) - €${planData.pricing.duration7 || planData.pricing.duration30}/7days`);
    }

    console.log('\n🎉 Successfully seeded all promotion plans!');
    console.log(`📊 Total plans: ${PROMOTION_PLANS.length}`);
    console.log('\n💰 Promotion Plans Summary:');
    console.log('   LISTING PROMOTIONS:');
    console.log('     Featured: €9/7d, €29/30d, €69/90d (2x visibility)');
    console.log('     Highlight: €19/7d, €49/30d, €119/90d (3x visibility)');
    console.log('     Premium: €39/7d, €99/30d, €229/90d (5x visibility)');
    console.log('   AGENCY PROMOTIONS:');
    console.log('     Featured Agency: €19/week (3x visibility, shown everywhere)');

  } catch (error) {
    console.error('❌ Error seeding promotion plans:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedPromotionPlans();
