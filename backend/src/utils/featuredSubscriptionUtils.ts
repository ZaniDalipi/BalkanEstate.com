import PromotionCoupon from '../models/PromotionCoupon';
import AgencyFeaturedSubscription, {
  FeaturedSubscriptionInterval,
} from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import { subscriptionLogger } from './logger';

/**
 * Single source of truth for featured-agency subscription intervals.
 *
 * Duration-based intervals (`Ndays`) are the current pricing model and must
 * stay aligned with the `featured_agency_*days` products in `seedProducts.ts`.
 * Legacy intervals (`weekly`/`monthly`/`yearly`) are retained so existing
 * records keep renewing correctly.
 */
interface IntervalConfig {
  days?: number;
  months?: number;
  years?: number;
  /** Base price in EUR before any coupon/discount is applied. */
  price: number;
}

export const FEATURED_INTERVAL_CONFIG: Record<FeaturedSubscriptionInterval, IntervalConfig> = {
  '7days': { days: 7, price: 6.99 },
  '14days': { days: 14, price: 11.99 },
  '28days': { days: 28, price: 24.99 },
  '90days': { days: 90, price: 49.99 },
  // Legacy intervals — kept for backward compatibility with existing records.
  weekly: { days: 7, price: 10 },
  monthly: { months: 1, price: 35 },
  yearly: { years: 1, price: 400 },
};

export const FEATURED_INTERVALS = Object.keys(
  FEATURED_INTERVAL_CONFIG
) as FeaturedSubscriptionInterval[];

/** Type guard validating that an arbitrary value is a supported interval. */
export const isValidFeaturedInterval = (
  value: unknown
): value is FeaturedSubscriptionInterval =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(FEATURED_INTERVAL_CONFIG, value);

/** Base (pre-discount) price in EUR for a given interval. */
export const getIntervalPrice = (interval: FeaturedSubscriptionInterval): number =>
  FEATURED_INTERVAL_CONFIG[interval].price;

/** Compute the period end date by advancing `start` according to the interval. */
export const computePeriodEnd = (
  start: Date,
  interval: FeaturedSubscriptionInterval
): Date => {
  const end = new Date(start);
  const config = FEATURED_INTERVAL_CONFIG[interval];

  if (config.days) end.setDate(end.getDate() + config.days);
  if (config.months) end.setMonth(end.getMonth() + config.months);
  if (config.years) end.setFullYear(end.getFullYear() + config.years);

  return end;
};

/**
 * Create a 7-day free trial coupon for new agencies
 * This coupon is automatically applied when a new agency is created
 */
export const createFreeTrialCoupon = async (
  agencyId: string,
  userId: string
): Promise<{ success: boolean; couponCode?: string; error?: string }> => {
  try {
    // Generate unique coupon code
    const couponCode = `TRIAL7-${agencyId.substring(0, 8).toUpperCase()}`;

    // Check if coupon already exists
    const existingCoupon = await PromotionCoupon.findOne({ code: couponCode });
    if (existingCoupon) {
      return { success: true, couponCode: existingCoupon.code };
    }

    // Create coupon valid for 7 days
    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + 7);

    const coupon = new PromotionCoupon({
      code: couponCode,
      description: '7-day free trial for new agency featured listing',
      discountType: 'percentage',
      discountValue: 100, // 100% off
      validFrom: now,
      validUntil,
      status: 'active',
      maxTotalUses: 1,
      maxUsesPerUser: 1,
      currentTotalUses: 0,
      applicableTiers: ['featured'],
      isPublic: false, // Private coupon, not shown in public list
      notes: `Auto-generated 7-day trial coupon for agency ${agencyId}`,
    });

    await coupon.save();

    return { success: true, couponCode: coupon.code };
  } catch (error) {
    subscriptionLogger.error('Error creating free trial coupon:', error);
    return { success: false, error: 'Failed to create trial coupon' };
  }
};

/**
 * Automatically start a 7-day free trial for a new agency
 */
export const startAutoFreeTrial = async (
  agencyId: string,
  userId: string
): Promise<{ success: boolean; subscription?: any; error?: string }> => {
  try {
    // Check if agency already has an active subscription
    const existingSubscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
      status: { $in: ['active', 'trial'] },
    });

    if (existingSubscription) {
      return { success: false, error: 'Agency already has an active subscription' };
    }

    // Calculate trial period
    const now = new Date();
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Create trial subscription
    const subscription = new AgencyFeaturedSubscription({
      agencyId,
      userId,
      status: 'trial',
      interval: 'weekly',
      price: 0,
      currency: 'EUR',
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndDate,
      trialEndDate,
      isTrial: true,
      trialDays: 7,
      autoRenewing: false, // Don't auto-renew trial
      cancelAtPeriodEnd: true,
      notes: 'Auto-generated 7-day free trial for new agency',
    });

    await subscription.save();

    // Update agency featured status
    const agency = await Agency.findById(agencyId);
    if (agency) {
      agency.isFeatured = true;
      agency.featuredStartDate = now;
      agency.featuredEndDate = trialEndDate;
      await agency.save();
    }

    return { success: true, subscription };
  } catch (error) {
    subscriptionLogger.error('Error starting auto free trial:', error);
    return { success: false, error: 'Failed to start trial' };
  }
};

/**
 * Check if a subscription needs renewal and update agency status
 */
export const checkAndUpdateSubscription = async (
  agencyId: string
): Promise<{ needsRenewal: boolean; subscription?: any }> => {
  try {
    const subscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return { needsRenewal: false };
    }

    const now = new Date();

    // Check if subscription has expired
    if (subscription.currentPeriodEnd <= now) {
      if (subscription.autoRenewing && !subscription.cancelAtPeriodEnd) {
        return { needsRenewal: true, subscription };
      } else {
        // Expire subscription
        subscription.status = 'expired';
        await subscription.save();

        // Update agency
        const agency = await Agency.findById(agencyId);
        if (agency) {
          agency.isFeatured = false;
          agency.featuredEndDate = now;
          await agency.save();
        }

        return { needsRenewal: false, subscription };
      }
    }

    return { needsRenewal: false, subscription };
  } catch (error) {
    subscriptionLogger.error('Error checking subscription:', error);
    return { needsRenewal: false };
  }
};

/**
 * Calculate pricing for a given interval.
 *
 * Pricing is sourced from {@link FEATURED_INTERVAL_CONFIG} so it stays aligned
 * with the seeded products and the create/renew flows.
 */
export const calculatePrice = (
  interval: FeaturedSubscriptionInterval,
  _couponCode?: string
): { basePrice: number; discountedPrice: number; savings: number } => {
  const basePrice = getIntervalPrice(interval);

  // Coupon discounts are applied at the controller layer against live coupon data.
  return {
    basePrice,
    discountedPrice: basePrice,
    savings: 0,
  };
};
