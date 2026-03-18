import mongoose, { Document, Schema } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Unique subscription per endpoint (prevents duplicates)
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

// Compound index for user lookups
PushSubscriptionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
