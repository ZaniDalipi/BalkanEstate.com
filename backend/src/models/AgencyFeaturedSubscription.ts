import mongoose, { Document, Schema } from 'mongoose';

export type FeaturedSubscriptionStatus =
  | 'active'
  | 'trial'
  | 'expired'
  | 'canceled'
  | 'pending_payment';

export type FeaturedSubscriptionInterval = 'weekly' | 'monthly' | 'yearly';

export interface IAgencyFeaturedSubscription extends Document {
  agencyId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Agency owner

  // Subscription details
  status: FeaturedSubscriptionStatus;
  interval: FeaturedSubscriptionInterval;
  price: number;
  currency: string;

  // Dates
  startDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndDate?: Date;
  canceledAt?: Date;

  // Payment
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;

  // Coupon/discount
  appliedCouponCode?: string;
  appliedCouponId?: mongoose.Types.ObjectId;
  discountApplied?: number;

  // Auto-renewal
  autoRenewing: boolean;
  cancelAtPeriodEnd: boolean;

  // Trial
  isTrial: boolean;
  trialDays?: number;

  // Metadata
  metadata?: Record<string, any>;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isActive(): boolean;
  isInTrial(): boolean;
  daysUntilExpiry(): number;
}

const AgencyFeaturedSubscriptionSchema: Schema = new Schema(
  {
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Agency',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'expired', 'canceled', 'pending_payment'],
      required: true,
      default: 'active',
      index: true,
    },
    interval: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      required: true,
      default: 'weekly',
    },
    price: {
      type: Number,
      required: true,
      default: 10, // €10/week
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    trialEndDate: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },
    lastPaymentDate: {
      type: Date,
    },
    nextPaymentDate: {
      type: Date,
    },
    appliedCouponCode: {
      type: String,
    },
    appliedCouponId: {
      type: Schema.Types.ObjectId,
      ref: 'PromotionCoupon',
    },
    discountApplied: {
      type: Number,
      default: 0,
    },
    autoRenewing: {
      type: Boolean,
      default: true,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    isTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 7,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
AgencyFeaturedSubscriptionSchema.index({ agencyId: 1, status: 1 });
AgencyFeaturedSubscriptionSchema.index({ userId: 1, status: 1 });
AgencyFeaturedSubscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
AgencyFeaturedSubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });

// Instance methods
AgencyFeaturedSubscriptionSchema.methods.isActive = function(): boolean {
  const now = new Date();
  return (this.status === 'active' || this.status === 'trial') &&
         this.currentPeriodEnd > now &&
         !this.canceledAt;
};

AgencyFeaturedSubscriptionSchema.methods.isInTrial = function(): boolean {
  const now = new Date();
  return this.isTrial &&
         this.status === 'trial' &&
         this.trialEndDate !== undefined &&
         this.trialEndDate > now;
};

AgencyFeaturedSubscriptionSchema.methods.daysUntilExpiry = function(): number {
  const now = new Date();
  const diffTime = this.currentPeriodEnd.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default mongoose.model<IAgencyFeaturedSubscription>(
  'AgencyFeaturedSubscription',
  AgencyFeaturedSubscriptionSchema
);
