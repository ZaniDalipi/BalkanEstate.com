import User from '../models/User';
import Agency from '../models/Agency';
import Product, { IProduct } from '../models/Product';
import Subscription from '../models/Subscription';
import { sendMonthlyCouponEmail } from './emailService';
import { generateProSubscriptionCoupons } from './subscriptionPaymentService';
import { promotionLogger } from '../utils/logger';

/**
 * Monthly Coupon Service
 *
 * Handles:
 * - Refreshing promotion coupons for Pro users on the 1st of each month
 * - Refreshing promotion coupons for Agency users
 * - Sending email notifications about available coupons
 */

interface CouponRefreshResult {
  usersRefreshed: number;
  agenciesRefreshed: number;
  emailsSent: number;
  errors: string[];
}

// End of current month at 23:59:59 UTC
function endOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/**
 * Refresh promotion coupons for all active Pro subscribers.
 * - Reads coupon amounts from the user's actual subscription product (not a hardcoded default)
 * - Generates real PromotionCoupon codes valid until end of the current month
 * - Sends the monthly coupon email with the codes embedded
 */
export async function refreshProUserCoupons(): Promise<{ refreshed: number; emailsSent: number; errors: string[] }> {
  const errors: string[] = [];
  let refreshed = 0;
  let emailsSent = 0;

  const PRO_PRODUCT_IDS = ['pro_monthly', 'pro_yearly', 'seller_pro_monthly', 'seller_pro_yearly'];

  // Pre-load all Pro products once so we're not hitting DB per user
  const productCache = new Map<string, IProduct>();
  for (const pid of PRO_PRODUCT_IDS) {
    const p = await Product.findOne({ productId: pid }).lean<IProduct>();
    if (p) productCache.set(pid, p);
  }

  let activeProSubscriptions: any[];
  try {
    activeProSubscriptions = await Subscription.find({
      status: { $in: ['active', 'trial'] },
      productId: { $in: PRO_PRODUCT_IDS },
    }).lean();
  } catch (err) {
    return { refreshed: 0, emailsSent: 0, errors: [`Failed to query active Pro subscriptions: ${err}`] };
  }

  const monthEnd = endOfCurrentMonth();

  for (const sub of activeProSubscriptions) {
    const userId = sub.userId;
    try {
      const user = await User.findById(userId);
      if (!user) {
        errors.push(`Pro refresh: user ${userId} not found, skipping`);
        continue;
      }

      // Resolve product — fall back to pro_monthly values if product missing from cache
      const product = productCache.get(sub.productId) ?? productCache.get('pro_monthly');
      if (!product) {
        errors.push(`Pro refresh: product not found for ${sub.productId}, skipping user ${user.email}`);
        continue;
      }

      const monthlyAmount     = product.promotionCoupons   ?? 0;
      const highlightedAmount = product.highlightedCoupons ?? 0;
      const premiumAmount     = product.premiumCoupons     ?? 0;
      const featuredAmount    = product.featuredCoupons    ?? 0;
      const planName          = product.name               ?? 'Pro';

      // Skip if all coupon values are 0 (e.g., buyer pro plans)
      const totalBreakdown = highlightedAmount + premiumAmount + featuredAmount;
      if (monthlyAmount === 0 && totalBreakdown === 0) {
        continue;
      }

      const now = new Date();
      const currentAvailable = user.proSubscription?.promotionCoupons?.available ?? 0;
      const rollover = Math.min(currentAvailable, 6);

      await User.findByIdAndUpdate(userId, {
        'proSubscription.promotionCoupons': {
          monthly: monthlyAmount,
          available: monthlyAmount + rollover,
          used: 0,
          rollover,
          lastRefresh: now,
          highlightCoupons: highlightedAmount,
          usedHighlightCoupons: 0,
        },
      });
      refreshed++;

      // Generate actual coupon codes (only for the new monthly allocation)
      let couponCodes: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }> = [];
      try {
        couponCodes = await generateProSubscriptionCoupons(
          String(userId),
          highlightedAmount,
          premiumAmount,
          featuredAmount,
          monthEnd,
        );
      } catch (codeErr) {
        errors.push(`Failed to generate coupon codes for ${user.email}: ${codeErr}`);
        // still send email, just without embedded codes
      }

      try {
        await sendMonthlyCouponEmail({
          email: user.email,
          userName: user.name || user.email.split('@')[0],
          planName,
          totalCoupons: monthlyAmount + rollover,
          newCoupons: monthlyAmount,
          rolledOver: rollover,
          breakdown: {
            highlighted: highlightedAmount,
            premium: premiumAmount,
            featured: featuredAmount,
          },
          couponCodes,
        });
        emailsSent++;
      } catch (emailError) {
        errors.push(`Failed to send email to ${user.email}: ${emailError}`);
      }
    } catch (userError) {
      errors.push(`Failed to refresh coupons for user ${userId}: ${userError}`);
    }
  }

  return { refreshed, emailsSent, errors };
}

/**
 * Refresh promotion coupons for all active Agency/Enterprise subscribers.
 * - Reads coupon amounts from the actual agency product in DB
 * - Generates real PromotionCoupon codes for the owner (shared pool)
 * - Sends the agency-monthly-coupon email with codes to the owner
 * - Sends a notification (no codes) to each agent member
 * - Agencies do NOT roll over; coupons reset to the full monthly allocation
 */
export async function refreshAgencyCoupons(): Promise<{ refreshed: number; emailsSent: number; errors: string[] }> {
  const errors: string[] = [];
  let refreshed = 0;
  let emailsSent = 0;

  const AGENCY_PRODUCT_IDS = ['agency_yearly', 'seller_enterprise_yearly'];

  let agencyProduct: IProduct | null = null;
  for (const pid of AGENCY_PRODUCT_IDS) {
    agencyProduct = await Product.findOne({ productId: pid }).lean<IProduct>();
    if (agencyProduct) break;
  }

  if (!agencyProduct) {
    return { refreshed: 0, emailsSent: 0, errors: ['Agency product not found in DB; skipping agency coupon refresh'] };
  }

  const monthlyAmount     = agencyProduct.promotionCoupons   ?? 0;
  const highlightedAmount = agencyProduct.highlightedCoupons ?? 0;
  const premiumAmount     = agencyProduct.premiumCoupons     ?? 0;
  const featuredAmount    = agencyProduct.featuredCoupons    ?? 0;

  let activeAgencySubscriptions: any[];
  try {
    activeAgencySubscriptions = await Subscription.find({
      status: { $in: ['active', 'trial'] },
      productId: { $in: AGENCY_PRODUCT_IDS },
    }).lean();
  } catch (err) {
    return { refreshed: 0, emailsSent: 0, errors: [`Failed to query active Agency subscriptions: ${err}`] };
  }

  const monthEnd = endOfCurrentMonth();

  for (const sub of activeAgencySubscriptions) {
    const ownerId = sub.userId;
    try {
      const owner = await User.findById(ownerId);
      if (!owner) { errors.push(`Agency refresh: owner ${ownerId} not found`); continue; }
      if (!owner.agencyId) { errors.push(`Agency refresh: owner ${owner.email} has no agencyId`); continue; }

      const agency = await Agency.findById(owner.agencyId);
      if (!agency) { errors.push(`Agency refresh: agency ${owner.agencyId} not found for ${owner.email}`); continue; }

      // Reset agency coupons — no rollover
      agency.promotionCoupons = {
        monthly: monthlyAmount,
        available: monthlyAmount,
        used: 0,
        lastRefresh: new Date(),
      };
      await agency.save();
      refreshed++;

      // Generate codes for the owner (shared with the whole agency) — 2-week validity
      let couponCodes: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }> = [];
      try {
        couponCodes = await generateProSubscriptionCoupons(
          String(ownerId),
          highlightedAmount,
          premiumAmount,
          featuredAmount,
          monthEnd,
          14, // Agency coupons expire in 2 weeks
        );
      } catch (codeErr) {
        errors.push(`Failed to generate codes for agency ${agency.name}: ${codeErr}`);
      }

      // Email owner
      try {
        await sendMonthlyCouponEmail({
          email: owner.email,
          userName: owner.name || owner.email.split('@')[0],
          planName: agencyProduct.name ?? 'Enterprise',
          totalCoupons: monthlyAmount,
          newCoupons: monthlyAmount,
          rolledOver: 0,
          breakdown: { highlighted: highlightedAmount, premium: premiumAmount, featured: featuredAmount },
          isAgency: true,
          agencyName: agency.name,
          couponCodes,
        });
        emailsSent++;
      } catch (emailError) {
        errors.push(`Failed to send email to agency owner ${owner.email}: ${emailError}`);
      }

      // Notify all agents (no codes — codes belong to owner / shared pool)
      const agents = await User.find({ agencyId: agency._id, _id: { $ne: ownerId } });
      for (const agent of agents) {
        try {
          await sendMonthlyCouponEmail({
            email: agent.email,
            userName: agent.name || agent.email.split('@')[0],
            planName: `${agencyProduct.name ?? 'Enterprise'} (Agency Member)`,
            totalCoupons: monthlyAmount,
            newCoupons: monthlyAmount,
            rolledOver: 0,
            breakdown: { highlighted: highlightedAmount, premium: premiumAmount, featured: featuredAmount },
            isAgency: true,
            agencyName: agency.name,
            isAgentNotification: true,
            // No codes for agents — they use the shared pool managed by the owner
          });
          emailsSent++;
        } catch (emailError) {
          errors.push(`Failed to send email to agent ${agent.email}: ${emailError}`);
        }
      }
    } catch (agencyError) {
      errors.push(`Failed to refresh coupons for agency owner ${ownerId}: ${agencyError}`);
    }
  }

  return { refreshed, emailsSent, errors };
}

/**
 * Main function to process all monthly coupon refreshes
 */
export async function processMonthlyCouponRefresh(): Promise<CouponRefreshResult> {
  promotionLogger.info('[Coupon Service] Starting monthly coupon refresh...');

  const proResult = await refreshProUserCoupons();
  const agencyResult = await refreshAgencyCoupons();

  const result: CouponRefreshResult = {
    usersRefreshed: proResult.refreshed,
    agenciesRefreshed: agencyResult.refreshed,
    emailsSent: proResult.emailsSent + agencyResult.emailsSent,
    errors: [...proResult.errors, ...agencyResult.errors],
  };

  promotionLogger.info(`[Coupon Service] Monthly refresh completed:`);
  promotionLogger.info(`  - Pro users refreshed: ${result.usersRefreshed}`);
  promotionLogger.info(`  - Agencies refreshed: ${result.agenciesRefreshed}`);
  promotionLogger.info(`  - Emails sent: ${result.emailsSent}`);
  if (result.errors.length > 0) {
    promotionLogger.info(`  - Errors: ${result.errors.length}`);
    result.errors.forEach(e => promotionLogger.error(`    ${e}`));
  }

  return result;
}
