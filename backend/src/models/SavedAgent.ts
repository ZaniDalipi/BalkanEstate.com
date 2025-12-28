import mongoose, { Document, Schema } from 'mongoose';

export interface ISavedAgent extends Document {
  userId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SavedAgentSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one saved agent per user per agent
SavedAgentSchema.index({ userId: 1, agentId: 1 }, { unique: true });

export default mongoose.model<ISavedAgent>('SavedAgent', SavedAgentSchema);
