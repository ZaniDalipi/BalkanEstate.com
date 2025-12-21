import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRequest extends Document {
  email: string;
  phone: string;
  location: string;
  propertyDescription: string;
  status: 'pending' | 'assigned' | 'contacted' | 'completed' | 'cancelled';
  assignedAgents: mongoose.Types.ObjectId[];
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
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
AgentRequestSchema.index({ status: 1, createdAt: -1 });
AgentRequestSchema.index({ location: 1 });
AgentRequestSchema.index({ assignedAgents: 1 });

export default mongoose.model<IAgentRequest>('AgentRequest', AgentRequestSchema);
