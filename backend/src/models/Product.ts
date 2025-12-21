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
  stripeProductId?: string;
  stripePriceId?: string;

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
  listingsLimit?: number; // Number of active listings (3 free, 20 pro, 20 per agency agent)
  promotionCoupons?: number; // Monthly promotion coupons (0 free, 3 pro, 15 agency)
  highlightCoupons?: number; // Legacy - kept for backwards compatibility

  // Agency-specific Benefits
  agentCoupons?: number; // Number of agent coupons (5 for agency tier)

  // Buyer-specific Benefits
  savedSearchesLimit?: number; // Saved searches limit (1 free, 10 pro, -1 unlimited for buyer)

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
    stripeProductId: {
      type: String,
    },
    stripePriceId: {
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
      default: 3, // 3 for free, 20 for pro/agency
    },
    promotionCoupons: {
      type: Number,
      default: 0, // 0 for free, 3 for pro, 15 for agency
    },
    highlightCoupons: {
      type: Number,
      default: 0, // Legacy - kept for backwards compatibility
    },

    // Agency-specific Benefits
    agentCoupons: {
      type: Number,
      default: 0, // 5 for agency tier
    },

    // Buyer-specific Benefits
    savedSearchesLimit: {
      type: Number,
      default: 1, // 1 for free, 10 for pro, -1 (unlimited) for buyer tier
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProduct>('Product', ProductSchema);
