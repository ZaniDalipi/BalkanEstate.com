import mongoose, { Document, Schema } from 'mongoose';

export type PromotionTierType = 'standard' | 'featured' | 'highlight' | 'premium' | 'urgent';

export interface IPromotion extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  promotionType: 'featured' | 'highlighted' | 'premium'; // Legacy field, kept for backwards compatibility
  promotionTier: PromotionTierType; // New tier system
  duration: number; // Duration in days
  hasUrgentBadge: boolean; // Urgent modifier add-on
  price: number; // Actual price paid (in EUR)
  currency: string;
  // Payment info
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string; // Reference to payment record
  transactionId?: string;
  // Agency allocation tracking
  isFromAgencyAllocation: boolean; // True if using agency's free monthly allocation
  agencyId?: mongoose.Types.ObjectId;
  // Performance tracking
  viewsGenerated: number;
  inquiriesGenerated: number;
  savesGenerated: number;
  // Auto-refresh tracking (for Highlight tier)
  lastRefreshedAt?: Date;
  nextRefreshAt?: Date;
  refreshCount: number;
  // Additional metadata
  purchasedVia: 'web' | 'mobile' | 'api';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    promotionType: {
      type: String,
      enum: ['featured', 'highlighted', 'premium'],
      default: 'featured',
    },
    promotionTier: {
      type: String,
      enum: ['standard', 'featured', 'highlight', 'premium', 'urgent'],
      default: 'featured',
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 15,
    },
    hasUrgentBadge: {
      type: Boolean,
      default: false,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid',
      index: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    transactionId: {
      type: String,
      index: true,
    },
    isFromAgencyAllocation: {
      type: Boolean,
      default: false,
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      index: true,
    },
    viewsGenerated: {
      type: Number,
      default: 0,
    },
    inquiriesGenerated: {
      type: Number,
      default: 0,
    },
    savesGenerated: {
      type: Number,
      default: 0,
    },
    lastRefreshedAt: {
      type: Date,
    },
    nextRefreshAt: {
      type: Date,
    },
    refreshCount: {
      type: Number,
      default: 0,
    },
    purchasedVia: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
PromotionSchema.index({ userId: 1, isActive: 1 });
PromotionSchema.index({ propertyId: 1, isActive: 1 });
PromotionSchema.index({ endDate: 1, isActive: 1 });
PromotionSchema.index({ promotionTier: 1, isActive: 1, endDate: 1 });
PromotionSchema.index({ agencyId: 1, isFromAgencyAllocation: 1 });
PromotionSchema.index({ paymentStatus: 1, createdAt: -1 });
PromotionSchema.index({ nextRefreshAt: 1 }); // For auto-refresh worker

// Method to check if promotion is still valid
PromotionSchema.methods.isValid = function(): boolean {
  return this.isActive && this.endDate > new Date();
};

// Method to check if promotion needs refresh (for Highlight tier)
PromotionSchema.methods.needsRefresh = function(): boolean {
  if (!this.nextRefreshAt || this.promotionTier !== 'highlight') {
    return false;
  }
  return this.nextRefreshAt <= new Date() && this.isValid();
};

// Method to get priority score for sorting
PromotionSchema.methods.getPriorityScore = function(): number {
  if (!this.isValid()) return 0;

  const tierScores: Record<string, number> = {
    premium: 100,
    highlight: 70,
    featured: 40,
    standard: 10,
  };

  let score = tierScores[this.promotionTier] || 0;

  // Add bonus for urgent badge
  if (this.hasUrgentBadge) {
    score += 5;
  }

  // Slight decay based on age (newer = slightly higher)
  const daysOld = (Date.now() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
  const ageDecay = Math.max(0, 5 - daysOld * 0.1);
  score += ageDecay;

  return score;
};

// Static method to get active promotions for a user
PromotionSchema.statics.getActivePromotionsCount = async function(
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    userId,
    isActive: true,
    endDate: { $gt: new Date() },
  });
};

// Static method to get active promotions by tier
PromotionSchema.statics.getActivePromotionsByTier = async function(
  userId: mongoose.Types.ObjectId,
  tier: PromotionTierType
): Promise<number> {
  return this.countDocuments({
    userId,
    promotionTier: tier,
    isActive: true,
    endDate: { $gt: new Date() },
  });
};

// Static method to get agency's used allocations for current month
PromotionSchema.statics.getAgencyMonthlyUsage = async function(
  agencyId: mongoose.Types.ObjectId
): Promise<{
  featured: number;
  highlight: number;
  premium: number;
}> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const promotions = await this.find({
    agencyId,
    isFromAgencyAllocation: true,
    createdAt: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const usage = {
    featured: 0,
    highlight: 0,
    premium: 0,
  };

  promotions.forEach((promo: IPromotion) => {
    if (promo.promotionTier === 'featured') usage.featured++;
    if (promo.promotionTier === 'highlight') usage.highlight++;
    if (promo.promotionTier === 'premium') usage.premium++;
  });

  return usage;
};

// Static method to get promotions needing refresh
PromotionSchema.statics.getPromotionsNeedingRefresh = async function(): Promise<IPromotion[]> {
  return this.find({
    promotionTier: 'highlight',
    isActive: true,
    endDate: { $gt: new Date() },
    nextRefreshAt: { $lte: new Date() },
  });
};

export default mongoose.model<IPromotion>('Promotion', PromotionSchema);
