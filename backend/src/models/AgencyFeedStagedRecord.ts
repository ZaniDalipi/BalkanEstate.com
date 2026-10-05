import mongoose, { Document, Schema, Types } from 'mongoose';
import type { FeedIssue, NormalizedListing } from '../services/agencyFeeds/feedTypes';

/**
 * One feed record held between "fetched and validated" and "applied".
 *
 * Staging is what makes a sync safe to interrupt: the whole document is read
 * and validated before any listing changes, and each record is marked
 * `appliedAt` as it is written, so a retried run resumes where it stopped
 * instead of re-creating or re-charging anything.
 *
 * Kept for 30 days for support and audit, then expired by the TTL index.
 */
export type StagedAction = 'create' | 'update' | 'unchanged' | 'remove' | 'reject' | 'skip_limit';

export interface IAgencyFeedStagedRecord extends Document {
  runId: Types.ObjectId;
  feedId: Types.ObjectId;
  ordinal: number;
  externalId?: string;
  valid: boolean;
  listing?: NormalizedListing;
  hash?: string;
  issues: FeedIssue[];
  action?: StagedAction;
  appliedAt?: Date;
  propertyId?: Types.ObjectId;
  /** Set once a listing slot was charged for this create, so a resumed run never charges twice. */
  slotReserved?: boolean;
  /** Outcome details, persisted so run totals can be recomputed after a resume. */
  result?: StagedResult;
  createdAt: Date;
}

export interface StagedResult {
  reactivated?: boolean;
  localEditsKept?: string[];
  imagesDownloaded?: number;
  imagesReused?: number;
  imagesFailed?: number;
}

const AgencyFeedStagedRecordSchema = new Schema<IAgencyFeedStagedRecord>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedRun', required: true },
    feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true },
    ordinal: { type: Number, required: true },
    externalId: { type: String },
    valid: { type: Boolean, required: true },
    listing: { type: Schema.Types.Mixed },
    hash: { type: String },
    issues: { type: Schema.Types.Mixed, default: [] },
    action: { type: String, enum: ['create', 'update', 'unchanged', 'remove', 'reject', 'skip_limit'] },
    appliedAt: { type: Date },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    slotReserved: { type: Boolean },
    result: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date() },
  },
  { minimize: false }
);

AgencyFeedStagedRecordSchema.index({ runId: 1, ordinal: 1 }, { unique: true });
AgencyFeedStagedRecordSchema.index({ runId: 1, appliedAt: 1 });
AgencyFeedStagedRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IAgencyFeedStagedRecord>('AgencyFeedStagedRecord', AgencyFeedStagedRecordSchema);
