import mongoose, { Document, Schema } from 'mongoose';
import {
  DEVELOPMENT_ROLES,
  MEMBERSHIP_STATUSES,
  type DevelopmentRole,
  type MembershipStatus,
} from '../config/developments';

/**
 * A user's resource-scoped role on one development.
 *
 * This is the ONLY thing that grants control of a development. Owning a single
 * Property that references a unit grants no membership — membership is created
 * by an existing owner/manager or by an approved ownership claim. This is what
 * prevents a private owner of one apartment from gaining control of a building.
 */
export interface IDevelopmentMembership extends Document {
  developmentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: DevelopmentRole;
  status: MembershipStatus;
  invitedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DevelopmentMembershipSchema: Schema = new Schema(
  {
    developmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Development',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: DEVELOPMENT_ROLES,
      required: true,
      default: 'viewer',
    },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUSES,
      required: true,
      default: 'active',
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One membership per user per development.
DevelopmentMembershipSchema.index(
  { developmentId: 1, userId: 1 },
  { unique: true, name: 'membership_per_user_per_development_unique' }
);
DevelopmentMembershipSchema.index({ userId: 1, status: 1 });

export default mongoose.model<IDevelopmentMembership>(
  'DevelopmentMembership',
  DevelopmentMembershipSchema
);
