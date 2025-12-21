import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStore = 'google' | 'apple' | 'stripe' | 'web';
export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'canceled'
  | 'refunded'
  | 'paused'
  | 'grace'
  | 'trial'
  | 'pending_cancellation';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  store: SubscriptionStore;
  productId: string;

  // Store-specific product IDs
  googlePlayProductId?: string;
  appStoreProductId?: string;
  stripeProductId?: string;

  // Store-specific identifiers
  purchaseToken?: string; // Google Play
  transactionId?: string; // Apple
  stripeSubscriptionId?: string; // Stripe
  receiptData?: string; // Apple receipt

  // Dates
  startDate: Date;
  renewalDate?: Date;
  expirationDate: Date;
  trialEndDate?: Date;
  canceledDate?: Date;
  canceledAt?: Date; // Alias for canceledDate
  pausedDate?: Date;
  pausedAt?: Date; // Alias for pausedDate
  refundedAt?: Date;
  willCancelAt?: Date;

  // Status
  status: SubscriptionStatus;
  autoRenewing: boolean;

  // Pricing
  price: number;
  currency: string;
  country?: string;

  // Grace period tracking
  graceExpirationDate?: Date;
  gracePeriodEndDate?: Date;

  // Metadata
  originalTransactionId?: string; // Apple - for tracking renewals
  orderId?: string; // Google Play order ID
  linkedPurchaseToken?: string; // For upgrade/downgrade tracking
  environment?: string; // sandbox or production
  isAcknowledged?: boolean; // Google Play acknowledgment status

  // Cancellation
  cancellationReason?: string;

  // Audit
  lastUpdated: Date;
  lastValidated?: Date;
  validationAttempts: number;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isActive(): boolean;
  isPremium(): boolean;
  isInGracePeriod(): boolean;
}

const SubscriptionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    store: {
      type: String,
      enum: ['google', 'apple', 'stripe', 'web'],
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },

    // Store-specific product IDs
    googlePlayProductId: {
      type: String,
    },
    appStoreProductId: {
      type: String,
    },
    stripeProductId: {
      type: String,
    },

    // Store-specific identifiers
    purchaseToken: {
      type: String,
      index: true,
      sparse: true,
    },
    transactionId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    receiptData: {
      type: String,
    },

    // Dates
    startDate: {
      type: Date,
      required: true,
    },
    renewalDate: {
      type: Date,
    },
    expirationDate: {
      type: Date,
      required: true,
      index: true,
    },
    trialEndDate: {
      type: Date,
    },
    canceledDate: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
    pausedDate: {
      type: Date,
    },
    pausedAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    willCancelAt: {
      type: Date,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'expired', 'canceled', 'refunded', 'paused', 'grace', 'trial', 'pending_cancellation'],
      required: true,
      index: true,
    },
    autoRenewing: {
      type: Boolean,
      default: true,
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
    country: {
      type: String,
    },

    // Grace period
    graceExpirationDate: {
      type: Date,
    },
    gracePeriodEndDate: {
      type: Date,
    },

    // Metadata
    originalTransactionId: {
      type: String,
    },
    orderId: {
      type: String,
    },
    linkedPurchaseToken: {
      type: String,
    },
    environment: {
      type: String,
    },
    isAcknowledged: {
      type: Boolean,
      default: false,
    },

    // Cancellation
    cancellationReason: {
      type: String,
    },

    // Audit
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastValidated: {
      type: Date,
    },
    validationAttempts: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ store: 1, purchaseToken: 1 }, { unique: true, sparse: true });
SubscriptionSchema.index({ store: 1, transactionId: 1 }, { unique: true, sparse: true });
SubscriptionSchema.index({ expirationDate: 1, status: 1 });
SubscriptionSchema.index({ lastValidated: 1 });

// Instance methods
SubscriptionSchema.methods.isActive = function(): boolean {
  return this.status === 'active' && this.expirationDate > new Date();
};

SubscriptionSchema.methods.isPremium = function(): boolean {
  const activeStatuses: SubscriptionStatus[] = ['active', 'grace', 'trial'];
  return activeStatuses.includes(this.status) && this.expirationDate > new Date();
};

SubscriptionSchema.methods.isInGracePeriod = function(): boolean {
  return this.status === 'grace' &&
         this.graceExpirationDate !== undefined &&
         this.graceExpirationDate > new Date();
};

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
