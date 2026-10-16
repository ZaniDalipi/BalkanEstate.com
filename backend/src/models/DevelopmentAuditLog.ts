import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only audit trail for development-scoped actions (attach, detach,
 * availability/price change, publish, membership and claim decisions).
 *
 * Kept separate from the platform-wide ActivityLog so its action vocabulary can
 * evolve with the feature without touching a shared model's validation, and so
 * a development's history can be queried directly by `developmentId`.
 */
export type DevelopmentAuditAction =
  | 'listing.attach'
  | 'listing.detach'
  | 'availability.change'
  | 'price.change'
  | 'unit.create'
  | 'building.create'
  | 'development.create'
  | 'development.update'
  | 'development.publish'
  | 'development.delete'
  | 'membership.grant'
  | 'membership.revoke'
  | 'claim.create'
  | 'claim.review';

export interface IDevelopmentAuditLog extends Document {
  developmentId: mongoose.Types.ObjectId;
  action: DevelopmentAuditAction;
  actorId?: mongoose.Types.ObjectId;
  targetType?: string;
  targetId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const DevelopmentAuditLogSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    action: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    targetType: { type: String },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DevelopmentAuditLogSchema.index({ developmentId: 1, createdAt: -1 });

export default mongoose.model<IDevelopmentAuditLog>(
  'DevelopmentAuditLog',
  DevelopmentAuditLogSchema
);
