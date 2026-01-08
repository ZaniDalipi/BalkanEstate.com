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
      '3 AI chat messages/month',
      '3 property insights/month',
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
    imageDescriptionLimit: 0,
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
      '20 active listings/month',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 property insights/month',
      'Unlimited AI chat (rate limited)',
      'Unlimited saved searches',
      'Unlimited auto-generate image descriptions',
      'Advanced analytics dashboard',
      'Lead management tools',
      'Priority listing placement',
      'Email & SMS notifications',
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
    // Limits
    listingsLimit: 20,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // Unlimited
    aiMessagesLimit: -1, // Unlimited (rate limited)
    aiInsightsLimit: 20,
    imageDescriptionLimit: -1, // Unlimited
  },

  // ============================================================================
  // PRO YEARLY - Best value with annual commitment
  // ============================================================================
  {
    productId: 'pro_yearly',
    name: 'Pro Yearly',
    description: 'Best deal for committed sellers - save €100/year (4 months free!)',
    type: 'subscription' as const,
    tier: 'pro' as const,
    price: 200,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      '250 listings/year (~20/month)',
      '3 promotion coupons/month (2 highlighted + 1 premium)',
      '20 property insights/month',
      'Unlimited AI chat (rate limited)',
      'Unlimited saved searches',
      'Unlimited auto-generate image descriptions',
      'All Pro Monthly features',
      'Save €100/year vs monthly billing',
      'Advanced analytics dashboard',
      'Lead management tools',
      'Priority support',
    ],
    targetRole: 'seller' as const,
    displayOrder: 3,
    badge: 'SAVE 33%',
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
    // Limits
    listingsLimit: 250,
    promotionCoupons: 3,
    premiumCoupons: 1,
    highlightedCoupons: 2,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // Unlimited
    aiMessagesLimit: -1, // Unlimited (rate limited)
    aiInsightsLimit: 20,
    imageDescriptionLimit: -1, // Unlimited
  },

  // ============================================================================
  // ENTERPRISE - For real estate agencies (€1000/year)
  // ============================================================================
  {
    productId: 'agency_yearly',
    name: 'Enterprise',
    description: 'Scale your agency with branded page, team management & premium promotions.',
    type: 'subscription' as const,
    tier: 'agency' as const,
    price: 1000,
    currency: 'EUR',
    billingPeriod: 'yearly' as const,
    durationDays: 365,
    features: [
      // Core Agency Features
      'Dedicated Agency Page with custom branding',
      'Display all agents & their properties',
      'Featured in homepage rotating carousel',

      // Listings & Team
      '500 property listings (agency-wide)',
      '5 team member coupons (agent registration codes)',
      'Team members register as agents with code',
      'Non-code agents get Pro member benefits',

      // Promotions (5 total: 2 premium, 2 highlighted, 1 featured)
      '5 promotion coupons/month',
      '2 Premium Premiere promotions',
      '2 Highlighted promotions',
      '1 Featured promotion',

      // AI & Tools (Unlimited for all agents)
      'Unlimited AI chat for all agents (rate limited)',
      'Unlimited property insights for all agents',
      'Unlimited saved searches',

      // Management Tools
      'Lead management system',
      'Team dashboard & analytics',
      'Agent performance tracking',

      // Support & Branding
      'Dedicated account manager',
      'Priority support (24h response)',
      'Custom agency logo & cover',
    ],
    targetRole: 'agent' as const,
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
    // Limits
    listingsLimit: 500,
    promotionCoupons: 5,
    premiumCoupons: 2,
    highlightedCoupons: 2,
    featuredCoupons: 1,
    agentCoupons: 5,
    savedSearchesLimit: -1, // Unlimited
    aiMessagesLimit: -1, // Unlimited (rate limited)
    aiInsightsLimit: -1, // Unlimited for all agents
    imageDescriptionLimit: -1, // Unlimited
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
      'Property comparison tools',
      'Ad-free browsing',
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
    // Limits
    listingsLimit: 0, // Buyers don't create listings
    promotionCoupons: 0,
    premiumCoupons: 0,
    highlightedCoupons: 0,
    featuredCoupons: 0,
    agentCoupons: 0,
    savedSearchesLimit: -1, // Unlimited
    earlyAccessListings: true,
    advancedMarketInsights: true,
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
    console.log('   Pro Monthly: €25 (20 listings, 3 promos [2 highlighted + 1 premium], 20 insights, unlimited AI)');
    console.log('   Pro Yearly: €200 (250 listings, 3 promos/mo, save €100/year)');
    console.log('   Enterprise: €1000/year (500 listings, 5 team coupons, 5 promos [2 premium + 2 highlighted + 1 featured])');
    console.log('   Buyer Pro: €3/month (unlimited searches, early access, market insights)');

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
