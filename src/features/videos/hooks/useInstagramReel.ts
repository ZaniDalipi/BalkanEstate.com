import { useQuery } from '@tanstack/react-query';
import { instagramReelKeys } from '@/src/shared/query/queryKeys';
import { resolveInstagramVideo } from '../api/videoApi';

/** Pulls the reel's shortcode out of any of the URL shapes Instagram hands out. */
export const getInstagramShortcode = (url: string): string => {
  if (!url) return '';
  const cleanUrl = url.split('?')[0].replace(/\/$/, '');
  const match = cleanUrl.match(/instagram\.com\/(?:share\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1] || '';
};

/**
 * Resolves an Instagram reel to a file the page can play itself, because
 * Instagram's embed iframe will not autoplay.
 *
 * A miss is an ordinary result rather than an error: the caller keeps
 * Instagram's embed. The lookup is cached for the session and never retried in
 * the background, so a property page costs at most one small request per reel —
 * and the backend caches misses too, so an unreadable reel is cheap.
 */
export const useInstagramReelVideo = (url: string, enabled = true) => {
  const shortcode = getInstagramShortcode(url);

  const query = useQuery({
    queryKey: instagramReelKeys.video(shortcode),
    queryFn: () => resolveInstagramVideo(shortcode),
    enabled: enabled && !!shortcode,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return { videoUrl: query.data?.videoUrl ?? null };
};
