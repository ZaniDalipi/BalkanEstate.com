import mongoose, { Document, Schema } from 'mongoose';

export interface ISiteContent extends Document {
  key: string; // Unique identifier e.g., 'how-it-works-getting-started-1'
  type: 'video' | 'image';
  url: string;
  publicId?: string; // Cloudinary public ID
  title: string;
  description?: string;
  section: string; // e.g., 'how-it-works', 'homepage'
  subsection?: string; // e.g., 'getting-started', 'agencies'
  order: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const siteContentSchema = new Schema<ISiteContent>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['video', 'image'],
      required: true,
      default: 'video',
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    section: {
      type: String,
      required: true,
      index: true,
    },
    subsection: {
      type: String,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
siteContentSchema.index({ section: 1, subsection: 1, order: 1 });

export default mongoose.model<ISiteContent>('SiteContent', siteContentSchema);
