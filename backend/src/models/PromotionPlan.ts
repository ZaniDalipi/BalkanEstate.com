import mongoose, { Document, Schema } from 'mongoose';

export type PromotionPlanCategory = 'listing' | 'agency';
export type PromotionPlanTier = 'featured' | 'highlight' | 'premium' | 'spotlight' | 'homepage' | 'addon';

export interface IPromotionPlan extends Document {
  category: PromotionPlanCategory;
  tier: PromotionPlanTier;
  name: string;
  description?: string;
  icon?: string;

  // Pricing for different durations
  pricing: {
    duration7?: number;
    duration14?: number;
    duration28?: number;
    duration30?: number;
    duration90?: number;
    fixedPrice?: number;
    fixedDuration?: string;
  };

  isAddOn: boolean;
  features: string[];
  visibilityMultiplier?: string;

  // Display settings
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;

  cardStyle?: {
    gradientFrom?: string;
    gradientTo?: string;
    borderColor?: string;
    iconBgColor?: string;
    priceColor?: string;
  };

  // Special Offer: time-limited promotions created by admin
  isSpecialOffer: boolean;
  availableFrom?: Date;
  availableTo?: Date;
  originalPriceMultiplier?: number; // e.g. 1.5 means original was 50% more (to show "was €X")
  offerLabel?: string; // e.g. "Spring Sale", "Limited Time"

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
      type: {
        duration7: { type: Number },
        duration14: { type: Number },
        duration28: { type: Number },
        duration30: { type: Number },
        duration90: { type: Number },
        fixedPrice: { type: Number },
        fixedDuration: { type: String },
      },
      _id: false,
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
      _id: false,
      default: undefined,
    },

    // Special Offer fields
    isSpecialOffer: {
      type: Boolean,
      default: false,
      index: true,
    },
    availableFrom: {
      type: Date,
    },
    availableTo: {
      type: Date,
    },
    originalPriceMultiplier: {
      type: Number,
      min: 1,
    },
    offerLabel: {
      type: String,
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
PromotionPlanSchema.index({ isSpecialOffer: 1, availableFrom: 1, availableTo: 1 });

export default mongoose.model<IPromotionPlan>('PromotionPlan', PromotionPlanSchema);
