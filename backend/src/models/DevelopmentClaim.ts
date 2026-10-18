import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';
import { CLAIM_STATUSES, type ClaimStatus } from '../config/developments';

/**
 * An ownership / access claim against a development owned by another account.
 *
 * Used both for disputed ownership and for an agent requesting authorized
 * access to attach listings to a development they do not control. Approval is
 * what mints a DevelopmentMembership — a claim never grants access on its own.
 */
export interface IDevelopmentClaim extends Document {
  developmentId: mongoose.Types.ObjectId;
  claimantId: mongoose.Types.ObjectId;
  reason: string;
  evidenceMediaIds: mongoose.Types.ObjectId[];
  status: ClaimStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentClaimSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    claimantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: { type: String, required: true, maxlength: 2000 },
    evidenceMediaIds: [{ type: Schema.Types.ObjectId, ref: 'MediaAsset' }],
    status: {
      type: String,
      enum: CLAIM_STATUSES,
      required: true,
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    note: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

DevelopmentClaimSchema.index({ developmentId: 1, status: 1 });

// Encode every reference in JSON so the client compares like with like.
encodeRefsOnJSON(DevelopmentClaimSchema, ['developmentId', 'claimantId', 'evidenceMediaIds', 'reviewedBy']);

export default mongoose.model<IDevelopmentClaim>(
  'DevelopmentClaim',
  DevelopmentClaimSchema
);
