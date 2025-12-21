import mongoose, { Schema, Document } from 'mongoose';

export interface IAgencyJoinRequest extends Document {
  agentId: mongoose.Types.ObjectId;
  agencyId: mongoose.Types.ObjectId;
  invitationCode?: string; // Invitation code used to join (if any)
  status: 'pending' | 'approved' | 'rejected';
  message?: string; // Optional message from agent
  requesterEmail?: string; // Email of the agent requesting to join
  requesterName?: string; // Name of the agent requesting to join
  agencyEmail?: string; // Email of the agency
  agencyName?: string; // Name of the agency
  requestedAt: Date;
  respondedAt?: Date;
  respondedBy?: mongoose.Types.ObjectId; // Agency owner who responded
}

const AgencyJoinRequestSchema = new Schema<IAgencyJoinRequest>({
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  agencyId: {
    type: Schema.Types.ObjectId,
    ref: 'Agency',
    required: true,
    index: true,
  },
  invitationCode: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    required: true,
    index: true,
  },
  message: {
    type: String,
    maxlength: 500,
  },
  requesterEmail: {
    type: String,
  },
  requesterName: {
    type: String,
  },
  agencyEmail: {
    type: String,
  },
  agencyName: {
    type: String,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  respondedAt: {
    type: Date,
  },
  respondedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

// Compound index to prevent duplicate pending requests
AgencyJoinRequestSchema.index(
  { agentId: 1, agencyId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

const AgencyJoinRequest = mongoose.model<IAgencyJoinRequest>('AgencyJoinRequest', AgencyJoinRequestSchema);

export default AgencyJoinRequest;
