import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  propertyId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  expiresAt: Date; // Auto-delete conversation after 30 days from last message
  buyerUnreadCount: number;
  sellerUnreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true, // Index for efficient cleanup queries
      // Not marked as required because pre-save hook will set it
    },
    buyerUnreadCount: {
      type: Number,
      default: 0,
    },
    sellerUnreadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for finding conversations
ConversationSchema.index({ buyerId: 1, propertyId: 1 });
ConversationSchema.index({ sellerId: 1, propertyId: 1 });

// Pre-save hook to automatically set expiresAt based on lastMessageAt
ConversationSchema.pre('save', function(next) {
  const conversation = this as any as IConversation;

  // Set expiration to 30 days from last message
  // 30 days = 30 * 24 * 60 * 60 * 1000 milliseconds
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  // Always set expiresAt for new conversations or when lastMessageAt changes
  if (conversation.isNew || conversation.isModified('lastMessageAt') || !conversation.expiresAt) {
    const expirationDate = new Date(conversation.lastMessageAt.getTime() + THIRTY_DAYS);
    conversation.expiresAt = expirationDate;

    if (conversation.isNew) {
      console.log(`📅 New conversation will expire on ${expirationDate.toISOString()}`);
    }
  }

  next();
});

export default mongoose.model<IConversation>('Conversation', ConversationSchema);
