/**
 * Monthly quota for neighborhood insights.
 *
 * One place decides a user's limit and rolls their monthly window, so the
 * "generate" and "usage" endpoints can never disagree.
 */

import Product from '../models/Product';
import type { IUser } from '../models/User';
import {
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  ENTERPRISE_TIER_LIMITS,
  PRO_BUYER_LIMITS,
} from '../config/subscriptionConstants';

export const UNLIMITED = -1;

export interface InsightUsage {
  used: number;
  limit: number;
  /** -1 when unlimited. */
  remaining: number;
  resetDate: Date;
}

/** First instant of next month. */
export function getNextMonthStart(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
}

/** Plan-name based default, used when the product has no explicit `aiInsightsLimit`. */
function limitFromPlanName(planId: string): number | null {
  const plan = planId.toLowerCase();
  if (plan.includes('enterprise') || plan.includes('agency')) return ENTERPRISE_TIER_LIMITS.AI_INSIGHTS;
  if (plan.includes('buyer')) return PRO_BUYER_LIMITS.AI_INSIGHTS;
  if (plan.includes('yearly')) return PRO_TIER_LIMITS.YEARLY.AI_INSIGHTS;
  if (plan.includes('monthly')) return PRO_TIER_LIMITS.MONTHLY.AI_INSIGHTS;
  return null;
}

export const isSubscribedUser = (user: IUser): boolean =>
  Boolean(user.isSubscribed && user.hasActiveSubscription());

/** The user's monthly limit (-1 = unlimited). */
export async function resolveMonthlyLimit(user: IUser): Promise<number> {
  if (!isSubscribedUser(user) || !user.subscriptionPlan) return FREE_TIER_LIMITS.AI_INSIGHTS;

  const product = await Product.findOne({ productId: user.subscriptionPlan });
  const configured = product?.aiInsightsLimit ?? undefined;
  if (configured === UNLIMITED) return UNLIMITED;
  if (typeof configured === 'number' && configured > 0) return configured;

  return limitFromPlanName(user.subscriptionPlan) ?? FREE_TIER_LIMITS.AI_INSIGHTS;
}

/**
 * Make sure the user has a usage record and that it covers the current month,
 * resetting the counter when the month has rolled over. Returns true when the
 * record changed (so the caller can decide whether to persist it).
 */
export function ensureCurrentWindow(user: IUser, now: Date = new Date()): boolean {
  if (!user.neighborhoodInsights) {
    user.neighborhoodInsights = { monthlyCount: 0, monthResetDate: getNextMonthStart(now) };
    return true;
  }
  if (now >= user.neighborhoodInsights.monthResetDate) {
    user.neighborhoodInsights.monthlyCount = 0;
    user.neighborhoodInsights.monthResetDate = getNextMonthStart(now);
    return true;
  }
  return false;
}

export function hasReachedLimit(used: number, limit: number): boolean {
  return limit !== UNLIMITED && used >= limit;
}

export function toUsage(user: IUser, limit: number): InsightUsage {
  const used = user.neighborhoodInsights?.monthlyCount ?? 0;
  return {
    used,
    limit,
    remaining: limit === UNLIMITED ? UNLIMITED : Math.max(limit - used, 0),
    resetDate: user.neighborhoodInsights?.monthResetDate ?? getNextMonthStart(),
  };
}
