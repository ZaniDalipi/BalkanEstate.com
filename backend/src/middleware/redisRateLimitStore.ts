import Redis from 'ioredis';
import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';
import { apiLogger } from '../utils/logger';

/**
 * Rate-limit counters in Redis, so every server instance shares them and they
 * survive restarts. Used when REDIS_URL is set; otherwise express-rate-limit
 * keeps its default in-memory counters.
 *
 * One atomic script per hit: increment, start the window on the first hit,
 * and read back how long the window has left.
 */
const INCREMENT_SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) ttl = tonumber(ARGV[1]) end
return {hits, ttl}
`;

/** The few Redis commands the store needs (so tests can pass a fake). */
export type RedisLike = Pick<Redis, 'eval' | 'decr' | 'del' | 'get' | 'pttl'>;

export class RedisRateLimitStore implements Store {
  /** Counters are shared across processes, not kept in this one. */
  localKeys = false;
  private windowMs = 60_000;

  constructor(private readonly client: RedisLike, public readonly prefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(k: string): string {
    return `${this.prefix}${k}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const [hits, ttl] = (await this.client.eval(INCREMENT_SCRIPT, 1, this.key(key), String(this.windowMs))) as [number, number];
    return { totalHits: Number(hits), resetTime: new Date(Date.now() + Math.max(0, Number(ttl))) };
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const [hits, ttl] = await Promise.all([this.client.get(this.key(key)), this.client.pttl(this.key(key))]);
    if (hits === null) return undefined;
    return { totalHits: Number(hits), resetTime: ttl > 0 ? new Date(Date.now() + ttl) : undefined };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(this.key(key));
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }
}

let shared: Redis | null = null;

/** One lazily-made Redis connection for all rate limiters. */
function sharedClient(url: string): Redis {
  if (!shared) {
    shared = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
    shared.on('error', (err: Error) => apiLogger.warn(`Rate-limit Redis error: ${err.message}`));
  }
  return shared;
}

/**
 * A Redis store for one limiter (each limiter needs its own prefix), or
 * undefined — meaning express-rate-limit's in-memory store — without REDIS_URL.
 */
export function rateLimitStore(name: string, env: NodeJS.ProcessEnv = process.env): Store | undefined {
  return env.REDIS_URL ? new RedisRateLimitStore(sharedClient(env.REDIS_URL), `rl:${name}:`) : undefined;
}
