import { apiRequest } from '@/src/shared/api';
import type { AdPlacement } from '../placements';
import type { AdBanner } from '../types';

/** Fetch the currently-live banners for a placement. */
export const getBannersForPlacement = async (placement: AdPlacement): Promise<AdBanner[]> => {
  return apiRequest<AdBanner[]>(`/ad-banners?placement=${encodeURIComponent(placement)}`);
};

/** Fire-and-forget impression tracking. Never throws. */
export const trackBannerImpression = async (bannerId: string): Promise<void> => {
  try {
    await apiRequest(`/ad-banners/${bannerId}/impression`, { method: 'POST' });
  } catch {
    /* tracking failures must not affect the UI */
  }
};

/** Fire-and-forget click tracking. Never throws. */
export const trackBannerClick = async (bannerId: string): Promise<void> => {
  try {
    await apiRequest(`/ad-banners/${bannerId}/click`, { method: 'POST' });
  } catch {
    /* tracking failures must not affect the UI */
  }
};
