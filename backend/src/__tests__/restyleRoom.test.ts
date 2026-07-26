import type { Request, Response } from 'express';

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

const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg';
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

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: async () => new ArrayBuffer(64),
    }) as any;
    mockGenerate.mockResolvedValue({ imageBase64: 'AAAA', mimeType: 'image/png' });
    // Product lookups return a chainable .lean() by default (no override).
    mockProductFindOne.mockReturnValue({ lean: async () => null });
    mockFindByIdAndUpdate.mockResolvedValue({});
  });

  it('returns 400 when imageUrl is not a Cloudinary URL', async () => {
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: 'https://evil.example.com/x.jpg', style: 'scandinavian' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown style', async () => {
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'not-a-real-style' }), res);
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
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'scandinavian' }, { _id: 'u1' }), res);
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
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'scandinavian' }, { _id: 'u2' }), res);

    expect(res.status).not.toHaveBeenCalledWith(429);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    // Unlimited plan → usage counter is NOT incremented.
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
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
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'scandinavian' }, { _id: 'u3' }), res);

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
