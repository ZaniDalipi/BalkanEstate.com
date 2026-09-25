import { Request, Response } from 'express';
import DiscountCode from '../models/DiscountCode';
import User, { IUser } from '../models/User';
import { generateSecureRandomString } from '../utils/secureRandom';
import { apiLogger } from '../utils/logger';

/**
 * Listing-limit discount game ("Whack-an-Icon") rewards.
 *
 * The score is reported by the client, so everything here is bounded:
 * - hits are capped at what a 20s round can physically produce,
 * - one reward per user per cooldown window,
 * - discount codes are single-use, short-lived and limited to seller plans.
 *
 * Reward depends on whether the user already pays for listings:
 * - no subscription  -> a discount code for the seller plans (DISCOUNT_PER_HIT % per hit)
 * - has subscription -> LISTINGS_PER_HIT bonus listing credits per hit
 */

// A round lasts 20s with a new icon every 1.5s, so ~14 icons appear.
export const GAME_MAX_HITS = 16;
export const DISCOUNT_PER_HIT = 5; // % per hit
export const MAX_GAME_DISCOUNT = 50; // %
export const LISTINGS_PER_HIT = 1;
export const GAME_REWARD_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const GAME_CODE_VALIDITY_MS = 48 * 60 * 60 * 1000;
export const GAME_CODE_PLANS = ['seller_pro_monthly', 'seller_pro_yearly', 'seller_enterprise_yearly'];

const PAID_LISTING_TIERS = ['pro', 'agency_agent', 'agency_owner'];

export const discountForHits = (hits: number): number =>
  Math.min(MAX_GAME_DISCOUNT, hits * DISCOUNT_PER_HIT);

/** Same rule propertyController uses to pick the monthly (paid) listing model. */
const hasListingSubscription = (user: IUser): boolean =>
  !!(user.subscriptionPlan && PAID_LISTING_TIERS.includes(user.subscription?.tier || 'free'));

const serializeCode = (code: InstanceType<typeof DiscountCode>) => ({
  type: 'discount' as const,
  code: code.code,
  discountPercent: code.discountValue,
  validUntil: code.validUntil,
  applicablePlans: code.applicablePlans || [],
});

// @desc    Claim the reward for a finished discount game
// @route   POST /api/game-rewards/claim
// @access  Private
export const claimGameReward = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentUser = req.user as IUser | undefined;
    if (!currentUser) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const rawScore = Number(req.body?.score);
    const rawTotal = Number(req.body?.totalMoles);
    if (!Number.isInteger(rawScore) || rawScore < 0 || !Number.isInteger(rawTotal) || rawTotal < 0) {
      res.status(400).json({ message: 'Invalid game result' });
      return;
    }
    const hits = Math.min(rawScore, rawTotal, GAME_MAX_HITS);

    const user = await User.findById(currentUser._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isSubscriber = hasListingSubscription(user);

    if (hits === 0) {
      // Nothing won, and nothing consumed: the user may try again.
      res.json({ reward: { type: 'none', hits: 0 }, isSubscriber });
      return;
    }

    // Atomically take the cooldown slot so parallel requests can't claim twice.
    const now = new Date();
    const cutoff = new Date(now.getTime() - GAME_REWARD_COOLDOWN_MS);
    const cooldownFilter = {
      _id: user._id,
      $or: [
        { gameRewardClaimedAt: { $exists: false } },
        { gameRewardClaimedAt: null },
        { gameRewardClaimedAt: { $lte: cutoff } },
      ],
    };

    if (isSubscriber) {
      const bonus = hits * LISTINGS_PER_HIT;
      const updated = await User.findOneAndUpdate(
        cooldownFilter,
        {
          $set: { gameRewardClaimedAt: now },
          $inc: { 'subscription.bonusListings': bonus },
        },
        { new: true }
      );

      if (!updated) {
        await respondOnCooldown(res, user, isSubscriber);
        return;
      }

      res.json({
        reward: {
          type: 'listings',
          hits,
          bonusListings: bonus,
          totalBonusListings: updated.subscription?.bonusListings || bonus,
        },
        isSubscriber,
      });
      return;
    }

    const claimed = await User.findOneAndUpdate(cooldownFilter, { $set: { gameRewardClaimedAt: now } });
    if (!claimed) {
      await respondOnCooldown(res, user, isSubscriber);
      return;
    }

    const discountPercent = discountForHits(hits);
    try {
      const discountCode = await DiscountCode.create({
        code: `GAME${discountPercent}-${generateSecureRandomString(8)}`,
        discountType: 'percentage',
        discountValue: discountPercent,
        validFrom: now,
        validUntil: new Date(now.getTime() + GAME_CODE_VALIDITY_MS),
        usageLimit: 1,
        applicablePlans: GAME_CODE_PLANS,
        description: `Discount game reward: ${discountPercent}% (${hits} hits)`,
        source: 'gamification',
        createdBy: user._id,
        isActive: true,
      });

      res.status(201).json({ reward: { ...serializeCode(discountCode), hits }, isSubscriber });
    } catch (error) {
      // Give the cooldown back so the user isn't locked out without a reward.
      await User.updateOne({ _id: user._id }, { $set: { gameRewardClaimedAt: claimed.gameRewardClaimedAt ?? null } });
      throw error;
    }
  } catch (error: any) {
    apiLogger.error('Claim game reward error:', error);
    res.status(500).json({ message: 'Error claiming game reward' });
  }
};

/**
 * The user already claimed within the cooldown window. If that claim was a
 * discount code that is still usable, hand it back instead of an error so a
 * replay never "loses" the code.
 */
async function respondOnCooldown(res: Response, user: IUser, isSubscriber: boolean): Promise<void> {
  if (!isSubscriber) {
    const existing = await DiscountCode.findOne({
      createdBy: user._id,
      source: 'gamification',
      isActive: true,
      validUntil: { $gt: new Date() },
      $expr: { $lt: ['$usedCount', '$usageLimit'] },
    }).sort({ createdAt: -1 });

    if (existing) {
      res.json({ reward: { ...serializeCode(existing), alreadyClaimed: true }, isSubscriber });
      return;
    }
  }

  const fresh = await User.findById(user._id).select('gameRewardClaimedAt').lean();
  const lastClaim = fresh?.gameRewardClaimedAt ? new Date(fresh.gameRewardClaimedAt).getTime() : Date.now();
  res.status(429).json({
    message: 'You have already claimed a game reward today. Try again later.',
    code: 'GAME_REWARD_COOLDOWN',
    nextAvailableAt: new Date(lastClaim + GAME_REWARD_COOLDOWN_MS),
    isSubscriber,
  });
}
