import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/Product';

// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

console.log(`🌍 Environment: ${env.toUpperCase()}`);

const PRODUCTS = [
  // ============================================================================
  // FREE TIER - Basic access with limited AI features
  // ============================================================================
  {
    productId: 'free_tier',
    name: 'Free',
    description: 'Get started with basic listing features and limited AI tools.',
    type: 'subscription' as const,
    tier: 'free' as const,
    price: 0,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '3 active listings',
      '3 saved searches',
      '3 AI chat messages',
      '3 generate insights',
      'Basic property details',
      'Photo gallery (up to 10 images)',
    ],
    targetRole: 'seller' as const,
    displayOrder: 1,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    // Limits
    listingsLimit: 3,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 3,
    aiMessagesLimit: 3,
    aiInsightsLimit: 3,
    imageDescriptionLimit: 0, // No auto image descriptions for free
  },

  // ============================================================================
  // PRO MONTHLY - Professional tools with AI features
  // ============================================================================
  {
    productId: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional selling tools with AI-powered features and monthly flexibility.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '20 listings per month',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority support',
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
    listingsLimit: 20, // 20 listings per month
    promotionCoupons: 3, // 2 highlighted + 1 premium
    premiumCoupons: 1, // 1 premium placement
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: 20, // 20 insights per month
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // PRO YEARLY - Best value with annual commitment
  // ============================================================================
  {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - 250 listings per year!',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '250 listings per year',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'All Pro Monthly features',
      'Save vs monthly billing',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'MOST POPULAR',
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
    listingsLimit: 250, // 250 listings per year
    promotionCoupons: 3, // 2 highlighted + 1 premium per month
    premiumCoupons: 1, // 1 premium placement
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: 20, // 20 insights per month
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // SELLER PRO TIER - Aliases for backward compatibility (same as pro_monthly/pro_yearly)
  // ============================================================================
  {
    productId: 'seller_pro_monthly',
    name: 'Pro Monthly',
    description: 'Professional selling tools with monthly flexibility. Great for active sellers.',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 25,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      '20 listings per month',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'Advanced analytics & insights',
      'Lead management dashboard',
      'Priority support',
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
    listingsLimit: 20,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: 20,
    imageDescriptionLimit: -1,
  },
  {
    productId: 'seller_pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - 250 listings per year!',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '250 listings per year',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 insights per month',
      'Unlimited AI chat (no spam)',
      'Unlimited saved searches',
      'Unlimited auto-generate image description',
      'All Pro Monthly features',
      'Save vs monthly billing',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'MOST POPULAR',
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
    listingsLimit: 250,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: 20,
    imageDescriptionLimit: -1,
  },
  {
    productId: 'seller_enterprise_yearly',
    name: 'Enterprise',
    description: 'Complete agency solution - 500 listings, 5 team members, and shared promotion pool.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '500 listings (expandable)',
      '5 team members included',
      'Agency branding page',
      '5 promotion coupons/month (2 premier + 2 highlighted + 1 featured)',
      'Agent registration codes',
      'Unlimited saved searches',
      'Unlimited AI usage (no spam)',
      'Unlimited generate insights for all agents',
      'Dedicated account manager',
      'Team dashboard & analytics',
    ],
    targetRole: 'seller' as const, // Show in "For Sellers" tab
    displayOrder: 4,
    badge: 'BEST FOR TEAMS',
    badgeColor: 'purple',
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
    listingsLimit: 500,
    promotionCoupons: 5, // 2 premier + 2 highlighted + 1 featured
    premiumCoupons: 2, // 2 premium premier
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 1, // 1 featured
    agentCoupons: 5,
    savedSearchesLimit: -1,
    aiMessagesLimit: -1,
    aiInsightsLimit: -1, // unlimited
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // ENTERPRISE TIER - For real estate agencies (€1000/year)
  // ============================================================================
  {
    productId: 'agency_yearly',
    name: 'Enterprise',
    description: 'Complete agency solution - 500 listings, 5 team members, and shared promotion pool.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '500 listings (expandable)',
      '5 team members included',
      'Agency branding page',
      '5 promotion coupons/month (2 premier + 2 highlighted + 1 featured)',
      'Agent registration codes',
      'Unlimited saved searches',
      'Unlimited AI usage (no spam)',
      'Unlimited generate insights for all agents',
      'Dedicated account manager',
      'Team dashboard & analytics',
    ],
    targetRole: 'seller' as const, // Show in "For Sellers" tab
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
    listingsLimit: 500, // 500 listings for enterprise
    promotionCoupons: 5, // 2 premier + 2 highlighted + 1 featured
    premiumCoupons: 2, // 2 premium premier
    highlightedCoupons: 2, // 2 highlighted
    featuredCoupons: 1, // 1 featured
    agentCoupons: 5, // 5 team member registration codes
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    aiInsightsLimit: -1, // unlimited for all agents
    imageDescriptionLimit: -1, // unlimited
  },

  // ============================================================================
  // FEATURED AGENCY - Visibility boosts for agencies
  // ============================================================================
  {
    productId: 'featured_agency_weekly',
    name: 'Featured Weekly',
    description: 'Boost your agency visibility for a week.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 10,
    currency: 'EUR',
    billingPeriod: 'weekly' as const,
    durationDays: 7,
    features: [
      'Top placement in search results',
      'Featured in agency carousel',
      'Premium badge on profile',
      'Cancel anytime',
    ],
    targetRole: 'agent' as const,
    displayOrder: 10,
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_agency_monthly',
    name: 'Featured Monthly',
    description: 'Best value for monthly visibility boost.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 35,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      'Top placement in search results',
      'Featured in agency carousel',
      'Premium badge on profile',
      'Monthly rotation for freshness',
      'Save 30% vs weekly',
      'Cancel anytime',
    ],
    targetRole: 'agent' as const,
    displayOrder: 11,
    badge: 'SAVE 30%',
    badgeColor: 'green',
    highlighted: true,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },
  {
    productId: 'featured_agency_yearly',
    name: 'Featured Yearly',
    description: 'Maximum savings for year-round visibility.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 400,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      'Top placement in search results',
      'Featured in agency carousel',
      'Premium badge on profile',
      'Monthly rotation for freshness',
      'Save 23% vs monthly',
      'Priority support',
      'Cancel anytime',
    ],
    targetRole: 'agent' as const,
    displayOrder: 12,
    badge: 'BEST VALUE',
    badgeColor: 'amber',
    highlighted: false,
    isActive: true,
    isVisible: true,
    hasFreeTrial: false,
    gracePeriodDays: 0,
    listingsLimit: 0,
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: 0,
    aiMessagesLimit: 0,
    aiInsightsLimit: 0,
    imageDescriptionLimit: 0,
  },

  // ============================================================================
  // BUYER PRO - For property buyers (€3/month)
  // ============================================================================
  {
    productId: 'buyer_monthly',
    name: 'Buyer Pro',
    description: 'Never miss your dream property with instant alerts and market insights.',
    type: 'subscription' as const,
    tier: 'buyer' as const,
    price: 3,
    currency: 'EUR',
    billingPeriod: 'monthly' as const,
    durationDays: 30,
    features: [
      'Instant email & SMS notifications',
      'Unlimited saved searches',
      'Early access to new listings',
      'Advanced market insights',
      'Price drop notifications',
      'Investment calculator',
      'Mortgage pre-qualification',
      'Ad-free browsing',
    ],
    targetRole: 'buyer' as const,
    displayOrder: 5,
    badge: 'FOR BUYERS',
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
    // Limits
    listingsLimit: 0, // Buyers don't create listings
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // unlimited
    aiMessagesLimit: -1, // unlimited (rate limited)
    generateInsightsLimit: -1, // unlimited
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
    console.log('   Free: €0 (3 listings, 3 saved searches, 3 AI messages, 3 insights)');
    console.log('   Pro Monthly: €25 (20 listings/mo, 3 promo coupons/mo, 20 insights/mo, unlimited AI & searches)');
    console.log('   Pro Yearly: €200 (250 listings/year, 3 promo coupons/mo, 20 insights/mo, unlimited AI & searches)');
    console.log('   Enterprise: €1000/year (500 listings, 5 team members, 5 promo coupons, unlimited everything)');
    console.log('   Buyer Pro: €3/month (unlimited searches, instant alerts, early access, market insights)');

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
