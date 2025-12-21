import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscountCode extends Document {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // Percentage (0-100) or fixed amount in EUR
  minPurchaseAmount?: number; // Minimum purchase amount required
  maxDiscountAmount?: number; // Maximum discount cap (for percentage discounts)
  validFrom: Date;
  validUntil: Date;
  usageLimit: number; // Total number of times code can be used (usually 1 for single-use)
  usedCount: number; // Times the code has been used
  applicablePlans?: string[]; // Empty = all plans, otherwise specific plan IDs
  createdBy: mongoose.Types.ObjectId; // Admin who created the code
  usedBy: mongoose.Types.ObjectId[]; // Users who have used this code
  isActive: boolean;
  description?: string; // Internal note about this code
  source?: string; // Where this code came from (e.g., 'gamification', 'admin', 'promotion')
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValid(userId?: string, planId?: string, purchaseAmount?: number): { valid: boolean; reason?: string };
  calculateDiscount(originalPrice: number): number;
  markAsUsed(userId: string): Promise<void>;
}

const discountCodeSchema = new Schema<IDiscountCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
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
    usageLimit: {
      type: Number,
      required: true,
      default: 1, // Single-use by default
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicablePlans: [{
      type: String,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    usedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
    },
    source: {
      type: String,
      enum: ['gamification', 'admin', 'promotion', 'referral', 'seasonal'],
      default: 'admin',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
discountCodeSchema.index({ code: 1, isActive: 1 });
discountCodeSchema.index({ validFrom: 1, validUntil: 1 });
discountCodeSchema.index({ source: 1 });

// Method to check if code is valid
discountCodeSchema.methods.isValid = function(userId?: string, planId?: string, purchaseAmount?: number): { valid: boolean; reason?: string } {
  const now = new Date();

  // Check if active
  if (!this.isActive) {
    return { valid: false, reason: 'Code is no longer active' };
  }

  // Check date range
  if (now < this.validFrom) {
    return { valid: false, reason: 'Code is not yet valid' };
  }
  if (now > this.validUntil) {
    return { valid: false, reason: 'Code has expired' };
  }

  // Check usage limit
  if (this.usedCount >= this.usageLimit) {
    return { valid: false, reason: 'Code has reached maximum usage limit' };
  }

  // Check if user has already used this code
  if (userId && this.usedBy.some((id: mongoose.Types.ObjectId) => id.toString() === userId)) {
    return { valid: false, reason: 'You have already used this code' };
  }

  // Check minimum purchase amount
  if (this.minPurchaseAmount && purchaseAmount && purchaseAmount < this.minPurchaseAmount) {
    return { valid: false, reason: `Minimum purchase amount is €${this.minPurchaseAmount}` };
  }

  // Check applicable plans
  if (this.applicablePlans && this.applicablePlans.length > 0 && planId) {
    if (!this.applicablePlans.includes(planId)) {
      return { valid: false, reason: 'Code is not applicable to this plan' };
    }
  }

  return { valid: true };
};

// Method to calculate discount amount
discountCodeSchema.methods.calculateDiscount = function(originalPrice: number): number {
  let discount = 0;

  if (this.discountType === 'percentage') {
    discount = originalPrice * (this.discountValue / 100);
    // Apply max discount cap if set
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else if (this.discountType === 'fixed') {
    discount = this.discountValue;
    // Discount cannot exceed original price
    if (discount > originalPrice) {
      discount = originalPrice;
    }
  }

  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

// Method to mark code as used
discountCodeSchema.methods.markAsUsed = async function(userId: string): Promise<void> {
  this.usedCount += 1;
  if (userId) {
    this.usedBy.push(new mongoose.Types.ObjectId(userId));
  }
  await this.save();
};

export default mongoose.model<IDiscountCode>('DiscountCode', discountCodeSchema);
