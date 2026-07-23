import type { Request, Response } from 'express';

// Mock the Gemini service so no real API call is made.
jest.mock('../services/geminiService', () => ({
  restyleRoomImage: jest.fn(),
}));

// Mock the Mongoose models so no DB connection is required.
jest.mock('../models/User', () => ({ __esModule: true, default: { findById: jest.fn() } }));
jest.mock('../models/Product', () => ({ __esModule: true, default: { findOne: jest.fn() } }));

import * as geminiService from '../services/geminiService';
import User from '../models/User';
import Product from '../models/Product';
import { restyleRoom } from '../controllers/aiController';

const CLOUDINARY_URL = 'https://res.cloudinary.com/demo/image/upload/v1/room.jpg';

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
  const mockFindOne = (Product as any).findOne as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_AI_API_KEY = 'test-key';
    // Default: a successful image fetch.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (h: string) => (h === 'content-type' ? 'image/jpeg' : null) },
      arrayBuffer: async () => new ArrayBuffer(64),
    }) as any;
    mockGenerate.mockResolvedValue({ imageBase64: 'AAAA', mimeType: 'image/png' });
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

  it('returns 429 when the monthly limit is reached', async () => {
    // Free user (not subscribed) whose usage already equals the free limit.
    mockFindById.mockResolvedValue({
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 999, monthResetDate: new Date(Date.now() + 86_400_000) },
      save: jest.fn(),
    });
    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'scandinavian' }, { _id: 'u1' }), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns 200 with an imageDataUrl on success', async () => {
    const saveMock = jest.fn();
    mockFindById.mockResolvedValue({
      isSubscribed: false,
      subscriptionPlan: null,
      hasActiveSubscription: () => false,
      roomStyleUsage: { monthlyCount: 0, monthResetDate: new Date(Date.now() + 86_400_000) },
      save: saveMock,
    });
    mockFindOne.mockResolvedValue(null);

    const res = makeRes();
    await restyleRoom(makeReq({ imageUrl: CLOUDINARY_URL, style: 'scandinavian' }, { _id: 'u1' }), res);

    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'scandinavian',
        imageDataUrl: 'data:image/png;base64,AAAA',
      })
    );
    // Usage counter incremented + persisted once.
    expect(saveMock).toHaveBeenCalledTimes(1);
  });
});
