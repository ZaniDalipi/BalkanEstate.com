import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionStore } from './Subscription';

export type TransactionType =
  | 'charge'
  | 'refund'
  | 'partial_refund'
  | 'chargeback'
  | 'reversal'
  | 'proration'
  | 'credit';

export type PaymentStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'reversed';

export interface IPaymentRecord extends Document {
  userId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  subscriptionEventId?: mongoose.Types.ObjectId;

  // Store info
  store: SubscriptionStore;
  storeTransactionId: string; // Unique ID from store

  // Transaction details
  transactionType: TransactionType;
  transactionDate: Date;

  // Amounts
  amount: number;
  currency: string;
  netAmount?: number; // After store fees
  storeFee?: number;
  storeFeePercent?: number;
  taxAmount?: number;

  // Status
  status: PaymentStatus;

  // Product
  productId?: string;

  // User location (for tax/reporting)
  country?: string;
  region?: string;

  // Refund tracking
  refundDate?: Date;
  refundReason?: string;
  refundAmount?: number;
  originalTransactionId?: string; // For refunds

  // Bank export tracking
  exported: boolean;
  exportedAt?: Date;
  exportBatchId?: string;

  // Metadata
  metadata?: any;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      index: true,
    },
    subscriptionEventId: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionEvent',
    },

    // Store
    store: {
      type: String,
      enum: ['google', 'apple', 'stripe', 'web'],
      required: true,
      index: true,
    },
    storeTransactionId: {
      type: String,
      required: true,
      index: true,
    },

    // Transaction
    transactionType: {
      type: String,
      enum: ['charge', 'refund', 'partial_refund', 'chargeback', 'reversal', 'proration', 'credit'],
      required: true,
      index: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Amounts
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    netAmount: {
      type: Number,
    },
    storeFee: {
      type: Number,
    },
    storeFeePercent: {
      type: Number,
    },
    taxAmount: {
      type: Number,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded', 'disputed', 'reversed'],
      required: true,
      default: 'completed',
      index: true,
    },

    // Product
    productId: {
      type: String,
    },

    // Location
    country: {
      type: String,
    },
    region: {
      type: String,
    },

    // Refund
    refundDate: {
      type: Date,
    },
    refundReason: {
      type: String,
    },
    refundAmount: {
      type: Number,
    },
    originalTransactionId: {
      type: String,
      index: true,
    },

    // Export
    exported: {
      type: Boolean,
      default: false,
      index: true,
    },
    exportedAt: {
      type: Date,
    },
    exportBatchId: {
      type: String,
      index: true,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PaymentRecordSchema.index({ store: 1, storeTransactionId: 1 }, { unique: true });
PaymentRecordSchema.index({ userId: 1, transactionDate: -1 });
PaymentRecordSchema.index({ exported: 1, transactionDate: 1 });
PaymentRecordSchema.index({ transactionType: 1, status: 1, transactionDate: -1 });

export default mongoose.model<IPaymentRecord>('PaymentRecord', PaymentRecordSchema);
