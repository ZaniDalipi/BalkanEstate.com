import mongoose, { Document, Schema, Types } from 'mongoose';
import type { FeedIssue, NormalizedListing } from '../services/agencyFeeds/feedTypes';

/**
 * One fetch-and-import attempt for an agency feed — the import history the
 * dashboard shows, and the durable state that lets a run resume after the
 * worker crashed half way.
 *
 * Status flow:
 *   queued → fetching → staged → applying → succeeded | partial | awaiting_review
 *   any step → failed          (nothing applied after a fetch/validation failure)
 *   preview runs stop at `previewed` and never write listings.
 *
 * `awaiting_review` means creates and updates were applied but deactivations
 * were held back because the feed shrank suspiciously; a manager approves or
 * dismisses them (see `deactivation`).
 */
export type AgencyFeedRunStatus =
  | 'queued'
  | 'fetching'
  | 'staged'
  | 'applying'
  | 'previewed'
  | 'succeeded'
  | 'partial'
  | 'awaiting_review'
  | 'failed';

export type AgencyFeedRunTrigger = 'preview' | 'manual' | 'scheduled';

export interface IAgencyFeedRunCounts {
  received: number;
  valid: number;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  deactivated: number;
  reactivated: number;
  skippedLimit: number;
  localEditsKept: number;
  imagesDownloaded: number;
  imagesReused: number;
  imagesFailed: number;
}

export interface IAgencyFeedRun extends Document {
  feedId: Types.ObjectId;
  agencyId: Types.ObjectId;
  trigger: AgencyFeedRunTrigger;
  dryRun: boolean;
  configVersion: number;
  status: AgencyFeedRunStatus;
  requestedBy?: Types.ObjectId;
  /** Set when the run reads an uploaded file instead of fetching the feed URL. */
  uploadId?: Types.ObjectId;
  sourceFile?: { filename: string; bytes: number };
  startedAt?: Date;
  finishedAt?: Date;
  snapshot: {
    mode: 'snapshot' | 'delta';
    complete: boolean;
    incompleteReason?: string;
    declaredTotal?: number;
    pages: number;
    bytes: number;
  };
  counts: IAgencyFeedRunCounts;
  /** Validation errors and warnings (capped). */
  issues: FeedIssue[];
  issuesTruncated: boolean;
  /**
   * When the file's listings were not found with the current mapping: the
   * structure that was detected instead and a suggested mapping for it.
   */
  detected?: {
    recordElement: string;
    sampleCount: number;
    paths: string[];
    suggestedMapping: Record<string, unknown>;
    unmatched: string[];
  };
  /** Up to five normalized listings, for the preview screen. */
  samples: NormalizedListing[];
  limit: {
    checked: boolean;
    remaining?: number;
    allowance?: number;
    plan?: string;
    newListings: number;
    wouldExceed: boolean;
    /** Listings that are not published because the allowance ran out. */
    excess: Array<{ externalId: string; title: string }>;
  };
  deactivation: {
    candidates: number;
    allowed: boolean;
    blockedReason?: string;
    held: boolean;
    pendingExternalIds: string[];
    resolution?: 'approved' | 'dismissed' | 'expired';
    resolvedAt?: Date;
    resolvedBy?: Types.ObjectId;
  };
  error?: { code: string; message: string };
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema = new Schema<FeedIssue>(
  {
    severity: { type: String, enum: ['error', 'warning'], required: true },
    code: { type: String, required: true },
    message: { type: String, required: true },
    externalId: { type: String },
    field: { type: String },
  },
  { _id: false }
);

const countDefaults = {
  received: 0, valid: 0, created: 0, updated: 0, unchanged: 0, rejected: 0, deactivated: 0, reactivated: 0,
  skippedLimit: 0, localEditsKept: 0, imagesDownloaded: 0, imagesReused: 0, imagesFailed: 0,
};

const AgencyFeedRunSchema = new Schema<IAgencyFeedRun>(
  {
    feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    trigger: { type: String, enum: ['preview', 'manual', 'scheduled'], required: true },
    dryRun: { type: Boolean, default: false },
    configVersion: { type: Number, required: true },
    status: {
      type: String,
      enum: ['queued', 'fetching', 'staged', 'applying', 'previewed', 'succeeded', 'partial', 'awaiting_review', 'failed'],
      default: 'queued',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedUpload' },
    sourceFile: {
      filename: { type: String },
      bytes: { type: Number },
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    snapshot: {
      mode: { type: String, enum: ['snapshot', 'delta'], default: 'snapshot' },
      complete: { type: Boolean, default: false },
      incompleteReason: { type: String },
      declaredTotal: { type: Number },
      pages: { type: Number, default: 0 },
      bytes: { type: Number, default: 0 },
    },
    counts: { type: Schema.Types.Mixed, default: () => ({ ...countDefaults }) },
    issues: { type: [IssueSchema], default: [] },
    issuesTruncated: { type: Boolean, default: false },
    samples: { type: Schema.Types.Mixed, default: [] },
    detected: { type: Schema.Types.Mixed },
    limit: {
      checked: { type: Boolean, default: false },
      remaining: { type: Number },
      allowance: { type: Number },
      plan: { type: String },
      newListings: { type: Number, default: 0 },
      wouldExceed: { type: Boolean, default: false },
      excess: { type: [{ externalId: String, title: String, _id: false }], default: [] },
    },
    deactivation: {
      candidates: { type: Number, default: 0 },
      allowed: { type: Boolean, default: false },
      blockedReason: { type: String },
      held: { type: Boolean, default: false },
      pendingExternalIds: { type: [String], default: [] },
      resolution: { type: String, enum: ['approved', 'dismissed', 'expired'] },
      resolvedAt: { type: Date },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    error: {
      code: { type: String },
      message: { type: String },
    },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

AgencyFeedRunSchema.index({ feedId: 1, createdAt: -1 });
AgencyFeedRunSchema.index({ agencyId: 1, createdAt: -1 });

export const emptyRunCounts = (): IAgencyFeedRunCounts => ({ ...countDefaults });

export default mongoose.model<IAgencyFeedRun>('AgencyFeedRun', AgencyFeedRunSchema);
