import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Durable work queue for feed syncs, stored in MongoDB so it survives
 * restarts and needs no extra infrastructure.
 *
 * - `activeKey` is set to the feed id while a job is queued or running and
 *   removed when it finishes. Its unique sparse index makes it impossible to
 *   queue a second job for a feed that already has one: overlapping syncs for
 *   the same feed cannot happen, however many workers or clicks there are.
 * - A running job holds a lease (`leaseUntil`) that the worker renews. A job
 *   whose worker died is reclaimed once the lease lapses and resumes its run.
 * - Failures are retried with exponential backoff up to `maxAttempts`.
 */
export type AgencyFeedJobKind = 'preview' | 'sync' | 'apply_deactivations';
export type AgencyFeedJobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface IAgencyFeedJob extends Document {
  feedId: Types.ObjectId;
  agencyId: Types.ObjectId;
  runId: Types.ObjectId;
  kind: AgencyFeedJobKind;
  status: AgencyFeedJobStatus;
  activeKey?: string;
  availableAt: Date;
  attempts: number;
  maxAttempts: number;
  leaseUntil?: Date;
  workerId?: string;
  lastError?: string;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgencyFeedJobSchema = new Schema<IAgencyFeedJob>(
  {
    feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true },
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    runId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedRun', required: true },
    kind: { type: String, enum: ['preview', 'sync', 'apply_deactivations'], required: true },
    status: { type: String, enum: ['queued', 'running', 'done', 'failed'], default: 'queued' },
    activeKey: { type: String },
    availableAt: { type: Date, default: () => new Date() },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 4 },
    leaseUntil: { type: Date },
    workerId: { type: String },
    lastError: { type: String, maxlength: 1000 },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

AgencyFeedJobSchema.index({ activeKey: 1 }, { unique: true, sparse: true });
AgencyFeedJobSchema.index({ status: 1, availableAt: 1 });
AgencyFeedJobSchema.index({ status: 1, leaseUntil: 1 });
// Finished jobs are kept 30 days for operations, then expired.
AgencyFeedJobSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model<IAgencyFeedJob>('AgencyFeedJob', AgencyFeedJobSchema);
