import { useQuery } from '@tanstack/react-query';
import { adBannerKeys } from '@/src/shared/query/queryKeys';
import { fetchAdBanners } from '../api/adBannerApi';
import type { AdBanner, AdPage, AdPlacement } from '../types';

/**
 * Fetch active ad banners for the current page. Results are cached per page and
 * shared across placements, so every placement on a page reuses one request.
 */
export function useAdBanners(page: AdPage) {
  return useQuery<AdBanner[]>({
    queryKey: adBannerKeys.publicByPage(page),
    queryFn: () => fetchAdBanners(page),
    staleTime: 5 * 60 * 1000, // 5 minutes — ads change rarely
    gcTime: 10 * 60 * 1000,
  });
}

/** Convenience selector: banners for a specific placement, ordered. */
export function selectByPlacement(banners: AdBanner[] | undefined, placement: AdPlacement): AdBanner[] {
  if (!banners) return [];
  return banners
    .filter((b) => b.placement === placement)
    .sort((a, b) => a.order - b.order);
}
