import mongoose, { Document, Schema } from 'mongoose';

export type AlertType = 'new_listing' | 'price_drop' | 'back_on_market';

export interface IPropertyAlert extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  alertType: AlertType;
  savedSearchId?: mongoose.Types.ObjectId; // For new_listing alerts
  previousPrice?: number; // For price_drop alerts
  newPrice?: number;
  percentageChange?: number;
  emailSent: boolean;
  emailSentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

const PropertyAlertSchema: Schema = new Schema(
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
    alertType: {
      type: String,
      enum: ['new_listing', 'price_drop', 'back_on_market'],
      required: true,
    },
    savedSearchId: {
      type: Schema.Types.ObjectId,
      ref: 'SavedSearch',
    },
    previousPrice: Number,
    newPrice: Number,
    percentageChange: Number,
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: Date,
    readAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate alerts
PropertyAlertSchema.index(
  { userId: 1, propertyId: 1, alertType: 1, createdAt: 1 },
  { unique: false }
);

// Index for querying unread alerts
PropertyAlertSchema.index({ userId: 1, readAt: 1 });

// TTL index - auto-delete alerts after 30 days
PropertyAlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IPropertyAlert>('PropertyAlert', PropertyAlertSchema);
