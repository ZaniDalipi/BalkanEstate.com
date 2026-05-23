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
  /** CSS-selector map passed directly to the HTML enricher (field name → selector). */
  fieldMap: Record<string, string>;
  /** Adapter-specific configuration (e.g. pagination params, API keys, rate limits). */
  adapterConfig: Record<string, unknown>;
  /** The user account that manages/owns this source. */
  userId?: mongoose.Types.ObjectId;
  /** When the source operator accepted the scraping terms of service. */
  acceptedTermsAt?: Date;
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
    fieldMap: {
      type: Map,
      of: String,
      default: {},
    },
    adapterConfig: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    acceptedTermsAt: {
      type: Date,
      required: false,
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
