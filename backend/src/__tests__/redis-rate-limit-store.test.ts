/**
 * Rate-limit counters in Redis: the store against a small fake Redis (same
 * semantics as the INCR/PEXPIRE script), wired into express-rate-limit.
 */
process.env.SKIP_TEST_DB = 'true';

import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { RedisRateLimitStore, rateLimitStore, type RedisLike } from '../middleware/redisRateLimitStore';

/** Just enough Redis: counters with millisecond expiry, on a controllable clock. */
function fakeRedis() {
  let now = 1_000_000;
  const data = new Map<string, { value: number; expiresAt: number | null }>();
  const live = (k: string) => {
    const e = data.get(k);
    if (e && e.expiresAt !== null && e.expiresAt <= now) data.delete(k);
    return data.get(k);
  };
  const client = {
    eval: async (_script: string, _n: number, key: string, windowMs: string) => {
      const e = live(key) ?? { value: 0, expiresAt: null };
      e.value += 1;
      if (e.value === 1 || e.expiresAt === null) e.expiresAt = now + Number(windowMs);
      data.set(key, e);
      return [e.value, e.expiresAt - now];
    },
    get: async (key: string) => (live(key) ? String(live(key)!.value) : null),
    pttl: async (key: string) => { const e = live(key); return e ? (e.expiresAt === null ? -1 : e.expiresAt - now) : -2; },
    decr: async (key: string) => { const e = live(key); if (e) e.value -= 1; return e?.value ?? -1; },
    del: async (key: string) => (data.delete(key) ? 1 : 0),
  } as unknown as RedisLike;
  return { client, data, advance: (ms: number) => { now += ms; } };
}

const appWith = (store: RedisRateLimitStore, max = 2, passOnStoreError = true) => {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/r', rateLimit({ windowMs: 60_000, max, store, passOnStoreError, validate: false }), (_req, res) => { res.json({ ok: true }); });
  return app;
};

describe('RedisRateLimitStore', () => {
  it('counts hits per key under its prefix and reports when the window resets', async () => {
    const redis = fakeRedis();
    const store = new RedisRateLimitStore(redis.client, 'rl:routing:');
    store.init({ windowMs: 60_000 } as never);
    expect((await store.increment('1.1.1.1')).totalHits).toBe(1);
    const second = await store.increment('1.1.1.1');
    expect(second.totalHits).toBe(2);
    expect(second.resetTime!.getTime() - Date.now()).toBeLessThanOrEqual(60_000);
    expect([...redis.data.keys()]).toEqual(['rl:routing:1.1.1.1']);
    await store.decrement('1.1.1.1');
    expect((await store.get('1.1.1.1'))?.totalHits).toBe(1);
    await store.resetKey('1.1.1.1');
    expect(await store.get('1.1.1.1')).toBeUndefined();
  });

  it('limits through express-rate-limit, and lets the visitor back after the window', async () => {
    const redis = fakeRedis();
    const app = appWith(new RedisRateLimitStore(redis.client, 'rl:t:'));
    await request(app).get('/r').expect(200);
    await request(app).get('/r').expect(200);
    await request(app).get('/r').expect(429);
    redis.advance(60_001);
    await request(app).get('/r').expect(200);
  });

  it('shares counts across "instances" (two apps, one Redis)', async () => {
    const redis = fakeRedis();
    const a = appWith(new RedisRateLimitStore(redis.client, 'rl:t:'));
    const b = appWith(new RedisRateLimitStore(redis.client, 'rl:t:'));
    await request(a).get('/r').expect(200);
    await request(b).get('/r').expect(200);
    await request(a).get('/r').expect(429);
  });

  it('lets requests through when Redis is down, rather than failing them', async () => {
    const broken = { eval: async () => { throw new Error('ECONNREFUSED'); } } as unknown as RedisLike;
    const app = appWith(new RedisRateLimitStore(broken, 'rl:t:'));
    await request(app).get('/r').expect(200);
  });

  it('falls back to in-memory counters without REDIS_URL', () => {
    expect(rateLimitStore('routing', {} as NodeJS.ProcessEnv)).toBeUndefined();
  });
});
