import PromotionCoupon from '../models/PromotionCoupon';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';

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
    console.error('Error creating free trial coupon:', error);
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
    console.error('Error starting auto free trial:', error);
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
    console.error('Error checking subscription:', error);
    return { needsRenewal: false };
  }
};

/**
 * Calculate pricing for different intervals
 */
export const calculatePrice = (
  interval: 'weekly' | 'monthly' | 'yearly',
  couponCode?: string
): { basePrice: number; discountedPrice: number; savings: number } => {
  let basePrice = 10; // Weekly default

  if (interval === 'monthly') {
    basePrice = 35; // ~30% discount (vs 4 weeks × 10)
  } else if (interval === 'yearly') {
    basePrice = 400; // ~23% discount (vs 52 weeks × 10)
  }

  // For now, return base price
  // In real implementation, apply coupon discount here
  return {
    basePrice,
    discountedPrice: basePrice,
    savings: 0,
  };
};
