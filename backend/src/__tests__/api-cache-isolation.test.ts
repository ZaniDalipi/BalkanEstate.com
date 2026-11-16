/**
 * The API response cache must never hand one signed-in user's answer to
 * another, and must not let a browser keep showing a signed-in user the state
 * from before their own change.
 */

process.env.SKIP_TEST_DB = 'true';

import request from 'supertest';
import express from 'express';
import { apiCache, clearCache, invalidateCache, isPersonalPath } from '../middleware/cache';

/** An app whose answers say who asked and how many times the handler really ran. */
const createApp = () => {
  let calls = 0;
  const app = express();
  app.use('/api', apiCache);
  const handler = (req: express.Request, res: express.Response) => {
    calls += 1;
    res.json({ for: req.headers.authorization ?? 'visitor', calls });
  };
  app.get('/api/properties', handler);
  app.get('/api/properties/my/listings', handler);
  return { app, calls: () => calls };
};

beforeEach(async () => { await clearCache(); });

describe('apiCache', () => {
  it('never serves one signed-in user the answer cached for another', async () => {
    const { app } = createApp();
    const alice = await request(app).get('/api/properties').set('Authorization', 'Bearer alice-token');
    const bob = await request(app).get('/api/properties').set('Authorization', 'Bearer bob-token');
    expect(alice.body.for).toBe('Bearer alice-token');
    expect(bob.body.for).toBe('Bearer bob-token');
  });

  it('still shares one cached answer between visitors, and lets their browser reuse it', async () => {
    const { app, calls } = createApp();
    const first = await request(app).get('/api/properties');
    const second = await request(app).get('/api/properties');
    expect(calls()).toBe(1);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(first.headers['cache-control']).toMatch(/max-age=\d+/);
  });

  it('makes a signed-in browser ask every time, answering 304 while nothing changed', async () => {
    const { app, calls } = createApp();
    const first = await request(app).get('/api/properties').set('Authorization', 'Bearer alice-token');
    expect(first.headers['cache-control']).toBe('private, no-cache');

    const unchanged = await request(app).get('/api/properties')
      .set('Authorization', 'Bearer alice-token')
      .set('If-None-Match', first.headers.etag);
    expect(unchanged.status).toBe(304);
    expect(calls()).toBe(1);
  });

  it('answers fresh right after a change invalidates the path', async () => {
    const { app, calls } = createApp();
    await request(app).get('/api/properties').set('Authorization', 'Bearer alice-token');
    await invalidateCache('/api/properties');
    const after = await request(app).get('/api/properties').set('Authorization', 'Bearer alice-token');
    expect(after.body.calls).toBe(2);
    expect(calls()).toBe(2);
  });

  it('never caches "my" routes, on the server or in the browser', async () => {
    const { app, calls } = createApp();
    const first = await request(app).get('/api/properties/my/listings').set('Authorization', 'Bearer alice-token');
    const second = await request(app).get('/api/properties/my/listings').set('Authorization', 'Bearer alice-token');
    expect(calls()).toBe(2);
    expect(second.body.calls).toBe(2);
    expect(first.headers['cache-control']).toBe('private, no-store');
    expect(first.headers['x-cache']).toBeUndefined();
  });
});

describe('isPersonalPath', () => {
  it('recognises "mine" wherever it is mounted, and nothing else', () => {
    for (const path of ['/api/properties/my/listings', '/api/agents/me', '/api/agencies/my-agency', '/api/auth/me']) {
      expect(isPersonalPath(path)).toBe(true);
    }
    for (const path of ['/api/properties', '/api/properties/myrtle-beach', '/api/cities/mesta', '/api/agents/merita']) {
      expect(isPersonalPath(path)).toBe(false);
    }
  });
});
