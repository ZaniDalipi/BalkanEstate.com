/**
 * Every public form endpoint must refuse a request without a Turnstile token
 * once TURNSTILE_SECRET_KEY is set, before its controller runs.
 */
import express from 'express';
import request from 'supertest';

/* eslint-disable @typescript-eslint/no-var-requires */
const app = express();
app.use(express.json());
app.use('/api/auth', require('../../routes/authRoutes').default);
app.use('/api/inquiries', require('../../routes/inquiryRoutes').default);
app.use('/api/developments', require('../../routes/developmentRoutes').default);
app.use('/api/viewings', require('../../routes/viewingRoutes').default);
app.use('/api/agent-requests', require('../../routes/agentRequestRoutes').default);
app.use('/api/valuations', require('../../routes/propertyValuationRoutes').default);
app.use('/api/open-houses', require('../../routes/openHouseRoutes').default);
/* eslint-enable @typescript-eslint/no-var-requires */

const PROTECTED = [
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/resend-verification',
  '/api/inquiries/property',
  '/api/inquiries/agent',
  '/api/inquiries/area-search',
  '/api/inquiries/contact',
  '/api/developments/some-residence/units/abc/inquiries',
  '/api/viewings',
  '/api/agent-requests',
  '/api/valuations',
  '/api/open-houses/abc/rsvp',
];

describe('Turnstile on public form routes', () => {
  const OLD = process.env.TURNSTILE_SECRET_KEY;
  beforeAll(() => { process.env.TURNSTILE_SECRET_KEY = 'secret'; });
  afterAll(() => {
    if (OLD === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = OLD;
  });

  it.each(PROTECTED)('%s refuses a request without a token', async (path) => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const res = await request(app).post(path).send({ email: 'a@example.com' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('captcha_required');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does not put a captcha on login', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.body.code).not.toBe('captcha_required');
  });
});
