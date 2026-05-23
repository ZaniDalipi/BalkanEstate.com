import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Deferred listings — raw items pulled from a `ListingSource` that could not be
 * imported during the current run because the owning user reached their
 * monthly listing limit. They are kept on disk and processed on the 1st of
 * the next month (when the monthly counter resets) by `listingIngestJob`.
 *
 * One document per (source, sourceListingId). If the same listing is fetched
 * again before being processed it is upserted, not duplicated.
 */
export interface IDeferredListing extends Document {
  source: Types.ObjectId;
  sourceSlug: string;
  userId?: Types.ObjectId;
  sourceListingId: string;
  rawId: string;
  rawUrl?: string;
  rawPayload: Record<string, unknown>;
  deferredAt: Date;
  /** Earliest time we should retry — typically the 1st of next month. */
  scheduledFor: Date;
  attempts: number;
  lastError?: string;
}

const DeferredListingSchema = new Schema<IDeferredListing>(
  {
    source: { type: Schema.Types.ObjectId, ref: 'ListingSource', required: true, index: true },
    sourceSlug: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    sourceListingId: { type: String, required: true },
    rawId: { type: String, required: true },
    rawUrl: { type: String },
    rawPayload: { type: Schema.Types.Mixed, required: true },
    deferredAt: { type: Date, default: () => new Date() },
    scheduledFor: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String },
  },
  { timestamps: true }
);

DeferredListingSchema.index(
  { source: 1, sourceListingId: 1 },
  { unique: true }
);
DeferredListingSchema.index({ scheduledFor: 1, userId: 1 });

export default mongoose.model<IDeferredListing>('DeferredListing', DeferredListingSchema);
