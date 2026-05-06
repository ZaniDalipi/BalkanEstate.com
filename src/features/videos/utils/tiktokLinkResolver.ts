/**
 * TikTok Link Resolver Utility
 *
 * Resolves TikTok short links (vm.tiktok.com, vt.tiktok.com, tiktok.com/t/) to their full form
 * Caches results in memory to avoid repeated API calls
 */

interface ResolveTikTokResult {
  videoId: string;
  username: string;
  fullUrl: string;
}

interface CacheEntry {
  data: ResolveTikTokResult;
  timestamp: number;
}

// In-memory cache with 1-hour TTL
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

/**
 * Check if a URL is a TikTok short link
 */
export const isTikTokShortLink = (url: string): boolean => {
  if (!url) return false;
  return /v[mt]\.tiktok\.com\/([^\s/?#]+)|tiktok\.com\/t\/([^\s/?#]+)/i.test(url);
};

/**
 * Resolve a TikTok short link to get video ID and username
 *
 * @param url - TikTok short link (vm.tiktok.com, vt.tiktok.com, or tiktok.com/t/)
 * @returns Object with videoId, username, and fullUrl
 * @throws Error if the link cannot be resolved
 */
export const resolveTikTokShortLink = async (url: string): Promise<ResolveTikTokResult> => {
  if (!url) {
    throw new Error('URL is required');
  }

  // Check cache first
  const cached = cache.get(url);
  if (cached) {
    const age = Date.now() - cached.timestamp;
    if (age < CACHE_TTL) {
      console.log('[TikTok Resolver] Cache hit for:', url);
      return cached.data;
    } else {
      // Remove expired entry
      cache.delete(url);
    }
  }

  try {
    console.log('[TikTok Resolver] Resolving:', url);

    // Call backend endpoint
    const response = await fetch('/api/videos/resolve-tiktok-short-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to resolve TikTok link (HTTP ${response.status})`);
    }

    const result: ResolveTikTokResult = await response.json();

    // Cache the result
    cache.set(url, {
      data: result,
      timestamp: Date.now(),
    });

    console.log('[TikTok Resolver] Resolved:', url, 'to video ID:', result.videoId);

    return result;
  } catch (error) {
    console.error('[TikTok Resolver] Failed to resolve:', url, error);
    throw error;
  }
};

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export const clearTikTokCache = (): void => {
  cache.clear();
  console.log('[TikTok Resolver] Cache cleared');
};

/**
 * Get cache statistics (for debugging)
 */
export const getTikTokCacheStats = () => {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([url, entry]) => ({
      url,
      age: Date.now() - entry.timestamp,
      videoId: entry.data.videoId,
    })),
  };
};
