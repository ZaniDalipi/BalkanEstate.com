import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * A photo or floor plan a feed referenced, and what became of it.
 *
 * Keyed by (feed, source URL) so an unchanged URL is never downloaded twice:
 * the next sync reuses the stored asset. Failed downloads are remembered with
 * their reason and retried with a cool-down rather than on every run.
 *
 * Only assets recorded here were created by the feed importer, which is what
 * makes cleanup safe: the sweep deletes stored files that no listing
 * references any more, and never touches media an agent uploaded by hand.
 */
export interface IAgencyFeedAsset extends Document {
  feedId: Types.ObjectId;
  agencyId: Types.ObjectId;
  sourceUrl: string;
  urlHash: string;
  status: 'stored' | 'failed';
  /** Delivery URL: Cloudinary secure_url, or the source URL in reference mode. */
  url?: string;
  publicId?: string;
  contentHash?: string;
  width?: number;
  height?: number;
  bytes?: number;
  mimeType?: string;
  failureReason?: string;
  failures: number;
  lastAttemptAt: Date;
  lastReferencedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyFeedAssetSchema = new Schema<IAgencyFeedAsset>(
  {
    feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    sourceUrl: { type: String, required: true, maxlength: 2048 },
    urlHash: { type: String, required: true },
    status: { type: String, enum: ['stored', 'failed'], required: true },
    url: { type: String },
    publicId: { type: String },
    contentHash: { type: String },
    width: { type: Number },
    height: { type: Number },
    bytes: { type: Number },
    mimeType: { type: String },
    failureReason: { type: String, maxlength: 300 },
    failures: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, required: true },
    lastReferencedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

AgencyFeedAssetSchema.index({ feedId: 1, urlHash: 1 }, { unique: true });
AgencyFeedAssetSchema.index({ feedId: 1, contentHash: 1 });
AgencyFeedAssetSchema.index({ feedId: 1, lastReferencedAt: 1 });

export default mongoose.model<IAgencyFeedAsset>('AgencyFeedAsset', AgencyFeedAssetSchema);
