import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionStore, SubscriptionStatus } from './Subscription';

export type EventType =
  | 'subscription_purchased'
  | 'subscription_renewed'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'subscription_refunded'
  | 'subscription_paused'
  | 'subscription_resumed'
  | 'subscription_grace_period_started'
  | 'subscription_grace_period_ended'
  | 'subscription_revoked'
  | 'subscription_reactivated'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'subscription_price_changed'
  | 'subscription_trial_started'
  | 'subscription_trial_converted'
  | 'subscription_trial_canceled'
  | 'subscription_renewal_failed'
  | 'subscription_on_hold'
  | 'subscription_recovered'
  | 'subscription_validated'
  | 'subscription_reconciled';

export interface ISubscriptionEvent extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  store: SubscriptionStore;

  eventType: EventType;
  eventDate: Date;

  // Before/After state
  previousStatus?: SubscriptionStatus;
  newStatus?: SubscriptionStatus;

  // Store notification data
  notificationId?: string; // Unique ID from store
  notificationType?: string; // Raw notification type from store
  rawNotification?: any; // Full notification payload (encrypted in production)

  // Financial impact
  hasFinancialImpact: boolean;
  amount?: number;
  currency?: string;

  // Metadata
  productId?: string;
  expirationDate?: Date;
  autoRenewing?: boolean;
  metadata?: any; // Generic metadata field for additional data

  // Reconciliation
  isReconciliationEvent: boolean;
  reconciliationDate?: Date;

  // Error tracking
  validationError?: string;
  processingError?: string;

  createdAt: Date;
}

const SubscriptionEventSchema: Schema = new Schema(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    store: {
      type: String,
      enum: ['google', 'apple', 'stripe', 'web'],
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    // State tracking
    previousStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },

    // Store notification
    notificationId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    notificationType: {
      type: String,
    },
    rawNotification: {
      type: Schema.Types.Mixed,
    },

    // Financial
    hasFinancialImpact: {
      type: Boolean,
      default: false,
      index: true,
    },
    amount: {
      type: Number,
    },
    currency: {
      type: String,
    },

    // Metadata
    productId: {
      type: String,
    },
    expirationDate: {
      type: Date,
    },
    autoRenewing: {
      type: Boolean,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Reconciliation
    isReconciliationEvent: {
      type: Boolean,
      default: false,
      index: true,
    },
    reconciliationDate: {
      type: Date,
    },

    // Errors
    validationError: {
      type: String,
    },
    processingError: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for querying
SubscriptionEventSchema.index({ subscriptionId: 1, eventDate: -1 });
SubscriptionEventSchema.index({ userId: 1, eventDate: -1 });
SubscriptionEventSchema.index({ store: 1, eventType: 1, eventDate: -1 });
SubscriptionEventSchema.index({ hasFinancialImpact: 1, eventDate: -1 });

export default mongoose.model<ISubscriptionEvent>('SubscriptionEvent', SubscriptionEventSchema);
