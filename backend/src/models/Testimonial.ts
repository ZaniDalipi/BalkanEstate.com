import mongoose, { Document, Schema } from 'mongoose';

export interface ITestimonial extends Document {
  userId?: mongoose.Types.ObjectId;
  name: string;
  avatarUrl?: string;
  profession?: string;
  country?: string;
  rating: number;
  quote: string;
  source: 'platform' | 'google';
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  googleReviewId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    avatarUrl: { type: String, trim: true },
    profession: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 60 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    quote: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
    source: {
      type: String,
      enum: ['platform', 'google'],
      default: 'platform',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNotes: { type: String, trim: true },
    googleReviewId: { type: String, trim: true, unique: true, sparse: true },
  },
  { timestamps: true }
);

TestimonialSchema.index({ status: 1, createdAt: -1 });
TestimonialSchema.index({ source: 1 });
TestimonialSchema.index({ googleReviewId: 1 }, { unique: true, sparse: true });

export default mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);
