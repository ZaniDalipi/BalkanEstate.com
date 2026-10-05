import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Agency-visible audit trail for property-feed configuration and sync actions.
 *
 * `details` never contains credentials: callers pass redacted summaries only
 * (see `auditFeedAction`).
 */
export type AgencyFeedAuditAction =
  | 'feed_created'
  | 'feed_updated'
  | 'feed_deleted'
  | 'credentials_changed'
  | 'authorization_confirmed'
  | 'feed_activated'
  | 'feed_paused'
  | 'feed_resumed'
  | 'preview_requested'
  | 'sync_requested'
  | 'sync_completed'
  | 'sync_failed'
  | 'deactivations_held'
  | 'deactivations_approved'
  | 'deactivations_dismissed'
  | 'listing_fields_locked';

export interface IAgencyFeedAuditLog extends Document {
  agencyId: Types.ObjectId;
  feedId: Types.ObjectId;
  action: AgencyFeedAuditAction;
  /** Absent for actions performed by the scheduler/worker. */
  actorId?: Types.ObjectId;
  runId?: Types.ObjectId;
  details: Record<string, unknown>;
  createdAt: Date;
}

const AgencyFeedAuditLogSchema = new Schema<IAgencyFeedAuditLog>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    feedId: { type: Schema.Types.ObjectId, ref: 'AgencyFeed', required: true },
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    runId: { type: Schema.Types.ObjectId, ref: 'AgencyFeedRun' },
    details: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: () => new Date() },
  },
  { minimize: false }
);

AgencyFeedAuditLogSchema.index({ feedId: 1, createdAt: -1 });
AgencyFeedAuditLogSchema.index({ agencyId: 1, createdAt: -1 });

export default mongoose.model<IAgencyFeedAuditLog>('AgencyFeedAuditLog', AgencyFeedAuditLogSchema);
