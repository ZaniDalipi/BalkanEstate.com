import mongoose, { Document, Schema, Types } from 'mongoose';
import type { FeedMapping, FeedMode } from '../services/agencyFeeds/feedTypes';

/**
 * An agency's connection to its own property feed (website or CRM export).
 *
 * Lifecycle: `draft` (configured, never imported) → `active` (synced daily)
 * ⇄ `paused`. Activation requires a successful preview run of the current
 * configuration and the manager's confirmation that the agency is authorized
 * to publish the feed's listings and photos.
 *
 * Credentials are stored encrypted (`secretEncrypted`, AES-256-GCM via
 * utils/fieldEncryption) and never returned by the API.
 */
export type AgencyFeedState = 'draft' | 'active' | 'paused';
export type AgencyFeedFormat = 'canonical' | 'custom';

export interface IAgencyFeedCredentials {
  type: 'none' | 'basic' | 'header';
  username?: string;
  headerName?: string;
  secretEncrypted?: string;
}

export interface IAgencyFeedSafeguards {
  /** Share of the previously imported listings that may disappear in one run before review is required. */
  maxRemovalRatio: number;
  /** Removals at or below this count never trigger review, whatever the ratio. */
  minRemovalsForReview: number;
}

export interface IAgencyFeed extends Document {
  agencyId: Types.ObjectId;
  name: string;
  url: string;
  format: AgencyFeedFormat;
  mapping?: FeedMapping;
  mode: FeedMode;
  state: AgencyFeedState;
  /** Agency member the imported listings are published under (and counted against). */
  assignedAgentId: Types.ObjectId;
  credentials: IAgencyFeedCredentials;
  safeguards: IAgencyFeedSafeguards;
  authorization?: {
    confirmedAt: Date;
    confirmedBy: Types.ObjectId;
    statement: string;
  };
  /** Bumped on every config change; a preview only validates the version it ran against. */
  configVersion: number;
  lastPreviewRunId?: Types.ObjectId;
  lastRunId?: Types.ObjectId;
  lastRunAt?: Date;
  lastSuccessfulSyncAt?: Date;
  /** Records in the last complete snapshot that was applied. */
  lastSnapshotCount?: number;
  nextSyncAt?: Date;
  consecutiveFailures: number;
  lastError?: { code: string; message: string; at: Date };
  activatedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyFeedSchema = new Schema<IAgencyFeed>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    format: { type: String, enum: ['canonical', 'custom'], required: true, default: 'canonical' },
    mapping: { type: Schema.Types.Mixed },
    mode: { type: String, enum: ['snapshot', 'delta'], required: true, default: 'snapshot' },
    state: { type: String, enum: ['draft', 'active', 'paused'], required: true, default: 'draft', index: true },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    credentials: {
      type: { type: String, enum: ['none', 'basic', 'header'], default: 'none' },
      username: { type: String, maxlength: 200 },
      headerName: { type: String, maxlength: 100 },
      secretEncrypted: { type: String },
    },
    safeguards: {
      maxRemovalRatio: { type: Number, min: 0.01, max: 1, default: 0.3 },
      minRemovalsForReview: { type: Number, min: 0, max: 1000, default: 5 },
    },
    authorization: {
      confirmedAt: { type: Date },
      confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      statement: { type: String, maxlength: 500 },
    },
    configVersion: { type: Number, default: 1 },
    lastPreviewRunId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedRun' },
    lastRunId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedRun' },
    lastRunAt: { type: Date },
    lastSuccessfulSyncAt: { type: Date },
    lastSnapshotCount: { type: Number },
    nextSyncAt: { type: Date },
    consecutiveFailures: { type: Number, default: 0 },
    lastError: {
      code: { type: String },
      message: { type: String },
      at: { type: Date },
    },
    activatedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, minimize: false }
);

// The scheduler's query: active feeds that are due.
AgencyFeedSchema.index({ state: 1, nextSyncAt: 1 });
// One agency cannot register the same URL twice (duplicate imports).
AgencyFeedSchema.index({ agencyId: 1, url: 1 }, { unique: true });

export default mongoose.model<IAgencyFeed>('AgencyFeed', AgencyFeedSchema);
