/**
 * Listing-limit discount game rewards.
 *
 * Users without a listing subscription win a single-use discount code;
 * subscribers win bonus listing credits (one per hit). The score is
 * client-reported, so the caps and the once-a-day cooldown are what keep it
 * honest.
 */

import { Request, Response } from 'express';
import User from '../models/User';
import DiscountCode from '../models/DiscountCode';
import {
  claimGameReward,
  getGameRewardStatus,
  GAME_MAX_HITS,
  GAME_CODE_PLANS,
  discountForHits,
  MAX_GAME_DISCOUNT,
} from '../controllers/gameRewardController';
import listingLimitService from '../services/listingLimitService';
import { createMockUser } from './setup';

const makeRes = () => {
  const res: any = {};
  res.statusCode = 200;
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; });
  res.json = jest.fn((body: unknown) => { res.body = body; return res; });
  return res as Response & { statusCode: number; body: any };
};

const claim = async (user: any, score: number, totalMoles = 14) => {
  const res = makeRes();
  await claimGameReward({ user, body: { score, totalMoles } } as unknown as Request, res);
  return res;
};

const freeUser = () => User.create(createMockUser({ role: 'private_seller' }));

const proUser = () => User.create(createMockUser({
  role: 'private_seller',
  subscriptionPlan: 'seller_pro_monthly',
  subscription: {
    tier: 'pro',
    status: 'active',
    listingsLimit: 20,
    listingsCreatedThisMonth: 20,
    monthResetDate: new Date(),
  },
}));

describe('discountForHits', () => {
  it('gives 5% per hit and caps at the maximum', () => {
    expect(discountForHits(1)).toBe(5);
    expect(discountForHits(7)).toBe(35);
    expect(discountForHits(10)).toBe(MAX_GAME_DISCOUNT);
    expect(discountForHits(15)).toBe(MAX_GAME_DISCOUNT);
  });
});

describe('POST /api/game-rewards/claim', () => {
  it('gives a user without a subscription a single-use code for the seller plans', async () => {
    const user = await freeUser();

    const res = await claim(user, 6);

    expect(res.statusCode).toBe(201);
    expect(res.body.reward).toMatchObject({ type: 'discount', discountPercent: 30, hits: 6 });
    const code = await DiscountCode.findOne({ code: res.body.reward.code });
    expect(code).not.toBeNull();
    expect(code!.usageLimit).toBe(1);
    expect(code!.source).toBe('gamification');
    expect(code!.applicablePlans).toEqual(GAME_CODE_PLANS);
    expect(code!.isValid(String(user._id), 'seller_pro_yearly', 200).valid).toBe(true);
    expect(code!.isValid(String(user._id), 'buyer_monthly', 5).valid).toBe(false);
  });

  it('raises a subscriber\'s stored listing limit by one per hit', async () => {
    const user = await proUser();
    expect(await listingLimitService.canCreateListing(String(user._id))).toBe(false);

    const res = await claim(user, 10);

    expect(res.statusCode).toBe(200);
    expect(res.body.reward).toMatchObject({ type: 'listings', addedListings: 10, listingsLimit: 30 });
    expect(await DiscountCode.countDocuments()).toBe(0);
    const updated = await User.findById(user._id);
    expect(updated!.subscription.listingsLimit).toBe(30);
    // Written like an admin override so the /auth/me product sync keeps it
    expect(updated!.activeListingsLimit).toBe(30);
    expect(await listingLimitService.canCreateListing(String(user._id))).toBe(true);
  });

  it('caps hits at what one round can produce', async () => {
    const user = await proUser();
    const res = await claim(user, 500, 500);
    expect(res.body.reward.addedListings).toBe(GAME_MAX_HITS);
  });

  it('never counts more hits than icons shown', async () => {
    const user = await proUser();
    const res = await claim(user, 12, 3);
    expect(res.body.reward.addedListings).toBe(3);
  });

  it('rejects malformed results', async () => {
    const user = await freeUser();
    expect((await claim(user, -1)).statusCode).toBe(400);
    expect((await claim(user, 2.5)).statusCode).toBe(400);
  });

  it('awards nothing for zero hits and lets the user play again', async () => {
    const user = await freeUser();
    const miss = await claim(user, 0);
    expect(miss.body.reward).toEqual({ type: 'none', hits: 0 });

    const retry = await claim(user, 4);
    expect(retry.statusCode).toBe(201);
  });

  it('only rewards a subscriber once per week', async () => {
    const user = await proUser();
    await claim(user, 5);
    const second = await claim(user, 5);

    expect(second.statusCode).toBe(429);
    expect(second.body.code).toBe('GAME_REWARD_COOLDOWN');
    expect((await User.findById(user._id))!.subscription.listingsLimit).toBe(25);
  });

  it('hands back the unused code instead of minting a second one', async () => {
    const user = await freeUser();
    const first = await claim(user, 3);
    const second = await claim(user, 10);

    expect(second.statusCode).toBe(200);
    expect(second.body.reward).toMatchObject({ code: first.body.reward.code, discountPercent: 15, alreadyClaimed: true });
    expect(await DiscountCode.countDocuments()).toBe(1);
  });

  it('allows a new reward once the cooldown has passed', async () => {
    const user = await proUser();
    await claim(user, 2);
    await User.updateOne({ _id: user._id }, { gameRewardClaimedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) });

    const res = await claim(user, 3);
    expect(res.body.reward.listingsLimit).toBe(25);
  });
});

describe('GET /api/game-rewards/status', () => {
  const status = async (user: any) => {
    const res = makeRes();
    await getGameRewardStatus({ user } as unknown as Request, res);
    return res.body;
  };

  it('lets a new player play', async () => {
    const user = await freeUser();
    expect(await status(user)).toMatchObject({ isSubscriber: false, canPlay: true, nextAvailableAt: null, activeCode: null });
  });

  it('returns the unused code while the cooldown runs', async () => {
    const user = await freeUser();
    const won = await claim(user, 4);
    const body = await status(user);
    expect(body.canPlay).toBe(false);
    expect(body.activeCode).toMatchObject({ code: won.body.reward.code, discountPercent: 20 });
  });

  it('tells a subscriber when they can play again', async () => {
    const user = await proUser();
    await claim(user, 4);
    const body = await status(user);
    expect(body).toMatchObject({ isSubscriber: true, canPlay: false, activeCode: null });
    expect(new Date(body.nextAvailableAt).getTime()).toBeGreaterThan(Date.now());
  });
});
