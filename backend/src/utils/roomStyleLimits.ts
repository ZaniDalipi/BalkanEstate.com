import Product from '../models/Product';
import Subscription from '../models/Subscription';
import {
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  ENTERPRISE_TIER_LIMITS,
  PRO_BUYER_LIMITS,
} from '../config/subscriptionConstants';

/**
 * Single source of truth for the AI Room Styler monthly limit.
 *
 * IMPORTANT — why this is not just `user.isSubscribed`:
 * A user's premium access can come from several places, and `isSubscribed` /
 * `hasActiveSubscription()` (which check the top-level `subscriptionExpiresAt`)
 * DO NOT cover all of them. In particular, agency owners/agents get their plan
 * via the embedded `user.subscription` object (synced by `getMe`) and/or a
 * `Subscription` collection document — their `isSubscribed` flag is often false
 * and their expiry lives in `user.subscription.expiresAt`, not
 * `user.subscriptionExpiresAt`. Relying on `isSubscribed` alone made every
 * agency/enterprise user fall through to the free tier.
 *
 * This resolver mirrors the same cascade `getCurrentSubscription` uses so the
 * limit shown matches the user's real account status.
 */

/** Start of next month at midnight — used to reset the monthly usage counter. */
export const getNextMonthStart = (): Date => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Embedded subscription / Subscription-doc statuses that still grant access.
const ACTIVE_SUB_STATUSES = ['active', 'trial', 'grace', 'pending_cancellation'];

/** Map a plan/product id string to a room-style limit when the Product has none. */
const limitFromPlanString = (plan: string): number => {
  const p = plan.toLowerCase();
  if (p.includes('enterprise') || p.includes('agency')) return ENTERPRISE_TIER_LIMITS.ROOM_STYLES;
  if (p.includes('buyer')) return PRO_BUYER_LIMITS.ROOM_STYLES;
  if (p.includes('yearly')) return PRO_TIER_LIMITS.YEARLY.ROOM_STYLES;
  if (p.includes('monthly')) return PRO_TIER_LIMITS.MONTHLY.ROOM_STYLES;
  return FREE_TIER_LIMITS.ROOM_STYLES;
};

/** Map a normalized subscription tier to a room-style limit. */
const limitFromTier = (tier: string): number => {
  switch (tier) {
    case 'agency_owner':
    case 'agency_agent':
      return ENTERPRISE_TIER_LIMITS.ROOM_STYLES; // Unlimited AI usage for agency plans
    case 'pro':
      return PRO_TIER_LIMITS.MONTHLY.ROOM_STYLES;
    case 'buyer':
      return PRO_BUYER_LIMITS.ROOM_STYLES;
    default:
      return FREE_TIER_LIMITS.ROOM_STYLES;
  }
};

const resolveLimitFromProductId = async (productId: string): Promise<number> => {
  const product = await Product.findOne({ productId }).lean();
  const raw = product?.roomStyleLimit;
  if (typeof raw === 'number') return raw;
  return limitFromPlanString(productId);
};

/**
 * Resolve the effective monthly room-style limit for a user.
 * Returns -1 for unlimited, otherwise a positive integer.
 * Checks (in priority order): embedded subscription tier → isSubscribed+plan →
 * active Subscription document → legacy proSubscription → free tier.
 */
export const resolveRoomStyleLimit = async (user: any): Promise<number> => {
  const now = new Date();

  // 1. Embedded, getMe-synced subscription (covers agency owners/agents, pro, buyer).
  const sub = user?.subscription;
  const embeddedActive =
    sub &&
    ACTIVE_SUB_STATUSES.includes(sub.status) &&
    (!sub.expiresAt || new Date(sub.expiresAt) > now);
  if (embeddedActive && sub.tier && sub.tier !== 'free') {
    return limitFromTier(sub.tier);
  }

  // 2. Direct paid subscription flag + plan (web/stripe/paddle subscribers).
  const flagActive =
    user?.isSubscribed &&
    ((typeof user.hasActiveSubscription === 'function' && user.hasActiveSubscription()) ||
      (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now));
  if (flagActive && user.subscriptionPlan) {
    return resolveLimitFromProductId(user.subscriptionPlan);
  }

  // 3. Active Subscription collection document (coupon/agency docs, store-based subs).
  try {
    const subscriptionDoc = await Subscription.findOne({
      userId: { $in: [user._id, String(user._id)] },
      status: { $in: ['active', 'trial', 'grace'] },
      expirationDate: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (subscriptionDoc?.productId) {
      return resolveLimitFromProductId(subscriptionDoc.productId);
    }
  } catch {
    // Non-fatal: fall through to remaining checks.
  }

  // 4. Legacy proSubscription.
  const pro = user?.proSubscription;
  if (pro?.isActive && pro.expiresAt && new Date(pro.expiresAt) > now) {
    return PRO_TIER_LIMITS.MONTHLY.ROOM_STYLES;
  }

  // 5. Free tier.
  return FREE_TIER_LIMITS.ROOM_STYLES;
};

export interface RoomStyleUsageStats {
  used: number;
  limit: number;
  remaining: number; // -1 when unlimited
  resetDate: Date;
  isPremium: boolean;
}

/**
 * Read a user's room-style usage, lazily resetting the monthly counter if the
 * reset date has passed. Persists the reset. Returns the usage + resolved limit.
 */
export const getRoomStyleUsageStats = async (user: any): Promise<RoomStyleUsageStats> => {
  const now = new Date();
  if (!user.roomStyleUsage) {
    user.roomStyleUsage = { monthlyCount: 0, monthResetDate: getNextMonthStart() };
    await user.save();
  } else if (now >= new Date(user.roomStyleUsage.monthResetDate)) {
    user.roomStyleUsage.monthlyCount = 0;
    user.roomStyleUsage.monthResetDate = getNextMonthStart();
    await user.save();
  }

  const limit = await resolveRoomStyleLimit(user);
  const used = user.roomStyleUsage.monthlyCount;
  return {
    used,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - used),
    resetDate: user.roomStyleUsage.monthResetDate,
    isPremium: limit === -1 || limit > FREE_TIER_LIMITS.ROOM_STYLES,
  };
};
