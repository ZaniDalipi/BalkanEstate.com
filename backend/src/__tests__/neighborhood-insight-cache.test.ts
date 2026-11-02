/**
 * Per-user insight endpoints must bypass the shared GET cache. Its key has no
 * user id, so caching them showed one user's data (or a stale "nothing saved")
 * to everyone else for 20 minutes.
 */

import request from 'supertest';
import express from 'express';
import { apiCache } from '../middleware/cache';

describe('neighborhood insights are not served from the shared cache', () => {
  const buildApp = () => {
    let calls = 0;
    const app = express();
    app.use('/api', apiCache);
    app.get('/api/neighborhood-insights/saved/:listingId', (req, res) => {
      calls += 1;
      // Different users hold different tokens; the answer depends on who asks.
      res.json({ insights: req.headers.authorization === 'Bearer owner' ? 'my report' : null });
    });
    return { app, calls: () => calls };
  };

  it('answers every request from the handler, for the right user', async () => {
    const { app, calls } = buildApp();
    const url = '/api/neighborhood-insights/saved/listing1';

    // Another user opens the listing first (nothing saved for them)...
    expect((await request(app).get(url).set('Authorization', 'Bearer other')).body.insights).toBeNull();
    // ...then the owner asks: they must get their own report, not the cached null.
    const owner = await request(app).get(url).set('Authorization', 'Bearer owner');
    expect(owner.body.insights).toBe('my report');
    expect(owner.headers['x-cache']).toBeUndefined();
    expect(calls()).toBe(2);
  });
});
