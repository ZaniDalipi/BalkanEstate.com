export const AD_PLACEMENTS = [
  'sticky-bottom',
  'sticky-top',
  'header',
  'in-content',
  'sidebar',
  'footer',
] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export const AD_PAGES = [
  'all',
  'home',
  'search',
  'rentals',
  'property-details',
  'agents',
  'agencies',
  'business-directory',
  'blog',
  'guides',
] as const;
export type AdPage = (typeof AD_PAGES)[number];

/** Public-facing banner shape (sensitive fields such as price/contact are stripped by the API). */
export interface AdBanner {
  id: string;
  title: string;
  advertiserName: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  page: AdPage;
  category?: string;
  isActive: boolean;
  isSticky: boolean;
  startDate?: string;
  endDate?: string;
  order: number;
}

/** Full banner shape including admin-only bookkeeping fields. */
export interface AdBannerAdmin extends AdBanner {
  advertiserContact?: string;
  imagePublicId?: string;
  price?: number;
  currency: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}
