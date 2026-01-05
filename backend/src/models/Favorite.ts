import mongoose, { Document, Schema } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  // Price alert settings
  priceAlertEnabled: boolean;
  priceAtSave: number; // Price when property was saved
  lastAlertedPrice?: number; // Last price user was alerted about
  createdAt: Date;
}

const FavoriteSchema: Schema = new Schema(
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
    // Price alert settings
    priceAlertEnabled: {
      type: Boolean,
      default: true, // Enable by default
    },
    priceAtSave: {
      type: Number,
      default: 0,
    },
    lastAlertedPrice: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one favorite per user per property
FavoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

export default mongoose.model<IFavorite>('Favorite', FavoriteSchema);
