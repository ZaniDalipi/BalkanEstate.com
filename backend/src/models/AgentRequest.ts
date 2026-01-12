import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRequest extends Document {
  email: string;
  phone: string;
  location: string;
  propertyDescription: string;
  status: 'pending' | 'assigned' | 'contacted' | 'completed' | 'cancelled';
  assignedAgents: mongoose.Types.ObjectId[];
  // Success tracking fields
  outcome?: 'success' | 'no_response' | 'not_interested' | 'pending';
  contactedBy?: mongoose.Types.ObjectId; // Agent who made successful contact
  notes?: string; // Admin notes
  emailsSent: number; // Number of notification emails sent
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentRequestSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    propertyDescription: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'contacted', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedAgents: [{
      type: Schema.Types.ObjectId,
      ref: 'Agent',
    }],
    // Success tracking fields
    outcome: {
      type: String,
      enum: ['success', 'no_response', 'not_interested', 'pending'],
      default: 'pending',
    },
    contactedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
    },
    notes: {
      type: String,
      trim: true,
    },
    emailsSent: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
AgentRequestSchema.index({ status: 1, createdAt: -1 });
AgentRequestSchema.index({ location: 1 });
AgentRequestSchema.index({ assignedAgents: 1 });
AgentRequestSchema.index({ outcome: 1 });
AgentRequestSchema.index({ completedAt: 1 });

export default mongoose.model<IAgentRequest>('AgentRequest', AgentRequestSchema);
