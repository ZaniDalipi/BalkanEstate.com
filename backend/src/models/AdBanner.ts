import mongoose, { Document, Schema } from 'mongoose';

/**
 * Placement — where on the page the banner is rendered.
 * The `sticky-*` placements stay pinned to the viewport while scrolling.
 */
export const AD_PLACEMENTS = [
  'sticky-bottom',
  'sticky-top',
  'header',
  'in-content',
  'sidebar',
  'footer',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

/**
 * Page — which page(s) the banner appears on. `all` means every page.
 */
export const AD_PAGES = [
  'all',
  'home',
  'search',
  'rentals',
  'villas',
  'property-details',
  'agents',
  'agencies',
  'business-directory',
  'blog',
  'guides',
] as const;
export type AdPage = (typeof AD_PAGES)[number];

export interface IAdBanner extends Document {
  title: string;
  advertiserName: string;
  advertiserContact?: string;
  imageUrl: string;
  imagePublicId?: string;
  linkUrl: string;
  placement: AdPlacement;
  page: AdPage;
  /** Free-text pricing/grouping tier (e.g. "premium", "standard") so the admin can charge different rates. */
  category?: string;
  /** Monthly price agreed with the advertiser — kept for the admin's own bookkeeping. */
  price?: number;
  currency: string;
  isActive: boolean;
  /** Whether the banner is pinned (sticky) to the viewport. */
  isSticky: boolean;
  startDate?: Date;
  endDate?: Date;
  order: number;
  impressions: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdBannerSchema = new Schema<IAdBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    advertiserName: { type: String, required: true, trim: true, maxlength: 120 },
    advertiserContact: { type: String, trim: true, maxlength: 200 },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    linkUrl: { type: String, required: true, trim: true, maxlength: 2000 },
    placement: {
      type: String,
      enum: AD_PLACEMENTS,
      required: true,
      default: 'sticky-bottom',
    },
    page: {
      type: String,
      enum: AD_PAGES,
      required: true,
      default: 'all',
    },
    category: { type: String, trim: true, maxlength: 60 },
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'EUR' },
    isActive: { type: Boolean, default: true },
    isSticky: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    order: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Fast lookup for the public endpoint (page + placement + active window).
AdBannerSchema.index({ page: 1, placement: 1, isActive: 1 });
AdBannerSchema.index({ category: 1 });
AdBannerSchema.index({ order: 1 });

export default mongoose.model<IAdBanner>('AdBanner', AdBannerSchema);
