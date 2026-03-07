import mongoose, { Document, Schema } from 'mongoose';

export interface INews extends Document {
  title: string;
  excerpt: string;
  country: string;
  countryCode: string;
  source: string;
  sourceUrl: string;
  category: 'market' | 'investment' | 'regulation' | 'development' | 'tourism';
  coverImageUrl?: string;
  coverImagePublicId?: string;
  publishedAt: Date;
  fetchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NewsSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    excerpt: { type: String, required: true, trim: true, maxlength: 1000 },
    country: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 2 },
    source: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, trim: true, unique: true },
    category: {
      type: String,
      enum: ['market', 'investment', 'regulation', 'development', 'tourism'],
      default: 'market',
    },
    coverImageUrl: { type: String, trim: true },
    coverImagePublicId: { type: String, trim: true },
    publishedAt: { type: Date, required: true, index: true },
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NewsSchema.index({ publishedAt: -1 });
NewsSchema.index({ country: 1, publishedAt: -1 });
NewsSchema.index({ category: 1 });
NewsSchema.index({ sourceUrl: 1 }, { unique: true });

export default mongoose.model<INews>('News', NewsSchema);
