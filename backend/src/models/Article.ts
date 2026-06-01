import mongoose, { Document, Schema } from 'mongoose';

export interface IArticle extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: mongoose.Types.ObjectId;
  category: 'market' | 'investment' | 'regulation' | 'development' | 'tourism' | 'guide' | 'lifestyle';
  tags: string[];
  country?: string;
  countryCode?: string;
  coverImageUrl?: string;
  coverImagePublicId?: string;
  status: 'draft' | 'published';
  publishedAt?: Date;
  readTime?: number;
  viewCount: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, trim: true },
    content: { type: String, required: true, maxlength: 500000 },
    excerpt: { type: String, required: true, trim: true, maxlength: 500 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['market', 'investment', 'regulation', 'development', 'tourism', 'guide', 'lifestyle'],
      default: 'guide',
    },
    tags: [{ type: String, trim: true }],
    country: { type: String, trim: true },
    countryCode: { type: String, trim: true, uppercase: true, maxlength: 2 },
    coverImageUrl: { type: String, trim: true },
    coverImagePublicId: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, index: true },
    readTime: { type: Number, min: 1 },
    viewCount: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for common queries
ArticleSchema.index({ slug: 1 }, { unique: true });
ArticleSchema.index({ status: 1, publishedAt: -1 });
ArticleSchema.index({ category: 1 });
ArticleSchema.index({ country: 1, publishedAt: -1 });
ArticleSchema.index({ tags: 1 });

// Pre-save hook: auto-generate slug and readTime
// pre('validate') runs before Mongoose validation — must generate slug here
// so the required:true check on slug doesn't fail for new documents.
ArticleSchema.pre<IArticle>('validate', function (next) {
  if (!this.slug) {
    const baseSlug = (this.title || 'article')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') || 'article';
    const shortId = Math.random().toString(36).substring(2, 8);
    this.slug = `${baseSlug}-${shortId}`;
  }

  if (!this.readTime && this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }

  next();
});

export default mongoose.model<IArticle>('Article', ArticleSchema);
