import type { Types } from 'mongoose';
import User from '../../models/User';
import Property from '../../models/Property';
import type { IAgency } from '../../models/Agency';
import listingLimitService from '../listingLimitService';
import { FREE_TIER_LIMITS } from '../../config/subscriptionConstants';

/**
 * How many new listings a feed may publish for its assigned agent right now.
 *
 * Imports are charged exactly as listings created by hand in
 * `propertyController.createProperty`, so a feed can never publish more than
 * the agent's plan allows:
 *  - Pro / agency plans: a monthly creation allowance
 *    (`subscription.listingsLimit`, else the product's `listingsLimit`),
 *    counted in `subscription.listingsCreatedThisMonth` and reset monthly.
 *  - Everyone else (free tier): at most FREE_TIER_LIMITS.LISTINGS listings,
 *    counted in `subscription.activeListingsCount`.
 *  - An agency-wide override (`agency.subscription.listingsLimit`) further caps
 *    the agency's active + pending listings when set.
 * Updates and reactivations of already-imported listings are never charged,
 * matching edits of manual listings. Nothing is ever billed: listings beyond
 * the allowance are simply not published.
 */
export interface CreationAllowance {
  model: 'monthly' | 'free_tier' | 'none';
  plan: string;
  allowance: number;
  used: number;
  remaining: number;
}

type AllowanceUser = {
  _id: Types.ObjectId;
  role?: string;
  subscriptionPlan?: string;
  subscription?: {
    tier?: string;
    listingsLimit?: number;
    listingsCreatedThisMonth?: number;
    activeListingsCount?: number;
    monthResetDate?: Date;
  };
};

const isMonthlyPlan = (user: AllowanceUser): boolean => {
  const tier = user.subscription?.tier ?? 'free';
  return Boolean(user.subscriptionPlan && (tier === 'pro' || tier === 'agency_agent' || tier === 'agency_owner'));
};

const agencyCapRemaining = async (agency: Pick<IAgency, '_id' | 'subscription'>): Promise<number> => {
  const cap = agency.subscription?.listingsLimit;
  if (!cap || cap <= 0) return Number.POSITIVE_INFINITY;
  const live = await Property.countDocuments({ createdByAgencyId: agency._id, status: { $in: ['active', 'pending'] } });
  return Math.max(0, cap - live);
};

export const getCreationAllowance = async (
  userId: Types.ObjectId | string,
  agency: Pick<IAgency, '_id' | 'subscription'>
): Promise<CreationAllowance> => {
  const user = await User.findById(userId)
    .select('role subscriptionPlan subscription')
    .lean<AllowanceUser>();
  if (!user) return { model: 'none', plan: 'none', allowance: 0, used: 0, remaining: 0 };

  if (user.role === 'buyer' && (user.subscription?.listingsLimit ?? 0) === 0) {
    return { model: 'none', plan: 'buyer', allowance: 0, used: 0, remaining: 0 };
  }

  let result: CreationAllowance;
  if (isMonthlyPlan(user)) {
    let allowance = user.subscription?.listingsLimit ?? 0;
    if (!allowance) {
      try {
        allowance = await listingLimitService.getMonthlyAllowance(user.subscriptionPlan as string);
      } catch {
        allowance = 0;
      }
    }
    const used = listingLimitService.isMonthBoundaryPassed(user.subscription?.monthResetDate)
      ? 0
      : user.subscription?.listingsCreatedThisMonth ?? 0;
    result = {
      model: 'monthly',
      plan: user.subscriptionPlan as string,
      allowance,
      used,
      remaining: Math.max(0, allowance - used),
    };
  } else {
    const used = user.subscription?.activeListingsCount ?? 0;
    result = {
      model: 'free_tier',
      plan: user.subscription?.tier ?? 'free',
      allowance: FREE_TIER_LIMITS.LISTINGS,
      used,
      remaining: Math.max(0, FREE_TIER_LIMITS.LISTINGS - used),
    };
  }

  const cap = await agencyCapRemaining(agency);
  if (cap < result.remaining) result.remaining = cap;
  return result;
};

/**
 * Atomically take one creation slot, with the same conditional `$inc` the
 * manual create path uses so concurrent manual creations and imports can
 * never overshoot. Returns false when the allowance is exhausted.
 */
export const reserveListingSlot = async (userId: Types.ObjectId | string, model: CreationAllowance['model']): Promise<boolean> => {
  if (model === 'none') return false;
  const user = await User.findById(userId).select('role subscriptionPlan subscription').lean<AllowanceUser>();
  if (!user) return false;

  const inc: Record<string, number> = {
    'subscription.activeListingsCount': 1,
    'subscription.agentCount': 1,
    listingsCount: 1,
    totalListingsCreated: 1,
  };

  if (model === 'monthly') {
    let allowance = user.subscription?.listingsLimit ?? 0;
    if (!allowance) {
      try {
        allowance = await listingLimitService.getMonthlyAllowance(user.subscriptionPlan as string);
      } catch {
        return false;
      }
    }
    if (listingLimitService.isMonthBoundaryPassed(user.subscription?.monthResetDate)) {
      // Same reset the manual create path performs, guarded so two writers can't both reset.
      await User.updateOne(
        { _id: user._id, 'subscription.monthResetDate': user.subscription?.monthResetDate ?? null },
        { $set: { 'subscription.listingsCreatedThisMonth': 0, 'subscription.monthResetDate': new Date() } }
      );
    }
    inc['subscription.listingsCreatedThisMonth'] = 1;
    const updated = await User.findOneAndUpdate(
      { _id: user._id, 'subscription.listingsCreatedThisMonth': { $not: { $gte: allowance } } },
      { $inc: inc },
      { new: true }
    );
    return Boolean(updated);
  }

  const updated = await User.findOneAndUpdate(
    { _id: user._id, 'subscription.activeListingsCount': { $not: { $gte: FREE_TIER_LIMITS.LISTINGS } } },
    { $inc: inc },
    { new: true }
  );
  return Boolean(updated);
};

/** Undo `reserveListingSlot` when the listing could not be written after all. */
export const releaseListingSlot = async (userId: Types.ObjectId | string, model: CreationAllowance['model']): Promise<void> => {
  const dec: Record<string, number> = {
    'subscription.activeListingsCount': -1,
    'subscription.agentCount': -1,
    listingsCount: -1,
    totalListingsCreated: -1,
  };
  if (model === 'monthly') dec['subscription.listingsCreatedThisMonth'] = -1;
  await User.updateOne({ _id: userId }, { $inc: dec });
};
