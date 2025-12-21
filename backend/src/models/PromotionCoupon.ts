import mongoose, { Document, Schema } from 'mongoose';

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'expired' | 'disabled';

export interface ICouponUsage {
  userId: mongoose.Types.ObjectId;
  promotionId: mongoose.Types.ObjectId;
  usedAt: Date;
  discountApplied: number;
}

export interface IPromotionCoupon extends Document {
  code: string; // Unique coupon code (e.g., "SUMMER2025", "FIRST50")
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number; // Percentage (1-100) or fixed amount in EUR

  // Validity
  validFrom: Date;
  validUntil: Date;
  status: CouponStatus;

  // Usage limits
  maxTotalUses?: number; // Total times this coupon can be used (null = unlimited)
  maxUsesPerUser?: number; // Max uses per user (null = unlimited)
  currentTotalUses: number; // Track total uses

  // Applicable to
  applicableTiers?: ('featured' | 'highlight' | 'premium')[]; // null = all tiers
  minimumPurchaseAmount?: number; // Minimum purchase amount to apply coupon

  // Usage tracking
  usageHistory: ICouponUsage[];

  // Metadata
  createdBy?: mongoose.Types.ObjectId; // Admin who created the coupon
  notes?: string; // Internal notes
  isPublic: boolean; // If true, show in public coupon list; if false, only direct use

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValid(): boolean;
  canBeUsedBy(userId: mongoose.Types.ObjectId): Promise<boolean>;
  calculateDiscount(originalPrice: number): number;
  recordUsage(userId: mongoose.Types.ObjectId, promotionId: mongoose.Types.ObjectId, discountApplied: number): Promise<void>;
}

const CouponUsageSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  promotionId: {
    type: Schema.Types.ObjectId,
    ref: 'Promotion',
    required: true,
  },
  usedAt: {
    type: Date,
    default: Date.now,
  },
  discountApplied: {
    type: Number,
    required: true,
  },
}, { _id: false });

const PromotionCouponSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'disabled'],
      default: 'active',
      index: true,
    },
    maxTotalUses: {
      type: Number,
      min: 1,
    },
    maxUsesPerUser: {
      type: Number,
      min: 1,
      default: 1,
    },
    currentTotalUses: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableTiers: [{
      type: String,
      enum: ['featured', 'highlight', 'premium'],
    }],
    minimumPurchaseAmount: {
      type: Number,
      min: 0,
    },
    usageHistory: [CouponUsageSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    notes: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PromotionCouponSchema.index({ code: 1, status: 1 });
PromotionCouponSchema.index({ validFrom: 1, validUntil: 1 });
PromotionCouponSchema.index({ status: 1, validUntil: 1 });

// Validation: Percentage discount must be between 1-100
PromotionCouponSchema.pre('save', function(next) {
  const doc = this as unknown as IPromotionCoupon;
  if (doc.discountType === 'percentage' && (doc.discountValue < 1 || doc.discountValue > 100)) {
    next(new Error('Percentage discount must be between 1 and 100'));
  } else {
    next();
  }
});

// Method to check if coupon is currently valid
PromotionCouponSchema.methods.isValid = function(): boolean {
  const now = new Date();

  // Check status
  if (this.status !== 'active') {
    return false;
  }

  // Check date range
  if (now < this.validFrom || now > this.validUntil) {
    return false;
  }

  // Check total usage limit
  if (this.maxTotalUses && this.currentTotalUses >= this.maxTotalUses) {
    return false;
  }

  return true;
};

// Method to check if user can use this coupon
PromotionCouponSchema.methods.canBeUsedBy = async function(
  userId: mongoose.Types.ObjectId
): Promise<boolean> {
  if (!this.isValid()) {
    return false;
  }

  // Check per-user usage limit
  if (this.maxUsesPerUser) {
    const userUsageCount = this.usageHistory.filter(
      (usage: ICouponUsage) => usage.userId.toString() === userId.toString()
    ).length;

    if (userUsageCount >= this.maxUsesPerUser) {
      return false;
    }
  }

  return true;
};

// Method to calculate discount amount
PromotionCouponSchema.methods.calculateDiscount = function(originalPrice: number): number {
  if (this.discountType === 'percentage') {
    return (originalPrice * this.discountValue) / 100;
  } else {
    // Fixed amount discount, but not more than the original price
    return Math.min(this.discountValue, originalPrice);
  }
};

// Method to record usage
PromotionCouponSchema.methods.recordUsage = async function(
  userId: mongoose.Types.ObjectId,
  promotionId: mongoose.Types.ObjectId,
  discountApplied: number
): Promise<void> {
  this.usageHistory.push({
    userId,
    promotionId,
    usedAt: new Date(),
    discountApplied,
  });

  this.currentTotalUses += 1;

  await this.save();
};

// Static method to find valid coupon by code
PromotionCouponSchema.statics.findValidCoupon = async function(
  code: string
): Promise<IPromotionCoupon | null> {
  const coupon = await this.findOne({
    code: code.toUpperCase(),
    status: 'active',
  });

  if (!coupon || !coupon.isValid()) {
    return null;
  }

  return coupon;
};

// Static method to get public coupons
PromotionCouponSchema.statics.getPublicCoupons = async function(): Promise<IPromotionCoupon[]> {
  const now = new Date();

  return this.find({
    status: 'active',
    isPublic: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  }).select('-usageHistory -notes -createdBy');
};

// Static method to expire old coupons
PromotionCouponSchema.statics.expireOldCoupons = async function(): Promise<number> {
  const now = new Date();

  const result = await this.updateMany(
    {
      status: 'active',
      validUntil: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );

  return result.modifiedCount;
};

export default mongoose.model<IPromotionCoupon>('PromotionCoupon', PromotionCouponSchema);
