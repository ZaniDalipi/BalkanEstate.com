import { apiRequest } from '@/src/shared/api';
import type { AdBanner, AdPage, AdPlacement } from '../types';

interface PublicBannersResponse {
  banners: AdBanner[];
}

/** Fetch active banners for a given page (and optionally a single placement). */
export const fetchAdBanners = async (
  page: AdPage,
  placement?: AdPlacement
): Promise<AdBanner[]> => {
  const params = new URLSearchParams({ page });
  if (placement) params.set('placement', placement);
  const data = await apiRequest<PublicBannersResponse>(`/promo-slots?${params.toString()}`);
  return data.banners || [];
};

/** Fire-and-forget impression tracking. */
export const trackImpression = (id: string): void => {
  apiRequest(`/promo-slots/${id}/impression`, { method: 'POST' }).catch(() => {});
};

/** Fire-and-forget click tracking. */
export const trackClick = (id: string): void => {
  apiRequest(`/promo-slots/${id}/click`, { method: 'POST' }).catch(() => {});
};
