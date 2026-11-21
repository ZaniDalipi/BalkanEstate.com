/**
 * What a plan comes with beyond its limits: promotion coupons, the agency's
 * agent coupons, the welcome and coupon emails, and the receipt.
 *
 * Moved out of subscriptionPaymentService.ts unchanged (it re-exports the
 * generators), so the grant service can use them without an import cycle.
 * Runs after the grant has committed; nothing here undoes a grant.
 */
import mongoose from 'mongoose';
import User from '../../models/User';
import Product from '../../models/Product';
import Agency from '../../models/Agency';
import PromotionCoupon from '../../models/PromotionCoupon';
import {
  sendAgentRegistrationCouponsEmail,
  sendEnterpriseWelcomeEmail,
  sendSubscriptionInvoice,
  sendProSubscriptionWelcomeEmail,
  sendMonthlyCouponEmail,
} from '../emailService';
import { generateSecureRandomString } from '../../utils/secureRandom';
import { paymentLogger } from '../../utils/logger';
import type { UserPlanTier } from '../../utils/planTier';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Initialize promotion coupons immediately when a user subscribes.
 * Ensures users get their promotion coupons right away instead of
 * waiting for the monthly cron job on the 1st.
 */
async function initializePromotionCoupons(
  userId: string,
  productId: string,
  isProProduct: boolean,
  isEnterpriseProduct: boolean
): Promise<void> {
  const now = new Date();

  if (isProProduct) {
    // Get the Pro product config for coupon amounts - use actual subscribed product, fallback to pro_monthly
    const proProduct = await Product.findOne({ productId }).lean()
      ?? await Product.findOne({ productId: 'pro_monthly' }).lean();
    const monthlyAmount = proProduct?.promotionCoupons || 3;
    const highlightedAmount = proProduct?.highlightedCoupons || 2;
    const premiumAmount = proProduct?.premiumCoupons || 1;

    // Check if user already has coupons (renewal - don't overwrite)
    const user = await User.findById(userId);
    if (user?.proSubscription?.promotionCoupons?.available && user.proSubscription.promotionCoupons.available > 0) {
      if (!isProduction) paymentLogger.info('✅ Pro user already has promotion coupons, skipping initialization');
      return;
    }

    await User.findByIdAndUpdate(userId, {
      'proSubscription.promotionCoupons': {
        monthly: monthlyAmount,
        available: monthlyAmount,
        used: 0,
        rollover: 0,
        lastRefresh: now,
        highlightCoupons: highlightedAmount,
        usedHighlightCoupons: 0,
      },
    });

    paymentLogger.info(`🎟️ Initialized ${monthlyAmount} promotion coupons for Pro user ${userId} (${highlightedAmount} highlighted, ${premiumAmount} premium)`);
  }

  if (isEnterpriseProduct) {
    // Get the Enterprise product config for coupon amounts
    const agencyProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const monthlyAmount = agencyProduct?.promotionCoupons || 5;

    // Find the user's agency
    const user = await User.findById(userId);
    if (!user?.agencyId) {
      if (!isProduction) paymentLogger.info('📋 No agency found yet - promotion coupons will be initialized when agency is created');
      return;
    }

    const agency = await Agency.findById(user.agencyId);
    if (!agency) return;

    // Check if agency already has coupons (renewal - don't overwrite)
    if (agency.promotionCoupons?.available > 0) {
      if (!isProduction) paymentLogger.info('✅ Agency already has promotion coupons, skipping initialization');
      return;
    }

    agency.promotionCoupons = {
      monthly: monthlyAmount,
      available: monthlyAmount,
      used: 0,
      lastRefresh: now,
    };

    await agency.save();

    paymentLogger.info(`🎟️ Initialized ${monthlyAmount} promotion coupons for agency ${agency.name}`);
  }
}

/**
 * Generate agent coupon codes for new Enterprise subscriptions
 * Creates 5 coupon codes and sends email to the agency owner
 */
/**
/**
 * Maximum validity period for generated promotion coupons.
 * Pro users get 30 days, agencies/enterprise get 14 days (2 weeks).
 */
const MAX_COUPON_VALIDITY_DAYS_PRO = 30;
const MAX_COUPON_VALIDITY_DAYS_AGENCY = 14;

/**
 * Generate PromotionCoupon records for a new Pro subscriber.
 * Returns an array of { tier, code } objects to embed in the welcome email.
 */
async function generateProSubscriptionCoupons(
  userId: string,
  highlightedCount: number,
  premiumCount: number,
  featuredCount: number,
  validUntil: Date,
  maxValidityDays: number = MAX_COUPON_VALIDITY_DAYS_PRO,
): Promise<Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }>> {
  const results: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }> = [];

  // Cap validity to maxValidityDays from now regardless of what the
  // caller passed (end-of-month or subscription expiry can exceed the limit).
  const maxExpiry = new Date(Date.now() + maxValidityDays * 24 * 60 * 60 * 1000);
  const cappedValidUntil = validUntil < maxExpiry ? validUntil : maxExpiry;

  const tiers: Array<{ tier: 'highlight' | 'premium' | 'featured'; count: number }> = [
    { tier: 'highlight', count: highlightedCount },
    { tier: 'premium', count: premiumCount },
    { tier: 'featured', count: featuredCount },
  ];

  for (const { tier, count } of tiers) {
    for (let i = 0; i < count; i++) {
      const prefix = tier === 'highlight' ? 'HL' : tier === 'premium' ? 'PR' : 'FT';
      const code = `${prefix}-${userId.slice(-5).toUpperCase()}-${generateSecureRandomString(6).toUpperCase()}`;

      await PromotionCoupon.create({
        code,
        description: `Pro subscription ${tier} coupon for user ${userId}`,
        discountType: 'percentage',
        discountValue: 100,
        validFrom: new Date(),
        validUntil: cappedValidUntil,
        status: 'active',
        maxTotalUses: 1,   // single-use only
        maxUsesPerUser: 1, // single-use only
        applicableTiers: [tier],
        isPublic: false,
        generatedForUserId: new mongoose.Types.ObjectId(userId),
        notes: `Auto-generated for userId:${userId}`,
      });

      results.push({ tier, code });
    }
  }

  return results;
}

async function generateEnterpriseAgentCoupons(
  userId: string,
  ownerName: string,
  ownerEmail: string
): Promise<void> {
  // Find or create agency for this user
  let agency = await Agency.findOne({ ownerId: userId });

  if (!agency) {
    // If no agency exists yet, the coupons will be generated when they create the agency
    if (!isProduction) paymentLogger.info('📋 No agency found yet - coupons will be generated when agency is created');
    return;
  }

  // Check if coupons already exist (in case of duplicate calls)
  const existingAvailableCoupons = agency.agentCoupons.filter(
    (c: any) => c.status === 'available'
  ).length;

  if (existingAvailableCoupons >= 5) {
    if (!isProduction) paymentLogger.info('✅ Agency already has 5 available coupons');
    return;
  }

  // Generate coupon codes (up to 5 total)
  const couponsToGenerate = 5 - existingAvailableCoupons;
  const newCoupons: Array<{ code: string; expiresAt: Date }> = [];

  for (let i = 0; i < couponsToGenerate; i++) {
    const code = agency.generateCouponCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Valid for 1 year

    agency.agentCoupons.push({
      code,
      generatedAt: new Date(),
      expiresAt,
      status: 'available',
    } as any);

    newCoupons.push({ code, expiresAt });
  }

  // Update agency subscription status
  agency.subscription = {
    ...agency.subscription,
    status: 'active',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    autoRenew: true,
  };

  await agency.save();

  if (!isProduction) paymentLogger.info(`✅ Generated ${couponsToGenerate} agent coupons for agency ${agency.name}`);

  // Send emails with the coupon codes and welcome message
  try {
    // Fetch Enterprise product to get coupon breakdown values
    const enterpriseProduct = await Product.findOne({ productId: 'agency_yearly' }).lean();
    const promotionCoupons = {
      total: enterpriseProduct?.promotionCoupons || 5,
      premium: enterpriseProduct?.premiumCoupons || 2,
      highlighted: enterpriseProduct?.highlightedCoupons || 2,
      featured: enterpriseProduct?.featuredCoupons || 1,
    };

    // Send agent registration coupons email
    await sendAgentRegistrationCouponsEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
      coupons: newCoupons,
    });
    // Sent agent registration coupons email

    // Send welcome/thank you email with promotion coupon breakdown
    await sendEnterpriseWelcomeEmail({
      email: ownerEmail,
      ownerName,
      agencyName: agency.name,
      promotionCoupons,
      agentCoupons: enterpriseProduct?.agentCoupons || 5,
      teamMembersLimit: enterpriseProduct?.teamMembersLimit || 5,
      listingsLimit: enterpriseProduct?.listingsLimit || 750,
    });
    // Sent Enterprise welcome email with coupon breakdown
  } catch (emailError) {
    paymentLogger.error('⚠️ Failed to send Enterprise emails:', emailError);
    // Don't throw - coupons were still generated successfully
  }
}
export interface PlanBenefitsInput {
  userId: string;
  user: { name?: string; email: string; agencyName?: string };
  product: {
    productId: string;
    name: string;
    billingPeriod?: string;
    listingsLimit?: number;
    promotionCoupons?: number;
    highlightedCoupons?: number;
    premiumCoupons?: number;
    featuredCoupons?: number;
    aiInsightsLimit?: number;
    aiMessagesLimit?: number;
    savedSearchesLimit?: number;
  };
  tier: UserPlanTier | null;
  /** First period of this plan (not a renewal): coupons and welcome emails go out once. */
  isNewSubscription: boolean;
  startDate: Date;
  expirationDate: Date;
  receipt: {
    /** The payment's reference, shown on the receipt (e.g. the order reference). */
    reference: string;
    amount: number;
    currency: string;
    discountCode?: string;
    /** The list price when a discount code was used; the receipt shows it. */
    originalAmount?: number;
    autoRenewing: boolean;
  };
}

/**
 * Coupons, welcome emails and the receipt for a plan that was just granted.
 * Each step is independent: one failing is logged and the others still run.
 */
export async function runPlanBenefits(input: PlanBenefitsInput): Promise<void> {
  const { userId, user, product, tier, isNewSubscription, expirationDate, receipt } = input;
  const isEnterpriseProduct = tier === 'agency_owner';
  const isProProduct = tier === 'pro';
  const displayName = user.name || user.email.split('@')[0];
  const breakdown = {
    highlighted: product.highlightedCoupons ?? 0,
    premium: product.premiumCoupons ?? 0,
    featured: product.featuredCoupons ?? 0,
  };

  if (isEnterpriseProduct && isNewSubscription) {
    try {
      await generateEnterpriseAgentCoupons(userId, user.name || 'Agency Owner', user.email);
    } catch (couponError) {
      paymentLogger.error('⚠️ Error generating Enterprise agent coupons:', couponError);
    }
  }

  // Promotion coupons right away, so the user doesn't wait for the monthly cron.
  try {
    await initializePromotionCoupons(userId, product.productId, isProProduct, isEnterpriseProduct);
  } catch (couponError) {
    paymentLogger.error('⚠️ Error initializing promotion coupons:', couponError);
  }

  if (isEnterpriseProduct && isNewSubscription) {
    try {
      const generatedCodes = await generateProSubscriptionCoupons(
        userId,
        breakdown.highlighted,
        breakdown.premium,
        breakdown.featured,
        expirationDate,
        MAX_COUPON_VALIDITY_DAYS_AGENCY,
      );
      await sendMonthlyCouponEmail({
        email: user.email,
        userName: displayName,
        planName: product.name ?? 'Enterprise',
        totalCoupons: product.promotionCoupons ?? 0,
        newCoupons: product.promotionCoupons ?? 0,
        rolledOver: 0,
        breakdown,
        isAgency: true,
        agencyName: user.agencyName || 'Your Agency',
        couponCodes: generatedCodes,
      });
    } catch (couponError) {
      paymentLogger.error('⚠️ Error generating/emailing Enterprise promotion coupons:', couponError);
    }
  }

  if (isProProduct && isNewSubscription) {
    try {
      const generatedCodes = await generateProSubscriptionCoupons(
        userId,
        breakdown.highlighted,
        breakdown.premium,
        breakdown.featured,
        expirationDate,
      );
      await sendProSubscriptionWelcomeEmail({
        email: user.email,
        userName: displayName,
        planName: product.name,
        listingsLimit: product.listingsLimit ?? 0,
        promotionCoupons: { total: product.promotionCoupons ?? 0, ...breakdown },
        aiInsightsLimit: product.aiInsightsLimit ?? 0,
        aiMessagesLimit: product.aiMessagesLimit ?? -1,
        savedSearchesLimit: product.savedSearchesLimit ?? -1,
        billingPeriod: product.billingPeriod === 'yearly' ? 'yearly' : 'monthly',
        expiresAt: expirationDate,
      });
      await sendMonthlyCouponEmail({
        email: user.email,
        userName: displayName,
        planName: product.name,
        totalCoupons: product.promotionCoupons ?? 0,
        newCoupons: product.promotionCoupons ?? 0,
        rolledOver: 0,
        breakdown,
        couponCodes: generatedCodes,
      });
    } catch (emailError) {
      paymentLogger.error('⚠️ Error sending Pro welcome/coupons email:', emailError);
    }
  }

  try {
    await sendSubscriptionInvoice(user.email, user.name || 'Customer', {
      planName: receipt.discountCode ? `${product.name} (Coupon: ${receipt.discountCode})` : product.name,
      amount: receipt.originalAmount ?? receipt.amount,
      currency: receipt.currency || 'EUR',
      billingPeriod: product.billingPeriod === 'yearly' ? 'yearly' : 'monthly',
      orderId: receipt.reference,
      subscriptionStartDate: input.startDate,
      nextBillingDate: expirationDate,
      autoRenewing: receipt.autoRenewing,
    });
  } catch (emailError) {
    paymentLogger.error('⚠️ Error sending receipt email:', emailError);
  }
}

export { generateEnterpriseAgentCoupons, generateProSubscriptionCoupons, initializePromotionCoupons };
