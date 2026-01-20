import mongoose, { Document, Schema } from 'mongoose';

// Step interface for guides/tutorials
export interface IStep {
  stepNumber: number;
  title: string;
  description: string;
  icon?: string; // Icon name or URL
  duration?: string; // e.g., "2 mins", "Quick"
  tips?: string[];
}

// FAQ interface for frequently asked questions
export interface IFAQ {
  question: string;
  answer: string;
  order: number;
}

export interface ISiteContent extends Document {
  key: string; // Unique identifier e.g., 'how-it-works-getting-started-1'
  type: 'video' | 'image';
  contentType: 'video' | 'guide' | 'faq' | 'feature'; // Type of content
  url: string;
  publicId?: string; // Cloudinary public ID
  title: string;
  description?: string;
  section: string; // e.g., 'how-it-works', 'homepage'
  subsection?: string; // e.g., 'getting-started', 'agencies'
  category?: string; // e.g., 'registration', 'subscription', 'agency-creation'
  order: number;
  isActive: boolean;
  // Steps for guide content type
  steps?: IStep[];
  // FAQs for faq content type
  faqs?: IFAQ[];
  // Feature highlights
  features?: string[];
  // Additional metadata
  estimatedTime?: string; // e.g., "5 mins to complete"
  difficulty?: 'easy' | 'medium' | 'advanced';
  tags?: string[];
  createdBy: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const stepSchema = new Schema<IStep>(
  {
    stepNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    duration: { type: String },
    tips: [{ type: String }],
  },
  { _id: false }
);

const faqSchema = new Schema<IFAQ>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

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
    contentType: {
      type: String,
      enum: ['video', 'guide', 'faq', 'feature'],
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
    category: {
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
    steps: [stepSchema],
    faqs: [faqSchema],
    features: [{ type: String }],
    estimatedTime: {
      type: String,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'advanced'],
    },
    tags: [{ type: String }],
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
siteContentSchema.index({ section: 1, category: 1, order: 1 });
siteContentSchema.index({ contentType: 1, isActive: 1 });

export default mongoose.model<ISiteContent>('SiteContent', siteContentSchema);
