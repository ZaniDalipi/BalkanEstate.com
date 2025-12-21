import mongoose, { Document, Schema } from 'mongoose';

export interface IFilters {
  query: string;
  minPrice: number | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  livingRooms: number | null;
  minSqft: number | null;
  maxSqft: number | null;
  sortBy: string;
  sellerType: 'any' | 'agent' | 'private';
  propertyType: 'any' | 'house' | 'apartment' | 'villa' | 'other';
}

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  filters: IFilters;
  drawnBoundsJSON: string | null;
  lastAccessed: Date;
  seenPropertyIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    filters: {
      query: { type: String, default: '' },
      minPrice: { type: Number, default: null },
      maxPrice: { type: Number, default: null },
      beds: { type: Number, default: null },
      baths: { type: Number, default: null },
      livingRooms: { type: Number, default: null },
      minSqft: { type: Number, default: null },
      maxSqft: { type: Number, default: null },
      sortBy: { type: String, default: 'newest' },
      sellerType: {
        type: String,
        enum: ['any', 'agent', 'private'],
        default: 'any',
      },
      propertyType: {
        type: String,
        enum: ['any', 'house', 'apartment', 'villa', 'other'],
        default: 'any',
      },
    },
    drawnBoundsJSON: {
      type: String,
      default: null,
    },
    lastAccessed: {
      type: Date,
      default: Date.now,
    },
    seenPropertyIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ISavedSearch>('SavedSearch', SavedSearchSchema);
