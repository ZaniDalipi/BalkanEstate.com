/**
 * API Response Cache with pluggable store
 *
 * Defaults to in-memory Map (single instance).
 * Set REDIS_URL env var to automatically use Redis (multi-instance / distributed).
 */

import { Request, Response, NextFunction } from 'express';
import { apiLogger } from '../utils/logger';

// ── Cache Store Interface ─────────────────────────────────────────

interface CacheEntry {
  data: any;
  timestamp: number;
  etag: string;
}

interface ICacheStore {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPattern(pattern: string): Promise<number>;
  clear(): Promise<number>;
  size(): Promise<number>;
  keys(): Promise<string[]>;
}

// ── In-Memory Store ───────────────────────────────────────────────

const MAX_CACHE_SIZE = 1000;

class MemoryCacheStore implements ICacheStore {
  private cache = new Map<string, CacheEntry>();

  async get(key: string) {
    return this.cache.get(key);
  }

  async set(key: string, entry: CacheEntry, _ttlMs: number) {
    this.cache.set(key, entry);
    // Evict oldest if over limit
    if (this.cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.cache.size - MAX_CACHE_SIZE);
      toRemove.forEach(([k]) => this.cache.delete(k));
    }
  }

  async delete(key: string) {
    this.cache.delete(key);
  }

  async deleteByPattern(pattern: string) {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) keysToDelete.push(key);
    });
    keysToDelete.forEach(k => this.cache.delete(k));
    return keysToDelete.length;
  }

  async clear() {
    const s = this.cache.size;
    this.cache.clear();
    return s;
  }

  async size() {
    return this.cache.size;
  }

  async keys() {
    return Array.from(this.cache.keys());
  }
}

// ── Redis Store ───────────────────────────────────────────────────

class RedisCacheStore implements ICacheStore {
  private client: any; // ioredis instance
  private prefix = 'api_cache:';

  constructor(redisUrl: string) {
    // Dynamic import so ioredis is only required when REDIS_URL is set
    try {
      const Redis = require('ioredis');
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableReadyCheck: true,
      });
      this.client.connect().catch((err: Error) => {
        apiLogger.error('Redis connection failed, falling back may be needed:', err.message);
      });
      this.client.on('error', (err: Error) => {
        apiLogger.error('Redis error:', err.message);
      });
      apiLogger.info('Redis cache store initialized');
    } catch {
      throw new Error('ioredis package not installed. Run: npm install ioredis');
    }
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    try {
      const raw = await this.client.get(this.prefix + key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  }

  async set(key: string, entry: CacheEntry, ttlMs: number): Promise<void> {
    try {
      const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      await this.client.setex(this.prefix + key, ttlSeconds, JSON.stringify(entry));
    } catch {
      // Silently fail — cache is best-effort
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.prefix + key);
    } catch {
      // Silently fail
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let deleted = 0;
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this.prefix}*${pattern}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
      return deleted;
    } catch {
      return 0;
    }
  }

  async clear(): Promise<number> {
    return this.deleteByPattern('');
  }

  async size(): Promise<number> {
    try {
      let cursor = '0';
      let count = 0;
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        count += keys.length;
      } while (cursor !== '0');
      return count;
    } catch {
      return 0;
    }
  }

  async keys(): Promise<string[]> {
    try {
      let cursor = '0';
      const allKeys: string[] = [];
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', `${this.prefix}*`, 'COUNT', 100);
        cursor = nextCursor;
        allKeys.push(...keys.map((k: string) => k.replace(this.prefix, '')));
      } while (cursor !== '0');
      return allKeys;
    } catch {
      return [];
    }
  }
}

// ── Initialize Store ──────────────────────────────────────────────

let cacheStore: ICacheStore;

if (process.env.REDIS_URL) {
  try {
    cacheStore = new RedisCacheStore(process.env.REDIS_URL);
    apiLogger.info('Using Redis cache store');
  } catch (err: any) {
    apiLogger.warn(`Redis init failed (${err.message}), falling back to in-memory cache`);
    cacheStore = new MemoryCacheStore();
  }
} else {
  cacheStore = new MemoryCacheStore();
}

// ── Cache Config ──────────────────────────────────────────────────

const cacheConfig: Record<string, number> = {
  '/api/cities': 15 * 60 * 1000,
  '/api/agencies': 5 * 60 * 1000,
  '/api/agents': 5 * 60 * 1000,
  '/api/properties': 10 * 1000,
  '/api/products': 30 * 1000,
  '/api/promotions/tiers': 30 * 1000,
  '/api/promotion-plans': 30 * 1000,
  '/api/coupons/public': 5 * 60 * 1000,
  '/api/neighborhood-insights': 20 * 60 * 1000,
  '/api/geocoding': 20 * 60 * 1000,
  '/api/city-market-data': 60 * 60 * 1000,
  '/api/sales-history': 30 * 60 * 1000,
  '/api/site-content': 5 * 60 * 1000,
};

// ── Helpers ───────────────────────────────────────────────────────

const generateCacheKey = (req: Request): string => {
  const baseUrl = req.baseUrl + req.path;
  const sortedQuery = Object.keys(req.query)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = req.query[key];
      return acc;
    }, {});
  const queryString = JSON.stringify(sortedQuery);
  const authStatus = req.headers.authorization ? 'auth' : 'public';
  return `${req.method}:${authStatus}:${baseUrl}:${queryString}`;
};

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

const getCacheTTL = (path: string): number | null => {
  for (const [pattern, ttl] of Object.entries(cacheConfig)) {
    if (path.startsWith(pattern)) return ttl;
  }
  return null;
};

// Routes that should NOT be cached (personalized data)
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

const isBlacklisted = (path: string): boolean => {
  return cacheBlacklist.some(pattern => path.includes(pattern));
};

// In-memory store cleanup (Redis handles TTL natively)
if (process.env.NODE_ENV !== 'test' && !process.env.REDIS_URL) {
  setInterval(async () => {
    const now = Date.now();
    const allKeys = await cacheStore.keys();
    for (const key of allKeys) {
      const entry = await cacheStore.get(key);
      if (entry) {
        const path = key.split(':')[2] || '';
        const ttl = getCacheTTL(path) || 60000;
        if (now - entry.timestamp > ttl) {
          await cacheStore.delete(key);
        }
      }
    }
  }, 60 * 1000);
}

// ── Middleware ─────────────────────────────────────────────────────

export const apiCache = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method !== 'GET') {
    next();
    return;
  }

  const path = req.baseUrl + req.path;
  const ttl = getCacheTTL(path);

  if (!ttl) {
    next();
    return;
  }

  if (isBlacklisted(path)) {
    next();
    return;
  }

  const cacheKey = generateCacheKey(req);

  // Async cache lookup — non-blocking
  cacheStore.get(cacheKey).then(cached => {
    if (cached) {
      const age = Date.now() - cached.timestamp;

      if (age < ttl) {
        const clientETag = req.headers['if-none-match'];
        if (clientETag === cached.etag) {
          res.status(304).end();
          return;
        }

        const maxAge = Math.floor((ttl - age) / 1000);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Age', Math.floor(age / 1000).toString());
        res.setHeader('ETag', cached.etag);
        res.setHeader('Cache-Control', `private, max-age=${maxAge}, must-revalidate`);
        res.setHeader('Vary', 'Authorization');
        res.json(cached.data);
        return;
      }

      // Expired
      cacheStore.delete(cacheKey);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    res.json = (data: any): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const etag = generateETag(data);

        cacheStore.set(cacheKey, { data, timestamp: Date.now(), etag }, ttl);

        const maxAge = Math.floor(ttl / 1000);
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `private, max-age=${maxAge}, must-revalidate`);
        res.setHeader('Vary', 'Authorization');
      }

      return originalJson(data);
    };

    next();
  }).catch(() => {
    // Cache failure should never block request
    next();
  });
};

// ── Public API ────────────────────────────────────────────────────

export const invalidateCache = async (pathPattern: string): Promise<void> => {
  const deleted = await cacheStore.deleteByPattern(pathPattern);
  apiLogger.info(`Cache invalidated for pattern: ${pathPattern} (${deleted} entries)`);
};

export const clearCache = async (): Promise<void> => {
  const size = await cacheStore.clear();
  apiLogger.info(`Cache cleared (${size} entries)`);
};

export const getCacheStats = async (): Promise<{ size: number; entries: string[] }> => {
  return {
    size: await cacheStore.size(),
    entries: await cacheStore.keys(),
  };
};

export default {
  apiCache,
  invalidateCache,
  clearCache,
  getCacheStats,
};
