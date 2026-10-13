// Every model is mocked below — no database needed (see `usesDatabase` in setup.ts).
process.env.SKIP_TEST_DB = 'true';
process.env.R2_PUBLIC_URL = 'https://media.example.com';

import type { Request, Response } from 'express';
import sharp from 'sharp';

// Mock the Gemini service so no real API call is made.
jest.mock('../services/geminiService', () => ({
  restyleRoomImage: jest.fn(),
}));

// Mock the Mongoose models so no DB connection is required.
jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}));
jest.mock('../models/Product', () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock('../models/Subscription', () => ({
  __esModule: true,
  default: { findOne: jest.fn(() => ({ sort: () => ({ lean: () => Promise.resolve(null) }) })) },
}));

import * as geminiService from '../services/geminiService';
import User from '../models/User';
import Product from '../models/Product';
import { restyleRoom, getRoomStyleUsage } from '../controllers/aiController';

const PHOTO_URL = 'https://media.example.com/users/u_1/listings/flat_2/photos/p1/original.jpg';
const FUTURE = new Date(Date.now() + 86_400_000);

const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res as Response;
};

const makeReq = (body: any, user?: any): Request =>
  ({ body, user } as unknown as Request);

describe('restyleRoom controller', () => {
  const mockGenerate = geminiService.restyleRoomImage as jest.Mock;
  const mockFindById = (User as any).findById as jest.Mock;
  const mockFindByIdAndUpdate = (User as any).findByIdAndUpdate as jest.Mock;
  const mockProductFindOne = (Product as any).findOne as jest.Mock;

  // A real (tiny) JPEG — the controller decodes and resizes the source.
  let jpeg: Buffer;
  beforeAll(async () => {
    jpeg = await sharp({ create: { width: 8, height: 6, channels: 3, background: '#ffffff' } }).jpeg().toBuffer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: async () => jpeg.buffer.slice(jpeg.byteOffset, jpeg.byteOffset + jpeg.byteLength),
    }) as any;
    mockGenerate.mockResolvedValue({ imageBase64: 'AAAA', mimeType: 'image/png' });
    // Product lookups return a chainable .lean() by default (no override).
    mockProductFindOne.mockReturnValue({ lean: async () => null });
    mockFindByIdAndUpdate.mockResolvedValue({});
  });

  it('accepts a listing photo still kept on Cloudinary, fetching its untransformed original', async () => {
    mockFindById.mockResolvedValue(null);
    const res = makeRes();
    await restyleRoom(
      makeReq({ imageUrl: 'https://res.cloudinary.com/demo/image/upload/t_be_w1080/v17/balkan-estate/listings/p1.jpg', style: 'scandinavian' }),
      res
    );
    expect(global.fetch).toHaveBeenCalledWith('https://res.cloudinary.com/demo/image/upload/balkan-estate/listings/p1.jpg', expect.anything());
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('accepts a photo in an R2 bucket on its public r2.dev address, fetching the master', async () => {
    mockFindById.mockResolvedValue(null);
    const res = makeRes();
    const R2 = 'https://pub-85ad6e6f9bd346a89e1a2f78704b85b0.r2.dev/users/u/listings/l/photos/p1';
    await restyleRoom(makeReq({ imageUrl: `${R2}/w640.webp`, style: 'scandinavian' }), res);
    expect(global.fetch).toHaveBeenCalledWith(`${R2}/original.jpg`, expect.anything());
    expect(mockGenerate).toHaveBeenCalled();
  });

  it('refuses our folder layout on any host that is not R2', async () => {
    for (const imageUrl of [
      'https://evil.example.com/users/u/listings/l/photos/p1/original.jpg',
      'https://pub-x.r2.dev.evil.example.com/users/u/listings/l/photos/p1/original.jpg',
      'http://pub-x.r2.dev/users/u/listings/l/photos/p1/original.jpg',
      'https://pub-x.r2.dev:8443/users/u/listings/l/photos/p1/original.jpg',
      'https://pub-x.r2.dev/users/../../etc/photos/p1/original.jpg',
    ]) {
      const res = makeRes();
      await restyleRoom(makeReq({ imageUrl, style: 'scandinavian' }), res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 400 when imageUrl is not one of our photos', async () => {
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: 'https://evil.example.com/x.jpg', style: 'scandinavian' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('fetches the full-size master, not the smaller size the browser shows', async () => {
    mockFindById.mockResolvedValue(null);
    const res = makeRes();
    await restyleRoom(
      makeReq({ imageUrl: PHOTO_URL.replace('original.jpg', 'w640.webp'), style: 'scandinavian' }),
      res
    );
    expect(global.fetch).toHaveBeenCalledWith(PHOTO_URL, expect.anything());
    expect(mockGenerate).toHaveBeenCalledWith(expect.any(String), 'image/jpeg', expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it('returns 400 when the source is not a decodable image', async () => {
    mockFindById.mockResolvedValue(null);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new ArrayBuffer(64),
    });
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'scandinavian' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown style', async () => {
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'not-a-real-style' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 429 when a FREE user has reached the monthly limit', async () => {
    mockFindById.mockResolvedValue({
      _id: 'u1',
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 999, monthResetDate: FUTURE },
      save: jest.fn(),
    });
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'scandinavian' }, { _id: 'u1' }), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('does NOT 429 an agency agent even without isSubscribed (regression)', async () => {
    // Agency agent: premium via embedded subscription, isSubscribed=false, high usage.
    mockFindById.mockResolvedValue({
      _id: 'u2',
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      subscription: { tier: 'agency_agent', status: 'active', expiresAt: FUTURE },
      roomStyleUsage: { monthlyCount: 500, monthResetDate: FUTURE },
      save: jest.fn(),
    });
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'scandinavian' }, { _id: 'u2' }), res);

    expect(res.status).not.toHaveBeenCalledWith(429);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    // Unlimited plan → usage counter is NOT incremented.
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('accepts an exterior style (ext-modern) and generates', async () => {
    mockFindById.mockResolvedValue({
      _id: 'u6',
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 0, monthResetDate: FUTURE },
      save: jest.fn(),
    });
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'ext-modern' }, { _id: 'u6' }), res);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    // Service is called with category 'exterior' for ext- styles.
    expect(mockGenerate).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'ext-modern', expect.anything(), expect.anything(), 'exterior'
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ style: 'ext-modern' }));
  });

  it('returns 200 and atomically increments usage for a FREE user', async () => {
    mockFindById.mockResolvedValue({
      _id: 'u3',
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 0, monthResetDate: FUTURE },
      save: jest.fn(),
    });

    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: PHOTO_URL, style: 'scandinavian' }, { _id: 'u3' }), res);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ style: 'scandinavian', imageDataUrl: 'data:image/png;base64,AAAA' })
    );
    // Atomic increment on success.
    expect(mockFindByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'u3',
      { $inc: { 'roomStyleUsage.monthlyCount': 1 } }
    );
  });
});

describe('getRoomStyleUsage controller', () => {
  const mockFindById = (User as any).findById as jest.Mock;
  const mockProductFindOne = (Product as any).findOne as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProductFindOne.mockReturnValue({ lean: async () => null });
  });

  it('returns usage stats for a free user (limit 3)', async () => {
    mockFindById.mockResolvedValue({
      _id: 'u4',
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 1, monthResetDate: FUTURE },
      save: jest.fn(),
    });
    const res = makeRes();
    await getRoomStyleUsage(makeReq({}, { _id: 'u4' }), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ used: 1, limit: 3, remaining: 2 })
    );
  });

  it('reports unlimited for an agency agent', async () => {
    mockFindById.mockResolvedValue({
      _id: 'u5',
      isSubscribed: false,
      hasActiveSubscription: () => false,
      subscription: { tier: 'agency_agent', status: 'active', expiresAt: FUTURE },
      roomStyleUsage: { monthlyCount: 4, monthResetDate: FUTURE },
      save: jest.fn(),
    });
    const res = makeRes();
    await getRoomStyleUsage(makeReq({}, { _id: 'u5' }), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ limit: -1, remaining: -1, isPremium: true })
    );
  });
});
