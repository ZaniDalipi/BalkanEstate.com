import User from '../models/User';
import Product from '../models/Product';
import {
  FREE_TIER_LIMITS,
  PRO_TIER_LIMITS,
  ENTERPRISE_TIER_LIMITS,
  PRO_BUYER_LIMITS,
} from '../config/subscriptionConstants';

/**
 * One AI chat message against the user's monthly allowance, shared by the
 * search assistant and the property assistant so both draw from one quota.
 */
export type AiMessageCheck =
  | { ok: true }
  | { ok: false; limit: number; used: number; resetDate: Date };

function nextMonthStart(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function monthlyLimitFor(user: any): Promise<number> {
  const isSubscribed = user.isSubscribed && user.hasActiveSubscription();
  if (!isSubscribed || !user.subscriptionPlan) return FREE_TIER_LIMITS.AI_MESSAGES;

  const product = await Product.findOne({ productId: user.subscriptionPlan });
  const rawLimit = product?.aiMessagesLimit;
  if (typeof rawLimit === 'number') return rawLimit;

  // Product without aiMessagesLimit: plan-based defaults.
  const plan = String(user.subscriptionPlan).toLowerCase();
  if (plan.includes('enterprise') || plan.includes('agency')) return ENTERPRISE_TIER_LIMITS.AI_MESSAGES;
  if (plan.includes('buyer')) return PRO_BUYER_LIMITS.AI_MESSAGES;
  if (plan.includes('yearly')) return PRO_TIER_LIMITS.YEARLY.AI_MESSAGES;
  if (plan.includes('monthly')) return PRO_TIER_LIMITS.MONTHLY.AI_MESSAGES;
  return FREE_TIER_LIMITS.AI_MESSAGES;
}

/** Count one message for `userId`, or report that the month's allowance is used up. */
export async function consumeAiMessage(userId: unknown): Promise<AiMessageCheck> {
  if (!userId) return { ok: true };
  const user = await User.findById(userId);
  if (!user) return { ok: true };

  const now = new Date();
  if (!user.aiMessagesUsage) {
    user.aiMessagesUsage = { monthlyCount: 0, monthResetDate: nextMonthStart() };
  }
  if (now >= user.aiMessagesUsage.monthResetDate) {
    user.aiMessagesUsage.monthlyCount = 0;
    user.aiMessagesUsage.monthResetDate = nextMonthStart();
  }

  const limit = await monthlyLimitFor(user);
  if (limit === -1) return { ok: true }; // unlimited
  if (user.aiMessagesUsage.monthlyCount >= limit) {
    return { ok: false, limit, used: user.aiMessagesUsage.monthlyCount, resetDate: user.aiMessagesUsage.monthResetDate };
  }
  user.aiMessagesUsage.monthlyCount += 1;
  await user.save();
  return { ok: true };
}
