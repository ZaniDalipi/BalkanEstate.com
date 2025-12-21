import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product';

dotenv.config();

const PRODUCTS = [
  // ============================================================================
  // FREE TIER (baseline for both sellers and agents with verified license)
  // ============================================================================
  {
    productId: 'free_tier',
    name: 'Free',
    description: 'Get started with basic listing features. Perfect for occasional sellers or agents testing the platform.',
    type: 'subscription' as const,
    tier: 'free' as const,
    price: 0,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '3 active listings',
      'Basic property details',
      'Photo gallery (up to 10 images)',
      'Contact form',
      'Search visibility',
    ],
    targetRole: 'seller' as const,
    displayOrder: 1,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 3,
    promotionCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 1,
  },

  // ============================================================================
  // PRO TIER - For individual sellers/agents
  // ============================================================================
  {
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional selling tools with monthly flexibility. Great for active sellers.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 12,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '25 active listings (8x more than Free!)',
      '3 promotion coupons per month (€90 value)',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority listing placement',
      'Featured badge on listings',
      'Email & SMS notifications',
      'Priority support',
      'No watermarks on images',
    ],
    targetRole: 'seller' as const,
    displayOrder: 2,
    badge: 'BEST VALUE',
    badgeColor: 'green',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-500',
      textColor: 'text-gray-900',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 25,
    promotionCoupons: 3,
    agentCoupons: 0,
    savedSearchesLimit: 10,
  },
  {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - save €24/year (2 months free!)',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 120,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '25 active listings year-round',
      '3 promotion coupons per month (rollover up to 6)',
      'All Pro Monthly features',
      'Save €24/year vs monthly',
      'Annual billing convenience',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority listing placement',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'SAVE 17%',
    badgeColor: 'amber',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-amber-50 to-yellow-50',
      borderColor: 'border-amber-500',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 3,
    listingsLimit: 25,
    promotionCoupons: 3,
    agentCoupons: 0,
    savedSearchesLimit: 10,
  },

  // ============================================================================
  // AGENCY TIER - For real estate agencies (€1000/year)
  // ============================================================================
  {
    productId: 'agency_yearly',
    name: 'Agency',
    description: 'Complete agency solution - equip your team with Pro subscriptions and shared promotion pool.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '5 yearly Pro agent coupons (€600 value)',
      '100 total listings (5 agents × 20 each)',
      '15 promotion coupons per month (agency-wide pool)',
      'Agency branding page with logo & cover',
      'Team dashboard & analytics',
      'Agent performance tracking',
      'Dedicated account manager',
      'White-label options',
      'Save €217/month vs 5 individual Pro accounts',
    ],
    targetRole: 'agent' as const,
    displayOrder: 4,
    badge: 'BEST FOR TEAMS',
    badgeColor: 'red',
    highlighted: true,
    cardStyle: {
      backgroundColor: 'from-slate-900 to-gray-800',
      borderColor: 'border-amber-400',
      textColor: 'text-white',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 7,
    listingsLimit: 0, // Agency owners don't get listings - they distribute coupons
    promotionCoupons: 15,
    agentCoupons: 5,
    savedSearchesLimit: 0,
  },

  // ============================================================================
  // BUYER TIER - For property buyers (€3/month)
  // ============================================================================
  {
    productId: 'buyer_monthly',
    name: 'Buyer Pro',
    description: 'Never miss your dream property - get instant alerts and market insights.',
    type: 'subscription' as const,
    tier: 'buyer' as const,
    price: 3,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      'Unlimited saved searches',
      'Instant email & SMS alerts',
      'Priority viewing access',
      'Price drop notifications',
      'New listing alerts (before public)',
      'Market insights & trends',
      'Investment calculator',
      'Mortgage pre-qualification',
      'Ad-free browsing',
      'Compare up to 10 properties',
    ],
    targetRole: 'buyer' as const,
    displayOrder: 5,
    badge: 'MOST POPULAR',
    badgeColor: 'blue',
    highlighted: false,
    cardStyle: {
      backgroundColor: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-500',
    },
    isActive: true,
    isVisible: true,
    hasFreeTrial: true,
    trialPeriodDays: 7,
    gracePeriodDays: 3,
    listingsLimit: 0, // Buyers don't create listings
    promotionCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // -1 = unlimited
  },
];

async function seedProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/balkan-estate';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Insert/update products
    for (const productData of PRODUCTS) {
      await Product.findOneAndUpdate(
        { productId: productData.productId },
        productData,
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded product: ${productData.name} (${productData.productId}) - €${productData.price}/${productData.billingPeriod}`);
    }

    console.log('\n🎉 Successfully seeded all products!');
    console.log(`📊 Total products: ${PRODUCTS.length}`);
    console.log('\n💰 Pricing Summary:');
    console.log('   Free: €0 (3 listings)');
    console.log('   Pro Monthly: €12 (25 listings, 3 promo coupons)');
    console.log('   Pro Yearly: €120 (25 listings, 3 promo coupons, save €24)');
    console.log('   Agency: €1000/year (5 agent coupons, 15 promo coupons)');
    console.log('   Buyer Pro: €3/month (unlimited searches & alerts)');

  } catch (error) {
    console.error('❌ Error seeding products:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seed function
seedProducts();
