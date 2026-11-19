import express from 'express';
import request from 'supertest';
import { verifyTurnstileToken, type FetchLike } from '../../services/turnstile/turnstileVerifier';
import { requireTurnstile } from '../../middleware/requireTurnstile';

const reply = (body: unknown, status = 200): FetchLike => jest.fn(async () => ({ ok: status < 400, status, json: async () => body }));
const failing: FetchLike = jest.fn(async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); });

describe('verifyTurnstileToken', () => {
  it('is ok when Cloudflare says success, and sends secret, token and IP', async () => {
    const fetchImpl = reply({ success: true });
    expect(await verifyTurnstileToken({ token: 'tok', secret: 's', remoteIp: '1.2.3.4', fetchImpl })).toEqual({ ok: true });
    const body = String((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(body).toBe('secret=s&response=tok&remoteip=1.2.3.4');
  });

  it('reports a missing or non-string token without calling Cloudflare', async () => {
    const fetchImpl = reply({ success: true });
    expect(await verifyTurnstileToken({ token: undefined, secret: 's', fetchImpl })).toMatchObject({ reason: 'missing' });
    expect(await verifyTurnstileToken({ token: ['a'], secret: 's', fetchImpl })).toMatchObject({ reason: 'missing' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects an over-long token without calling Cloudflare', async () => {
    const fetchImpl = reply({ success: true });
    expect(await verifyTurnstileToken({ token: 'x'.repeat(2049), secret: 's', fetchImpl })).toMatchObject({ reason: 'invalid' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('is invalid when Cloudflare rejects the token', async () => {
    const out = await verifyTurnstileToken({ token: 't', secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['timeout-or-duplicate'] }) });
    expect(out).toEqual({ ok: false, reason: 'invalid', detail: 'timeout-or-duplicate' });
  });

  it('is unavailable on network errors, HTTP errors and our own bad secret', async () => {
    expect(await verifyTurnstileToken({ token: 't', secret: 's', fetchImpl: failing })).toMatchObject({ reason: 'unavailable' });
    expect(await verifyTurnstileToken({ token: 't', secret: 's', fetchImpl: reply({}, 503) })).toMatchObject({ reason: 'unavailable' });
    expect(
      await verifyTurnstileToken({ token: 't', secret: 's', fetchImpl: reply({ success: false, 'error-codes': ['invalid-input-secret'] }) })
    ).toMatchObject({ reason: 'unavailable' });
  });
});

describe('requireTurnstile middleware', () => {
  const OLD = process.env.TURNSTILE_SECRET_KEY;
  afterEach(() => {
    if (OLD === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = OLD;
  });

  const appWith = (fetchImpl: FetchLike) => {
    const app = express();
    app.post('/form', requireTurnstile({ fetchImpl }), (_req, res) => { res.json({ passed: true }); });
    return app;
  };

  it('is off when no secret is configured', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const res = await request(appWith(reply({ success: false }))).post('/form');
    expect(res.status).toBe(200);
  });

  it('403 captcha_required without a token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const res = await request(appWith(reply({ success: true }))).post('/form');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('captcha_required');
  });

  it('403 captcha_failed for a rejected token', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const res = await request(appWith(reply({ success: false, 'error-codes': ['invalid-input-response'] })))
      .post('/form')
      .set('X-Turnstile-Token', 'forged');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('captcha_failed');
  });

  it('passes a valid token through', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const res = await request(appWith(reply({ success: true }))).post('/form').set('X-Turnstile-Token', 'good');
    expect(res.body).toEqual({ passed: true });
  });

  it('lets the request through when Cloudflare is unreachable', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    const res = await request(appWith(failing)).post('/form').set('X-Turnstile-Token', 'good');
    expect(res.status).toBe(200);
  });
});
