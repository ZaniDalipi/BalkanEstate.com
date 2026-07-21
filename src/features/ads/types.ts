import type { AdPlacement, BillingPeriod } from './placements';

/** Public-facing banner shape returned by GET /api/ad-banners. */
export interface AdBanner {
  _id: string;
  title: string;
  advertiserName?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl: string;
  openInNewTab: boolean;
  placement: AdPlacement;
  isSticky: boolean;
  dismissible: boolean;
  priority: number;
}

/** Full banner shape (admin view) including commercial + performance data. */
export interface AdBannerAdmin extends AdBanner {
  imagePublicId?: string;
  mobileImagePublicId?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  price?: number;
  currency: string;
  billingPeriod: BillingPeriod;
  notes?: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdBannerFormData {
  title: string;
  advertiserName: string;
  imageUrl: string;
  imagePublicId: string;
  mobileImageUrl: string;
  mobileImagePublicId: string;
  linkUrl: string;
  openInNewTab: boolean;
  placement: AdPlacement;
  isActive: boolean;
  isSticky: boolean;
  dismissible: boolean;
  priority: number;
  startDate: string;
  endDate: string;
  price: string;
  currency: string;
  billingPeriod: BillingPeriod;
  notes: string;
}
