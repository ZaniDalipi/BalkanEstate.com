/**
 * Saved neighborhood insights — a generated insight is kept forever for the
 * user who generated it (per listing), is never visible to other users, and is
 * re-served without calling the AI or spending monthly quota.
 */

import request from 'supertest';
import express from 'express';
import User from '../models/User';
import SavedNeighborhoodInsight from '../models/SavedNeighborhoodInsight';
import { getNeighborhoodInsights as generateInsights } from '../services/geminiService';
import { getAuthToken } from './setup';

jest.mock('../services/geminiService', () => ({
  ...jest.requireActual('../services/geminiService'),
  getNeighborhoodInsights: jest.fn(),
}));

const mockedGenerate = generateInsights as jest.MockedFunction<typeof generateInsights>;

const body = (listingId?: string) => ({
  lat: 41.33,
  lng: 19.82,
  address: 'Rruga e Kavajes 1',
  city: 'Tirana',
  country: 'Albania',
  ...(listingId ? { listingId } : {}),
});

describe('Saved neighborhood insights API', () => {
  const OLD_KEY = process.env.GOOGLE_AI_API_KEY;

  beforeAll(() => {
    process.env.GOOGLE_AI_API_KEY = 'test-key';
  });
  afterAll(() => {
    process.env.GOOGLE_AI_API_KEY = OLD_KEY;
  });
  beforeEach(() => {
    mockedGenerate.mockReset();
    mockedGenerate.mockResolvedValue('## Schools\nGreat ones nearby');
  });

  const createTestApp = () => {
    const app = express();
    app.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app.use('/api/auth', require('../routes/authRoutes').default);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    app.use('/api/neighborhood-insights', require('../routes/neighborhoodInsightsRoutes').default);
    return app;
  };

  const post = (app: express.Express, token: string, payload: object) =>
    request(app)
      .post('/api/neighborhood-insights')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  it('saves the insight for the generating user and re-serves it without AI or quota', async () => {
    const app = createTestApp();
    const { accessToken, user } = await getAuthToken(app);

    const first = await post(app, accessToken, body('listing1'));
    expect(first.status).toBe(200);
    expect(first.body.insights).toContain('Schools');
    expect(mockedGenerate).toHaveBeenCalledTimes(1);

    const second = await post(app, accessToken, body('listing1'));
    expect(second.status).toBe(200);
    expect(second.body.saved).toBe(true);
    expect(second.body.insights).toBe(first.body.insights);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);

    const dbUser = await User.findById(user.id ?? user._id);
    expect(dbUser?.neighborhoodInsights?.monthlyCount).toBe(1);
    expect(await SavedNeighborhoodInsight.countDocuments({ listingId: 'listing1' })).toBe(1);
  });

  it('never shows or serves one user’s insight to another user', async () => {
    const app = createTestApp();
    const a = await getAuthToken(app);
    const b = await getAuthToken(app);

    await post(app, a.accessToken, body('listing1'));

    const asB = await request(app)
      .get('/api/neighborhood-insights/saved/listing1')
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(asB.status).toBe(200);
    expect(asB.body.insights).toBeNull();

    const asA = await request(app)
      .get('/api/neighborhood-insights/saved/listing1')
      .set('Authorization', `Bearer ${a.accessToken}`);
    expect(asA.body.insights).toContain('Schools');

    // B asking for the same listing generates their own, rather than receiving A's.
    mockedGenerate.mockResolvedValue("B's own report");
    const bGenerated = await post(app, b.accessToken, body('listing1'));
    expect(bGenerated.body.insights).toBe("B's own report");
    expect(await SavedNeighborhoodInsight.countDocuments({ listingId: 'listing1' })).toBe(2);
  });

  it('keeps insights separate per listing and requires authentication', async () => {
    const app = createTestApp();
    const { accessToken } = await getAuthToken(app);
    await post(app, accessToken, body('listing1'));

    const other = await request(app)
      .get('/api/neighborhood-insights/saved/listing2')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(other.body.insights).toBeNull();

    expect((await request(app).get('/api/neighborhood-insights/saved/listing1')).status).toBe(401);
  });

  it('rejects an invalid listing id', async () => {
    const app = createTestApp();
    const { accessToken } = await getAuthToken(app);
    const res = await post(app, accessToken, body('bad/id'));
    expect(res.status).toBe(400);
    expect(mockedGenerate).not.toHaveBeenCalled();
  });
});
