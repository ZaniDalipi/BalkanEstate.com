import mongoose, { Document, Schema } from 'mongoose';

export interface IListingSourceSelectors {
  title?: string;
  price?: string;
  address?: string;
  city?: string;
  description?: string;
  images?: string;
  rooms?: string;
  area?: string;
}

export interface IListingSource extends Document {
  name: string;
  slug: string;
  baseUrl: string;
  isActive: boolean;
  lastScrapedAt?: Date;
  scrapeIntervalHours: number;
  totalImported: number;
  selectors: IListingSourceSelectors;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSourceSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastScrapedAt: {
      type: Date,
    },
    scrapeIntervalHours: {
      type: Number,
      default: 24,
    },
    totalImported: {
      type: Number,
      default: 0,
    },
    selectors: {
      title: { type: String },
      price: { type: String },
      address: { type: String },
      city: { type: String },
      description: { type: String },
      images: { type: String },
      rooms: { type: String },
      area: { type: String },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ListingSourceSchema.index({ isActive: 1, lastScrapedAt: 1 });

export default mongoose.model<IListingSource>('ListingSource', ListingSourceSchema);
