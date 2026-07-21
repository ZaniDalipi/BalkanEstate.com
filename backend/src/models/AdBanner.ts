import mongoose, { Document, Schema } from 'mongoose';

/**
 * Canonical list of banner placement slots across the site.
 * Each value identifies a physical "place" where an advertiser banner can be
 * rendered. Keep this in sync with the frontend list in
 * `src/features/ads/placements.ts`.
 */
export const AD_PLACEMENTS = [
  'home-top',
  'home-below-hero',
  'home-mid',
  'search-sidebar',
  'property-details-top',
  'property-details-sidebar',
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_BILLING_PERIODS = ['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'] as const;
export type AdBillingPeriod = (typeof AD_BILLING_PERIODS)[number];

export interface IAdBanner extends Document {
  title: string;
  advertiserName?: string;
  imageUrl: string;
  imagePublicId?: string;
  mobileImageUrl?: string;
  mobileImagePublicId?: string;
  linkUrl: string;
  openInNewTab: boolean;
  placement: AdPlacement;
  isActive: boolean;
  isSticky: boolean;
  dismissible: boolean;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  // Commercial metadata — for the operator's own reference / invoicing
  price?: number;
  currency: string;
  billingPeriod: AdBillingPeriod;
  notes?: string;
  // Performance counters
  impressions: number;
  clicks: number;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdBannerSchema = new Schema<IAdBanner>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    advertiserName: { type: String, trim: true, maxlength: 120 },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    mobileImageUrl: { type: String, trim: true },
    mobileImagePublicId: { type: String, trim: true },
    linkUrl: { type: String, required: true, trim: true },
    openInNewTab: { type: Boolean, default: true },
    placement: {
      type: String,
      enum: AD_PLACEMENTS,
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    isSticky: { type: Boolean, default: false },
    dismissible: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true, uppercase: true, default: 'EUR', maxlength: 3 },
    billingPeriod: { type: String, enum: AD_BILLING_PERIODS, default: 'monthly' },
    notes: { type: String, trim: true, maxlength: 1000 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Fast lookups for the public "banners for this placement, right now" query.
AdBannerSchema.index({ placement: 1, isActive: 1, priority: -1 });

export default mongoose.model<IAdBanner>('AdBanner', AdBannerSchema);
