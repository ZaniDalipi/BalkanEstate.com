import mongoose, { Document, Schema, Types } from 'mongoose';

export type ListingAdapterType =
  | 'rss'
  | 'jsonFeed'
  | 'xmlFeed'
  | 'jsonLd'
  | 'htmlScrape'
  | 'customApi';

export interface IListingSource extends Document {
  /** Owning user. When set, imported listings are attributed to this user's sellerId. */
  userId?: Types.ObjectId;
  name: string;
  slug: string;
  baseUrl: string;
  enabled: boolean;
  adapterType: ListingAdapterType;
  adapterConfig: Record<string, unknown>;
  fieldMap: Record<string, string>;
  schedule?: string;
  acceptedTermsAt?: Date;
  rateLimitRpm?: number;
  lastRunAt?: Date;
  lastSuccessAt?: Date;
  lastErrorMessage?: string;
  listingsImported: number;
  listingsUpdated: number;
  listingsFailed: number;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSourceSchema = new Schema<IListingSource>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[a-z0-9-]+$/,
    },
    baseUrl: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: false, index: true },
    adapterType: {
      type: String,
      enum: ['rss', 'jsonFeed', 'xmlFeed', 'jsonLd', 'htmlScrape', 'customApi'],
      required: true,
    },
    adapterConfig: { type: Schema.Types.Mixed, default: {} },
    fieldMap: { type: Schema.Types.Mixed, default: {} },
    schedule: { type: String },
    acceptedTermsAt: { type: Date },
    rateLimitRpm: { type: Number, min: 1 },
    lastRunAt: { type: Date },
    lastSuccessAt: { type: Date },
    lastErrorMessage: { type: String },
    listingsImported: { type: Number, default: 0 },
    listingsUpdated: { type: Number, default: 0 },
    listingsFailed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ListingSourceSchema.index({ enabled: 1, adapterType: 1 });
ListingSourceSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IListingSource>('ListingSource', ListingSourceSchema);
