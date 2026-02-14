import mongoose, { Document, Schema } from 'mongoose';

export interface IInquiry extends Document {
  // Inquiry type
  type: 'property' | 'agent' | 'area_search' | 'contact';
  status: 'new' | 'read' | 'replied' | 'archived';

  // Sender info (buyer)
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerId?: mongoose.Types.ObjectId; // If the sender is a registered user

  // Recipient info (agent/seller) - optional for 'contact' type
  recipientId?: mongoose.Types.ObjectId;
  recipientName?: string;
  recipientEmail?: string;

  // Related entities
  propertyId?: mongoose.Types.ObjectId;
  propertyTitle?: string;

  // Message content
  message: string;
  subject?: string; // For contact form inquiries
  location?: string; // For area search inquiries
  propertyType?: string; // For area search inquiries
  budget?: number; // For area search inquiries

  // Admin notes
  adminNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  readAt?: Date;
  repliedAt?: Date;
}

const InquirySchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['property', 'agent', 'area_search', 'contact'],
      required: true,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new',
    },

    // Sender info
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    buyerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    buyerPhone: {
      type: String,
      trim: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    // Recipient info (optional for 'contact' type inquiries)
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recipientName: {
      type: String,
    },
    recipientEmail: {
      type: String,
    },

    // Related entities
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
    },
    propertyTitle: {
      type: String,
    },

    // Message content
    message: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
    },
    location: {
      type: String,
    },
    propertyType: {
      type: String,
    },
    budget: {
      type: Number,
    },

    // Admin notes
    adminNotes: {
      type: String,
    },

    // Read/Reply tracking
    readAt: {
      type: Date,
    },
    repliedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
InquirySchema.index({ recipientId: 1, status: 1 });
InquirySchema.index({ buyerEmail: 1 });
InquirySchema.index({ propertyId: 1 });
InquirySchema.index({ type: 1, status: 1 });
InquirySchema.index({ createdAt: -1 });

export default mongoose.model<IInquiry>('Inquiry', InquirySchema);
