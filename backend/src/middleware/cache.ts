/**
 * In-Memory API Response Cache
 * Provides caching for frequently accessed, rarely changing data
 */

import { Request, Response, NextFunction } from 'express';
import { apiLogger } from '../utils/logger';

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

// Simple in-memory cache (consider Redis for production scaling)
const cache = new Map<string, CacheEntry>();

// Cache configuration by route pattern
const cacheConfig: Record<string, number> = {
  // Public data that changes infrequently (15 minutes)
  '/api/cities': 15 * 60 * 1000,
  '/api/agencies': 10 * 60 * 1000,
  '/api/agents': 10 * 60 * 1000,

  // Property listings (5 minutes - balance freshness with performance)
  '/api/properties': 5 * 60 * 1000,

  // Static/semi-static data (30 minutes)
  '/api/products': 30 * 60 * 1000,
  '/api/promotions/tiers': 30 * 60 * 1000,
  '/api/coupons/public': 10 * 60 * 1000,

  // Neighborhood and location data (20 minutes)
  '/api/neighborhood-insights': 20 * 60 * 1000,
  '/api/geocoding': 20 * 60 * 1000,

  // Market data (1 hour - updated biweekly)
  '/api/city-market-data': 60 * 60 * 1000,
  '/api/sales-history': 30 * 60 * 1000,

  // Content pages (15 minutes)
  '/api/site-content': 15 * 60 * 1000,
};

// Max cache size to prevent memory issues
const MAX_CACHE_SIZE = 1000;

/**
 * Generate a cache key from request
 * Includes auth status to separate caches for authenticated vs non-authenticated users
 */
const generateCacheKey = (req: Request): string => {
  const baseUrl = req.baseUrl + req.path;

  // Sort and stringify query params for consistent keys
  const sortedQuery = Object.keys(req.query)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = req.query[key];
      return acc;
    }, {});
  const queryString = JSON.stringify(sortedQuery);

  // Include auth status in cache key for routes that might differ
  const authStatus = req.headers.authorization ? 'auth' : 'public';

  return `${req.method}:${authStatus}:${baseUrl}:${queryString}`;
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

// Routes that should NOT be cached even if they match patterns (personalized data)
const cacheBlacklist = [
  '/api/favorites',
  '/api/saved-agents',
  '/api/saved-searches',
  '/api/conversations',
  '/api/notifications',
  '/api/promotions',
  '/api/subscriptions',
  '/api/payments',
  '/api/auth/me',
  '/api/analytics',
];

/**
 * Check if a route should be excluded from caching
 */
const isBlacklisted = (path: string): boolean => {
  return cacheBlacklist.some(pattern => path.includes(pattern));
};

/**
 * Cache middleware for GET requests
 * Only caches successful responses
 * Now smarter about authenticated requests - caches public-like data even when authenticated
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

  // Skip if route contains personalized data
  if (isBlacklisted(path)) {
    next();
    return;
  }

  // For authenticated requests, we can still cache public-like data
  // (e.g., property listings, agencies, market data)
  // Just include auth status in cache key to separate caches if needed

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

      // Return cached response with stale-while-revalidate
      const maxAge = Math.floor((ttl - age) / 1000);
      const staleWhileRevalidate = Math.floor(ttl / 1000); // Allow serving stale for same duration

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());
      res.setHeader('ETag', cached.etag);
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
      res.setHeader('Vary', 'Authorization'); // Cache varies by auth status
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

      const maxAge = Math.floor(ttl / 1000);
      const staleWhileRevalidate = maxAge; // Allow serving stale for same duration

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`);
      res.setHeader('Vary', 'Authorization'); // Cache varies by auth status
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
  apiLogger.info(`🗑️ Cache invalidated for pattern: ${pathPattern} (${keysToDelete.length} entries)`);
};

/**
 * Clear entire cache
 */
export const clearCache = (): void => {
  const size = cache.size;
  cache.clear();
  apiLogger.info(`🗑️ Cache cleared (${size} entries)`);
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
