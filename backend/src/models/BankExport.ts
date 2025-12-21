import mongoose, { Document, Schema } from 'mongoose';
import { SubscriptionStore } from './Subscription';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportFormat = 'csv' | 'json' | 'xml' | 'quickbooks' | 'xero';

export interface IExportRecord {
  paymentRecordId: mongoose.Types.ObjectId;
  transactionId: string;
  amount: number;
  currency: string;
  transactionDate: Date;
}

export interface IBankExport extends Document {
  // Export identification
  batchId: string;
  exportDate: Date;

  // Date range for this export
  startDate: Date;
  endDate: Date;

  // Status
  status: ExportStatus;

  // Format
  format: ExportFormat;

  // Filters
  stores?: SubscriptionStore[]; // Which stores to include
  minAmount?: number;
  maxAmount?: number;

  // Records
  recordCount: number;
  totalAmount: number;
  currency: string;
  records: IExportRecord[];

  // File info
  fileName?: string;
  fileSize?: number;
  fileUrl?: string; // S3 or cloud storage URL
  downloadUrl?: string; // Temporary signed URL

  // Processing
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId; // Admin user who triggered
  errorMessage?: string;

  // Metadata
  notes?: string;
  metadata?: any;

  createdAt: Date;
  updatedAt: Date;
}

const ExportRecordSchema: Schema = new Schema(
  {
    paymentRecordId: {
      type: Schema.Types.ObjectId,
      ref: 'PaymentRecord',
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const BankExportSchema: Schema = new Schema(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    exportDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Date range
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },

    // Format
    format: {
      type: String,
      enum: ['csv', 'json', 'xml', 'quickbooks', 'xero'],
      required: true,
    },

    // Filters
    stores: [
      {
        type: String,
        enum: ['google', 'apple', 'stripe', 'web'],
      },
    ],
    minAmount: {
      type: Number,
    },
    maxAmount: {
      type: Number,
    },

    // Records
    recordCount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'EUR',
    },
    records: [ExportRecordSchema],

    // File info
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileUrl: {
      type: String,
    },
    downloadUrl: {
      type: String,
    },

    // Processing
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    errorMessage: {
      type: String,
    },

    // Metadata
    notes: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BankExportSchema.index({ status: 1, exportDate: -1 });
BankExportSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model<IBankExport>('BankExport', BankExportSchema);
