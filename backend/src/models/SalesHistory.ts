import mongoose, { Document, Schema } from 'mongoose';

export interface ISalesHistory extends Document {
  // Agent/Seller who made the sale
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  sellerEmail: string;
  sellerRole: 'agent' | 'private_seller';

  // Property details
  propertyId: mongoose.Types.ObjectId;
  propertyAddress: string;
  propertyCity: string;
  propertyCountry: string;
  propertyType: string;

  // Sale details
  salePrice: number;
  currency: string;
  soldAt: Date;

  // Property specifications (for historical record)
  beds?: number;
  baths?: number;
  sqft?: number;

  // Metrics at time of sale
  totalViews: number;
  totalSaves: number;
  daysOnMarket: number; // Time from listing to sale

  // Commission/Profit (if applicable)
  commission?: number;
  commissionRate?: number; // Percentage

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SalesHistorySchema: Schema = new Schema(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
    },
    sellerRole: {
      type: String,
      enum: ['agent', 'private_seller'],
      required: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    propertyAddress: {
      type: String,
      required: true,
    },
    propertyCity: {
      type: String,
      required: true,
      index: true,
    },
    propertyCountry: {
      type: String,
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
      index: true,
    },
    currency: {
      type: String,
      default: 'EUR',
    },
    soldAt: {
      type: Date,
      required: true,
      index: true,
    },
    beds: {
      type: Number,
    },
    baths: {
      type: Number,
    },
    sqft: {
      type: Number,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalSaves: {
      type: Number,
      default: 0,
    },
    daysOnMarket: {
      type: Number,
      default: 0,
    },
    commission: {
      type: Number,
    },
    commissionRate: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
SalesHistorySchema.index({ sellerId: 1, soldAt: -1 }); // Get seller's sales chronologically
SalesHistorySchema.index({ propertyCity: 1, soldAt: -1 }); // Get sales by location
SalesHistorySchema.index({ soldAt: -1 }); // Get recent sales

export default mongoose.model<ISalesHistory>('SalesHistory', SalesHistorySchema);
