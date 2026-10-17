import mongoose, { Document, Schema } from 'mongoose';

/**
 * A buyer following a development, with their alert preferences and optional
 * matching filters. When a unit changes in a way the buyer opted into (and
 * which passes their filters), an alert notification is created.
 *
 * One follow per (development, user) — unique below.
 */
export interface IFollowPreferences {
  newUnits: boolean;
  priceReductions: boolean;
  availabilityChanges: boolean;
  newBuildings: boolean;
}

export interface IFollowFilters {
  minBeds?: number;
  maxBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

export interface IDevelopmentFollow extends Document {
  developmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  preferences: IFollowPreferences;
  filters: IFollowFilters;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentFollowSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    preferences: {
      newUnits: { type: Boolean, default: true },
      priceReductions: { type: Boolean, default: true },
      availabilityChanges: { type: Boolean, default: true },
      newBuildings: { type: Boolean, default: false },
    },
    filters: {
      minBeds: { type: Number, min: 0 },
      maxBeds: { type: Number, min: 0 },
      minPrice: { type: Number, min: 0 },
      maxPrice: { type: Number, min: 0 },
      minArea: { type: Number, min: 0 },
      maxArea: { type: Number, min: 0 },
    },
  },
  { timestamps: true }
);

// One follow per user per development.
DevelopmentFollowSchema.index(
  { developmentId: 1, userId: 1 },
  { unique: true, name: 'follow_per_user_per_development_unique' }
);
DevelopmentFollowSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IDevelopmentFollow>(
  'DevelopmentFollow',
  DevelopmentFollowSchema
);
