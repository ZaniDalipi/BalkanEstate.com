import mongoose, { Document, Schema } from 'mongoose';

export type ProductType = 'subscription' | 'consumable' | 'non_consumable';
export type BillingPeriod = 'monthly' | 'yearly' | 'weekly' | 'quarterly' | 'one_time';
export type TargetRole = 'buyer' | 'seller' | 'agent' | 'all';
export type SubscriptionTier = 'free' | 'pro' | 'agency' | 'buyer';

export interface IProduct extends Document {
  productId: string;
  name: string;
  description?: string;
  type: ProductType;
  tier?: SubscriptionTier; // Which tier this product represents

  // Pricing
  price: number;
  currency: string;
  billingPeriod?: BillingPeriod;
  durationDays?: number; // Subscription validity in days (30 for monthly, 365 for yearly)

  // Store IDs
  googlePlayProductId?: string;
  appStoreProductId?: string;
  externalProductId?: string;
  externalPriceId?: string;

  // Trial
  trialPeriodDays?: number;
  hasFreeTrial: boolean;

  // Grace period
  gracePeriodDays?: number;

  // Features
  features: string[];

  // Target audience and display
  targetRole: TargetRole;
  displayOrder: number;
  badge?: string; // e.g., "MOST POPULAR", "BEST VALUE"
  badgeColor?: string; // e.g., "red", "green", "amber"
  highlighted: boolean; // Whether to show with special styling

  // UI customization
  cardStyle?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };

  // Status
  isActive: boolean;
  isVisible: boolean;

  // Limits
  maxActiveSubscriptions?: number;

  // Seller/Agent Subscription Benefits
  listingsLimit?: number; // Number of active listings (3 free, 20 pro, 500 agency)
  promotionCoupons?: number; // Total monthly promotion coupons

  // Promotion coupon breakdown
  premiumCoupons?: number; // Premium premiere coupons per month
  highlightedCoupons?: number; // Highlighted coupons per month
  featuredCoupons?: number; // Featured coupons per month

  // Agency-specific Benefits
  agentCoupons?: number; // Number of agent coupons (5 for agency tier)
  teamMembersLimit?: number; // Number of team members allowed (for agency/enterprise plans)

  // AI & Insights Limits
  aiMessagesLimit?: number; // AI chat messages limit per month (-1 = unlimited)
  aiInsightsLimit?: number; // Generate insights limit per month (-1 = unlimited)
  imageDescriptionLimit?: number; // Auto-generate image description limit (-1 = unlimited)
  roomStyleLimit?: number; // AI room restyle limit per month (-1 = unlimited)

  // Buyer-specific Benefits
  savedSearchesLimit?: number; // Saved searches limit (3 free, -1 unlimited for pro/buyer)
  earlyAccessListings?: boolean; // Early access to new listings
  advancedMarketInsights?: boolean; // Advanced market insights feature

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['subscription', 'consumable', 'non_consumable'],
      required: true,
      default: 'subscription',
    },
    tier: {
      type: String,
      enum: ['free', 'pro', 'agency', 'buyer'],
      index: true,
    },

    // Pricing
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly', 'weekly', 'quarterly', 'one_time'],
    },
    durationDays: {
      type: Number,
      default: 30, // Default to 30 days (monthly)
    },

    // Store IDs
    googlePlayProductId: {
      type: String,
    },
    appStoreProductId: {
      type: String,
    },
    externalProductId: {
      type: String,
    },
    externalPriceId: {
      type: String,
    },

    // Trial
    trialPeriodDays: {
      type: Number,
      default: 0,
    },
    hasFreeTrial: {
      type: Boolean,
      default: false,
    },

    // Grace period
    gracePeriodDays: {
      type: Number,
      default: 3,
    },

    // Features
    features: {
      type: [String],
      default: [],
    },

    // Target audience and display
    targetRole: {
      type: String,
      enum: ['buyer', 'seller', 'agent', 'all'],
      required: true,
      default: 'all',
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    badge: {
      type: String,
    },
    badgeColor: {
      type: String,
    },
    highlighted: {
      type: Boolean,
      default: false,
    },

    // UI customization
    cardStyle: {
      type: {
        backgroundColor: String,
        borderColor: String,
        textColor: String,
      },
      _id: false,
      default: undefined,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },

    // Limits
    maxActiveSubscriptions: {
      type: Number,
    },

    // Seller/Agent Subscription Benefits
    listingsLimit: {
      type: Number,
      default: 3, // 3 for free, 20 for pro, 500 for agency
    },
    promotionCoupons: {
      type: Number,
      default: 0, // Total: 0 for free, 3 for pro, 5 for agency
    },

    // Promotion coupon breakdown
    premiumCoupons: {
      type: Number,
      default: 0, // Premium premiere coupons per month
    },
    highlightedCoupons: {
      type: Number,
      default: 0, // Highlighted coupons per month
    },
    featuredCoupons: {
      type: Number,
      default: 0, // Featured coupons per month
    },

    // Agency-specific Benefits
    agentCoupons: {
      type: Number,
      default: 0, // 5 for agency tier
    },
    teamMembersLimit: {
      type: Number,
      default: 1, // 1 for solo, 5 for agency/enterprise
    },

    // AI & Insights Limits
    aiMessagesLimit: {
      type: Number,
      default: 3, // 3 for free, -1 (unlimited) for pro
    },
    aiInsightsLimit: {
      type: Number,
      default: 3, // 3 for free, 20 for pro, -1 (unlimited) for agency
    },
    imageDescriptionLimit: {
      type: Number,
      default: 0, // 0 for free, -1 (unlimited) for pro
    },
    roomStyleLimit: {
      type: Number,
      default: 2, // 2 for free, 50 for pro, -1 (unlimited) for enterprise
    },

    // Buyer-specific Benefits
    savedSearchesLimit: {
      type: Number,
      default: 3, // 3 for free, -1 (unlimited) for pro/buyer
    },
    earlyAccessListings: {
      type: Boolean,
      default: false, // Only for buyer pro
    },
    advancedMarketInsights: {
      type: Boolean,
      default: false, // Only for buyer pro
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
