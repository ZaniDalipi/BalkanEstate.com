import mongoose, { Document, Schema } from 'mongoose';

export interface IViewing extends Document {
  propertyId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  // Visitor info
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  visitorMessage?: string;
  // Scheduled time
  date: Date; // The date of the viewing
  timeSlot: string; // e.g. "10:00"
  // Status tracking
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancelledBy?: 'visitor' | 'seller';
  cancelReason?: string;
  // Timestamps
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
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Visitor info
    visitorName: {
      type: String,
      required: true,
      trim: true,
    },
    visitorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    visitorPhone: {
      type: String,
      trim: true,
    },
    visitorMessage: {
      type: String,
      trim: true,
    },
    // Scheduled time
    date: {
      type: Date,
      required: true,
      index: true,
    },
    timeSlot: {
      type: String,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: ['visitor', 'seller'],
    },
    cancelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ViewingSchema.index({ propertyId: 1, date: 1 });
ViewingSchema.index({ visitorEmail: 1, status: 1 });
ViewingSchema.index({ sellerId: 1, date: 1, status: 1 });

export default mongoose.model<IViewing>('Viewing', ViewingSchema);
