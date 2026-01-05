import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceHistory extends Document {
  propertyId: mongoose.Types.ObjectId;
  price: number;
  previousPrice?: number;
  changeType: 'initial' | 'increase' | 'decrease';
  percentageChange?: number;
  changedAt: Date;
  createdAt: Date;
}

const PriceHistorySchema: Schema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
    },
    previousPrice: Number,
    changeType: {
      type: String,
      enum: ['initial', 'increase', 'decrease'],
      required: true,
    },
    percentageChange: Number,
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
PriceHistorySchema.index({ propertyId: 1, changedAt: -1 });

export default mongoose.model<IPriceHistory>('PriceHistory', PriceHistorySchema);
