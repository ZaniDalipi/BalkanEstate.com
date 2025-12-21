/**
 * In-Memory API Response Cache
 * Provides caching for frequently accessed, rarely changing data
 */

import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

// Simple in-memory cache (consider Redis for production scaling)
const cache = new Map<string, CacheEntry>();

// Cache configuration by route pattern
const cacheConfig: Record<string, number> = {
  // Public data that changes infrequently (5 minutes)
  '/api/cities': 5 * 60 * 1000,
  '/api/agencies': 2 * 60 * 1000,
  '/api/agents': 2 * 60 * 1000,

  // Property listings (1 minute - more dynamic)
  '/api/properties': 1 * 60 * 1000,

  // Static data (30 minutes)
  '/api/products': 30 * 60 * 1000,
};

// Max cache size to prevent memory issues
const MAX_CACHE_SIZE = 1000;

/**
 * Generate a cache key from request
 */
const generateCacheKey = (req: Request): string => {
  const baseUrl = req.baseUrl + req.path;
  const queryString = JSON.stringify(req.query);
  return `${req.method}:${baseUrl}:${queryString}`;
};

/**
 * Generate ETag from data
 */
const generateETag = (data: any): string => {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
};

/**
 * Get cache TTL for a route
 */
const getCacheTTL = (path: string): number | null => {
  for (const [pattern, ttl] of Object.entries(cacheConfig)) {
    if (path.startsWith(pattern)) {
      return ttl;
    }
  }
  return null;
};

/**
 * Clean old cache entries
 */
const cleanCache = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  cache.forEach((entry, key) => {
    // Find the TTL for this entry
    const path = key.split(':')[1];
    const ttl = getCacheTTL(path) || 60000;

    if (now - entry.timestamp > ttl) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => cache.delete(key));

  // If still too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => cache.delete(key));
  }
};

// Run cache cleanup every minute
setInterval(cleanCache, 60 * 1000);

/**
 * Cache middleware for GET requests
 * Only caches successful responses
 */
export const apiCache = (req: Request, res: Response, next: NextFunction): void => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    next();
    return;
  }

  const path = req.baseUrl + req.path;
  const ttl = getCacheTTL(path);

  // Skip if route is not configured for caching
  if (!ttl) {
    next();
    return;
  }

  // Skip caching for authenticated requests (personalized data)
  if (req.headers.authorization) {
    next();
    return;
  }

  const cacheKey = generateCacheKey(req);
  const cached = cache.get(cacheKey);

  if (cached) {
    const age = Date.now() - cached.timestamp;

    // Check if cache is still valid
    if (age < ttl) {
      // Check If-None-Match header for 304 response
      const clientETag = req.headers['if-none-match'];
      if (clientETag === cached.etag) {
        res.status(304).end();
        return;
      }

      // Return cached response
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', `public, max-age=${Math.floor((ttl - age) / 1000)}`);
      res.json(cached.data);
      return;
    }

    // Cache expired, remove it
    cache.delete(cacheKey);
  }

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to cache the response
  res.json = (data: any): Response => {
    // Only cache successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const etag = generateETag(data);

      cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        etag,
      });

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl / 1000)}`);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Invalidate cache for a specific path pattern
 */
export const invalidateCache = (pathPattern: string): void => {
  const keysToDelete: string[] = [];

  cache.forEach((_, key) => {
    if (key.includes(pathPattern)) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => cache.delete(key));
  console.log(`🗑️ Cache invalidated for pattern: ${pathPattern} (${keysToDelete.length} entries)`);
};

/**
 * Clear entire cache
 */
export const clearCache = (): void => {
  const size = cache.size;
  cache.clear();
  console.log(`🗑️ Cache cleared (${size} entries)`);
};

/**
 * Get cache statistics
 */
export const getCacheStats = (): { size: number; entries: string[] } => {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
};

export default {
  apiCache,
  invalidateCache,
  clearCache,
  getCacheStats,
};
