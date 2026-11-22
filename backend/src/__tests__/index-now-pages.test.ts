/**
 * IndexNow for agency, agent and residence pages: which URLs they announce,
 * and which routes announce them (and which do not).
 */
process.env.SKIP_TEST_DB = 'true';

import { EventEmitter } from 'events';
import express from 'express';
import request from 'supertest';
import { agencyPagePath, agentPagePath, developmentPagePath, pageUrls } from '../services/indexNow/indexNowUrls';

const notifyAgencyChanged = jest.fn();
const notifyAgentChanged = jest.fn();
const notifyDevelopmentChanged = jest.fn();
jest.mock('../services/indexNow/indexNowPages', () => ({
  notifyAgencyChanged: (...args: unknown[]) => notifyAgencyChanged(...args),
  notifyAgentChanged: (...args: unknown[]) => notifyAgentChanged(...args),
  notifyDevelopmentChanged: (...args: unknown[]) => notifyDevelopmentChanged(...args),
}));
import { indexNowAgency, indexNowAgent, indexNowDevelopmentParam } from '../middleware/indexNowOnSuccess';

const SITE = 'https://balkanestateai.com';

describe('IndexNow page URLs', () => {
  it('puts a page in every language', () => {
    const urls = pageUrls('/agents/AG-1', SITE);
    expect(urls).toHaveLength(10);
    expect(urls).toContain(`${SITE}/en/agents/AG-1`);
    expect(urls).toContain(`${SITE}/sq/agents/AG-1`);
  });

  it('builds the same paths the site and sitemap use', () => {
    expect(agencyPagePath('albania/erikson real estate')).toBe('/agencies/albania/erikson%20real%20estate');
    expect(agencyPagePath('/kosovo//prime/')).toBe('/agencies/kosovo/prime');
    expect(agentPagePath('ERIKSON-REAL-ESTATE')).toBe('/agents/ERIKSON-REAL-ESTATE');
    expect(developmentPagePath('plaza tirana')).toBe('/developments/plaza%20tirana');
  });
});

describe('IndexNow page middleware', () => {
  type Req = { params: Record<string, string>; method?: string; path?: string; user?: { _id: string } };
  const response = (status: number) =>
    Object.assign(new EventEmitter(), { statusCode: status, json: jest.fn(function (this: unknown) { return this; }) });
  const env = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    notifyAgencyChanged.mockReset();
    notifyAgentChanged.mockReset();
    notifyDevelopmentChanged.mockReset();
  });
  afterEach(() => { process.env.NODE_ENV = env; });

  const run = (handler: ReturnType<typeof indexNowAgency>, req: Req, status: number, body?: unknown) => {
    const res = response(status);
    const next = jest.fn();
    handler(req as never, res as never, next);
    if (body !== undefined) (res.json as unknown as (b: unknown) => unknown)(body);
    res.emit('finish');
    return next;
  };

  it('announces an edited agency, and a new one with its owner\'s agent page', () => {
    expect(run(indexNowAgency(), { params: { id: 'a1' } }, 200)).toHaveBeenCalled();
    expect(notifyAgencyChanged).toHaveBeenCalledWith('a1');
    expect(notifyAgentChanged).not.toHaveBeenCalled();

    notifyAgencyChanged.mockReset();
    run(indexNowAgency(), { params: {}, user: { _id: 'u1' } }, 201, { agency: { _id: 'new' } });
    expect(notifyAgencyChanged).toHaveBeenCalledWith('new');
    expect(notifyAgentChanged).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('announces the agent in the route, or the signed-in agent', () => {
    run(indexNowAgent(), { params: { id: 'AG-1' } }, 201);
    run(indexNowAgent(), { params: {}, user: { _id: 'u1' } }, 200);
    expect(notifyAgentChanged.mock.calls).toEqual([[{ key: 'AG-1' }], [{ userId: 'u1' }]]);
  });

  it('announces nothing after a failed write, or outside production', () => {
    run(indexNowAgency(), { params: { id: 'a1' } }, 403);
    process.env.NODE_ENV = 'test';
    run(indexNowAgent(), { params: { id: 'AG-1' } }, 200);
    expect(notifyAgencyChanged).not.toHaveBeenCalled();
    expect(notifyAgentChanged).not.toHaveBeenCalled();
  });

  describe('residence dashboard', () => {
    const write = (method: string, path: string, status = 200) => {
      const res = response(status);
      const next = jest.fn();
      indexNowDevelopmentParam({ method, path, params: {} } as never, res as never, next, 'd1');
      res.emit('finish');
      expect(next).toHaveBeenCalled();
    };

    it('announces a write that changes the public page', () => {
      write('PATCH', '/d1');
      write('POST', '/d1/units');
      write('DELETE', '/d1');
      expect(notifyDevelopmentChanged.mock.calls).toEqual([['d1'], ['d1'], ['d1']]);
    });

    it('fires through a real router, for the residence in the URL', async () => {
      const router = express.Router();
      router.param('developmentId', indexNowDevelopmentParam);
      router.get('/:developmentId', (_req, res) => { res.json({}); });
      router.patch('/:developmentId', (_req, res) => { res.json({}); });
      router.patch('/:developmentId/scenes/:sceneId/draft', (_req, res) => { res.json({}); });
      const app = express().use('/api/development-dashboard', router);
      await request(app).get('/api/development-dashboard/d7');
      await request(app).patch('/api/development-dashboard/d7/scenes/s1/draft');
      await request(app).patch('/api/development-dashboard/d7');
      expect(notifyDevelopmentChanged.mock.calls).toEqual([['d7']]);
    });

    it('leaves reads, private writes and failures alone', () => {
      write('GET', '/d1/units');
      write('POST', '/d1/units/u1/listings/preview');
      write('PATCH', '/d1/scenes/s1/draft');
      write('POST', '/d1/billing/checkout');
      write('PATCH', '/d1', 400);
      expect(notifyDevelopmentChanged).not.toHaveBeenCalled();
    });
  });
});
