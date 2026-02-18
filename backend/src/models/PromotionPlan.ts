import mongoose, { Document, Schema } from 'mongoose';

export type PromotionPlanCategory = 'listing' | 'agency';
export type PromotionPlanTier = 'featured' | 'highlight' | 'premium' | 'spotlight' | 'homepage' | 'addon';

export interface IPromotionPlan extends Document {
  category: PromotionPlanCategory;
  tier: PromotionPlanTier;
  name: string;
  description?: string;
  icon?: string; // Emoji or icon name

  // Pricing for different durations
  pricing: {
    duration7?: number;  // 1 week price
    duration14?: number; // 2 weeks price
    duration28?: number; // 4 weeks price
    duration30?: number; // Monthly price
    duration90?: number; // Quarterly price
    // For fixed-price items (like add-ons)
    fixedPrice?: number;
    fixedDuration?: string; // e.g., "30 days"
  };

  // Add-on flag - if true, this is an optional add-on to a main plan
  isAddOn: boolean;

  // Features/benefits
  features: string[];

  // Visual multiplier displayed (e.g., "2x visibility")
  visibilityMultiplier?: string;

  // Display settings
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;

  // Card styling
  cardStyle?: {
    gradientFrom?: string;
    gradientTo?: string;
    borderColor?: string;
    iconBgColor?: string;
    priceColor?: string;
  };

  // Status
  isActive: boolean;
  isVisible: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const PromotionPlanSchema: Schema = new Schema(
  {
    category: {
      type: String,
      enum: ['listing', 'agency'],
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['featured', 'highlight', 'premium', 'spotlight', 'homepage', 'addon'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    icon: {
      type: String,
      default: '',
    },

    pricing: {
      duration7: { type: Number },
      duration14: { type: Number },
      duration28: { type: Number },
      duration30: { type: Number },
      duration90: { type: Number },
      fixedPrice: { type: Number },
      fixedDuration: { type: String },
    },

    isAddOn: {
      type: Boolean,
      default: false,
    },

    features: {
      type: [String],
      default: [],
    },

    visibilityMultiplier: {
      type: String,
    },

    displayOrder: {
      type: Number,
      default: 0,
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

    cardStyle: {
      type: {
        gradientFrom: String,
        gradientTo: String,
        borderColor: String,
        iconBgColor: String,
        priceColor: String,
      },
      default: undefined,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
PromotionPlanSchema.index({ category: 1, isActive: 1, displayOrder: 1 });

export default mongoose.model<IPromotionPlan>('PromotionPlan', PromotionPlanSchema);
