import mongoose, { Document, Schema } from 'mongoose';

export type ViewingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show';

export interface IViewing extends Document {
  propertyId: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId; // Property owner (seller/agent)
  buyerId: mongoose.Types.ObjectId; // Person requesting the viewing
  startTime: Date;
  endTime: Date;
  status: ViewingStatus;
  notes?: string; // Additional notes from buyer
  agentNotes?: string; // Private notes from agent
  meetingLocation?: string; // Where to meet (e.g., "At the property entrance")
  cancellationReason?: string;
  cancelledBy?: 'agent' | 'buyer';
  rescheduledFrom?: mongoose.Types.ObjectId; // Reference to original viewing if rescheduled
  // Reminder tracking
  reminder24hSent: boolean;
  reminder24hSentAt?: Date;
  reminder1hSent: boolean;
  reminder1hSentAt?: Date;
  // Feedback (after viewing is completed)
  buyerFeedback?: {
    rating?: number; // 1-5
    interested: boolean;
    comments?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ViewingSchema: Schema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show'],
      default: 'scheduled',
      index: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    agentNotes: {
      type: String,
      maxlength: 1000,
    },
    meetingLocation: {
      type: String,
      maxlength: 500,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
    cancelledBy: {
      type: String,
      enum: ['agent', 'buyer'],
    },
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Viewing',
    },
    // Reminder tracking
    reminder24hSent: {
      type: Boolean,
      default: false,
    },
    reminder24hSentAt: {
      type: Date,
    },
    reminder1hSent: {
      type: Boolean,
      default: false,
    },
    reminder1hSentAt: {
      type: Date,
    },
    // Feedback
    buyerFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      interested: {
        type: Boolean,
      },
      comments: {
        type: String,
        maxlength: 1000,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ViewingSchema.index({ propertyId: 1, startTime: 1 });
ViewingSchema.index({ agentId: 1, startTime: 1, status: 1 });
ViewingSchema.index({ buyerId: 1, startTime: 1, status: 1 });
ViewingSchema.index({ status: 1, startTime: 1 }); // For reminder worker
ViewingSchema.index({ startTime: 1, reminder24hSent: 1 }); // For 24h reminders
ViewingSchema.index({ startTime: 1, reminder1hSent: 1 }); // For 1h reminders

export default mongoose.model<IViewing>('Viewing', ViewingSchema);
