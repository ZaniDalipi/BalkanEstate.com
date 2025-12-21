import mongoose, { Document, Schema } from 'mongoose';
import { sanitizeMessage } from '../utils/messageFilter';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  text?: string; // Plain text for server-side filtering (will be sanitized before client encryption)

  // E2E Encryption fields
  encryptedMessage?: string; // Base64 encoded encrypted message
  encryptedKeys?: Map<string, string>; // userId -> Base64 encoded encrypted AES key
  iv?: string; // Base64 encoded IV for AES-GCM

  imageUrl?: string;
  imagePublicId?: string; // Cloudinary public ID for image cleanup
  isRead: boolean;
  hadSensitiveInfo?: boolean;
  securityWarnings?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: false, // Not required for E2E encrypted messages
    },
    encryptedMessage: {
      type: String,
      required: false,
    },
    encryptedKeys: {
      type: Map,
      of: String,
      required: false,
    },
    iv: {
      type: String,
      required: false,
    },
    imageUrl: {
      type: String,
    },
    imagePublicId: {
      type: String,
      // Cloudinary public_id for image deletion during cleanup
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    hadSensitiveInfo: {
      type: Boolean,
      default: false,
    },
    securityWarnings: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for fetching conversation messages
MessageSchema.index({ conversationId: 1, createdAt: 1 });

// Pre-save hook to sanitize messages (only if text is provided for server-side filtering)
MessageSchema.pre('save', function(next) {
  const message = this as any as IMessage;

  // Only process text if provided (for sensitive info filtering before encryption)
  if (message.text && (message.isNew || message.isModified('text'))) {
    try {
      // Sanitize the message for sensitive information
      const { sanitized, hadSensitiveInfo, warnings } = sanitizeMessage(message.text);

      // Update the text with sanitized version
      message.text = sanitized;
      message.hadSensitiveInfo = hadSensitiveInfo;
      message.securityWarnings = warnings;
    } catch (error) {
      console.error('Error processing message:', error);
      return next(error as Error);
    }
  }

  next();
});

export default mongoose.model<IMessage>('Message', MessageSchema);
