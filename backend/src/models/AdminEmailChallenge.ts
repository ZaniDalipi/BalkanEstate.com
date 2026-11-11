import mongoose, { Document, Schema } from 'mongoose';

/**
 * A one-time code emailed to an admin to confirm a sensitive step (making
 * someone admin or super admin, turning on the authenticator app). Only a
 * hash of the code is stored; the record removes itself once expired.
 */
export type AdminEmailChallengePurpose = 'grant_admin_role' | 'enable_authenticator';

export interface IAdminEmailChallenge extends Document {
  userId: mongoose.Types.ObjectId;
  purpose: AdminEmailChallengePurpose;
  /** What the code is for, e.g. "<targetUserId>:super_admin". A code for one thing can't approve another. */
  subject: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  usedAt?: Date;
}

const AdminEmailChallengeSchema = new Schema<IAdminEmailChallenge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['grant_admin_role', 'enable_authenticator'], required: true },
    subject: { type: String, required: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    usedAt: Date,
  },
  { timestamps: true }
);

AdminEmailChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IAdminEmailChallenge>('AdminEmailChallenge', AdminEmailChallengeSchema);
