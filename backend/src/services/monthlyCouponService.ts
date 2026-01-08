import User from '../models/User';
import Agency from '../models/Agency';
import Product from '../models/Product';
import Subscription from '../models/Subscription';
import { sendMonthlyCouponEmail } from './emailService';

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

/**
 * Refresh promotion coupons for all active Pro subscribers
 */
export async function refreshProUserCoupons(): Promise<{ refreshed: number; emailsSent: number; errors: string[] }> {
  const errors: string[] = [];
  let refreshed = 0;
  let emailsSent = 0;

  try {
    // Find all users with active Pro subscriptions
    const activeProSubscriptions = await Subscription.find({
      status: { $in: ['active', 'trial'] },
      productId: { $in: ['pro_monthly', 'pro_yearly', 'seller_pro_monthly', 'seller_pro_yearly'] },
    }).lean();

    const userIds = activeProSubscriptions.map(sub => sub.userId);

    // Get the Pro product to get coupon amounts
    const proProduct = await Product.findOne({ productId: 'pro_monthly' }).lean();
    const monthlyAmount = proProduct?.promotionCoupons || 3;
    const highlightedAmount = proProduct?.highlightedCoupons || 2;
    const premiumAmount = proProduct?.premiumCoupons || 1;

    // Update each user's coupons
    for (const userId of userIds) {
      try {
        const user = await User.findById(userId);
        if (!user) continue;

        const now = new Date();
        const currentCoupons = user.proSubscription?.promotionCoupons;

        // Calculate rollover (max 6 for Pro users)
        const currentAvailable = currentCoupons?.available || 0;
        const rollover = Math.min(currentAvailable, 6);

        // Update promotion coupons
        await User.findByIdAndUpdate(userId, {
          'proSubscription.promotionCoupons': {
            monthly: monthlyAmount,
            available: monthlyAmount + rollover,
            used: 0,
            rollover: rollover,
            lastRefresh: now,
            highlightCoupons: highlightedAmount,
            usedHighlightCoupons: 0,
          },
        });

        refreshed++;

        // Send email notification
        try {
          await sendMonthlyCouponEmail({
            email: user.email,
            userName: user.firstName || user.email.split('@')[0],
            planName: 'Pro',
            totalCoupons: monthlyAmount + rollover,
            newCoupons: monthlyAmount,
            rolledOver: rollover,
            breakdown: {
              highlighted: highlightedAmount,
              premium: premiumAmount,
              featured: 0,
            },
          });
          emailsSent++;
        } catch (emailError) {
          errors.push(`Failed to send email to ${user.email}: ${emailError}`);
        }
      } catch (userError) {
        errors.push(`Failed to refresh coupons for user ${userId}: ${userError}`);
      }
    }
  } catch (error) {
    errors.push(`General error refreshing Pro user coupons: ${error}`);
  }

  return { refreshed, emailsSent, errors };
}

/**
 * Refresh promotion coupons for all active Agency subscribers
 */
export async function refreshAgencyCoupons(): Promise<{ refreshed: number; emailsSent: number; errors: string[] }> {
  const errors: string[] = [];
  let refreshed = 0;
  let emailsSent = 0;

  try {
    // Get the Enterprise/Agency product to get coupon amounts
    const agencyProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const monthlyAmount = agencyProduct?.promotionCoupons || 5;
    const highlightedAmount = agencyProduct?.highlightedCoupons || 2;
    const premiumAmount = agencyProduct?.premiumCoupons || 2;
    const featuredAmount = agencyProduct?.featuredCoupons || 1;

    // Find all active agencies with subscriptions
    const activeAgencySubscriptions = await Subscription.find({
      status: { $in: ['active', 'trial'] },
      productId: 'agency_yearly',
    }).lean();

    // Get unique agency owner IDs
    const agencyOwnerIds = activeAgencySubscriptions.map(sub => sub.userId);

    for (const ownerId of agencyOwnerIds) {
      try {
        const owner = await User.findById(ownerId);
        if (!owner?.agencyId) continue;

        const agency = await Agency.findById(owner.agencyId);
        if (!agency) continue;

        const now = new Date();

        // Agencies don't rollover - reset to monthly amount
        agency.promotionCoupons = {
          monthly: monthlyAmount,
          available: monthlyAmount,
          used: 0,
          lastRefresh: now,
        };

        await agency.save();
        refreshed++;

        // Send email to agency owner
        try {
          await sendMonthlyCouponEmail({
            email: owner.email,
            userName: owner.firstName || owner.email.split('@')[0],
            planName: 'Enterprise',
            totalCoupons: monthlyAmount,
            newCoupons: monthlyAmount,
            rolledOver: 0,
            breakdown: {
              highlighted: highlightedAmount,
              premium: premiumAmount,
              featured: featuredAmount,
            },
            isAgency: true,
            agencyName: agency.name,
          });
          emailsSent++;
        } catch (emailError) {
          errors.push(`Failed to send email to agency owner ${owner.email}: ${emailError}`);
        }

        // Also notify all agents in the agency
        const agents = await User.find({
          agencyId: agency._id,
          _id: { $ne: ownerId },
        });

        for (const agent of agents) {
          try {
            await sendMonthlyCouponEmail({
              email: agent.email,
              userName: agent.firstName || agent.email.split('@')[0],
              planName: 'Enterprise (Agency Member)',
              totalCoupons: monthlyAmount,
              newCoupons: monthlyAmount,
              rolledOver: 0,
              breakdown: {
                highlighted: highlightedAmount,
                premium: premiumAmount,
                featured: featuredAmount,
              },
              isAgency: true,
              agencyName: agency.name,
              isAgentNotification: true,
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
  } catch (error) {
    errors.push(`General error refreshing Agency coupons: ${error}`);
  }

  return { refreshed, emailsSent, errors };
}

/**
 * Main function to process all monthly coupon refreshes
 */
export async function processMonthlyCouponRefresh(): Promise<CouponRefreshResult> {
  console.log('[Coupon Service] Starting monthly coupon refresh...');

  const proResult = await refreshProUserCoupons();
  const agencyResult = await refreshAgencyCoupons();

  const result: CouponRefreshResult = {
    usersRefreshed: proResult.refreshed,
    agenciesRefreshed: agencyResult.refreshed,
    emailsSent: proResult.emailsSent + agencyResult.emailsSent,
    errors: [...proResult.errors, ...agencyResult.errors],
  };

  console.log(`[Coupon Service] Monthly refresh completed:`);
  console.log(`  - Pro users refreshed: ${result.usersRefreshed}`);
  console.log(`  - Agencies refreshed: ${result.agenciesRefreshed}`);
  console.log(`  - Emails sent: ${result.emailsSent}`);
  if (result.errors.length > 0) {
    console.log(`  - Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.error(`    ${e}`));
  }

  return result;
}
