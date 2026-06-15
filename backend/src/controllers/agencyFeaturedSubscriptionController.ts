import { Request, Response } from 'express';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import PromotionCoupon from '../models/PromotionCoupon';
import { agencyLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';
import {
  FEATURED_INTERVALS,
  computePeriodEnd,
  getIntervalPrice,
  isValidFeaturedInterval,
} from '../utils/featuredSubscriptionUtils';

export const createFeaturedSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const { interval = '28days', couponCode, startTrial = false } = req.body;
    const userId = (req as any).user?.id || (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate interval against the supported set before touching the database.
    if (!isValidFeaturedInterval(interval)) {
      res.status(400).json({
        error: 'Invalid subscription interval',
        message: `Interval must be one of: ${FEATURED_INTERVALS.join(', ')}`,
        allowedIntervals: FEATURED_INTERVALS,
      });
      return;
    }

    // Check if agency exists and user is the owner
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ error: 'Agency not found' });
      return;
    }

    if (agency.ownerId.toString() !== userId) {
      res.status(403).json({ error: 'Only agency owner can create subscription' });
      return;
    }

    // Check if active subscription already exists
    const existingSubscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
      status: { $in: ['active', 'trial'] },
    });

    if (existingSubscription) {
      res.status(400).json({
        error: 'Active subscription already exists',
        subscription: existingSubscription,
      });
      return;
    }

    // Calculate dates and price
    const now = new Date();

    // Double-check: If agency is currently featured, prevent duplicate subscription
    if (agency.isFeatured && agency.featuredEndDate && agency.featuredEndDate > now) {
      res.status(400).json({
        error: 'Agency is already featured',
        message: `Your agency is already featured until ${agency.featuredEndDate.toLocaleDateString()}`,
        featuredEndDate: agency.featuredEndDate,
        daysRemaining: Math.ceil((agency.featuredEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      });
      return;
    }
    let currentPeriodEnd = new Date(now);
    let price = 10; // Default weekly price
    let isTrial = false;
    let trialEndDate: Date | undefined;
    let appliedCouponCode: string | undefined;
    let appliedCouponId: any | undefined;
    let discountApplied = 0;
    let trialDays = 0;
    // Coupon to record AFTER the subscription is persisted (avoids consuming a
    // coupon use when the subsequent save fails). Reason is surfaced to the
    // client when a coupon was supplied but could not be applied.
    let couponToRecord: any | undefined;
    let couponRejectionReason: string | undefined;

    // Handle trial
    if (startTrial) {
      isTrial = true;
      trialDays = 7; // Default 7 days trial
      trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);
      currentPeriodEnd = new Date(trialEndDate);
      price = 0; // Free during trial
    } else {
      // Calculate period end and price from the shared interval config.
      currentPeriodEnd = computePeriodEnd(now, interval);
      price = getIntervalPrice(interval);
    }

    // Apply coupon if provided (works for both trial and paid subscriptions).
    // Usage is NOT recorded here — it is recorded only after the subscription
    // is successfully saved, so a failed save never burns a coupon use.
    if (couponCode) {
      const coupon = await PromotionCoupon.findOne({
        code: couponCode.toUpperCase(),
        status: 'active',
      });

      if (!coupon || !coupon.isValid()) {
        couponRejectionReason = 'Coupon not found or expired';
      } else if (!(await coupon.canBeUsedBy(userId as any))) {
        couponRejectionReason = 'You have already used this coupon or its usage limit has been reached';
      } else if (
        coupon.applicableTiers &&
        coupon.applicableTiers.length > 0 &&
        !coupon.applicableTiers.includes('featured')
      ) {
        couponRejectionReason = 'This coupon cannot be applied to a featured agency subscription';
      } else if (coupon.minimumPurchaseAmount && price < coupon.minimumPurchaseAmount) {
        couponRejectionReason = `This coupon requires a minimum purchase of €${coupon.minimumPurchaseAmount}`;
      } else {
        // Calculate discount immediately
        const calculatedDiscount = coupon.calculateDiscount(price);

        // For trial subscriptions, coupon can extend the trial period
        if (isTrial && coupon.discountType === 'fixed' && coupon.discountValue === 0) {
          // This is a trial extension coupon - check description for days
          const daysMatch = coupon.description?.match(/(\d+)\s*day/i);
          if (daysMatch) {
            const extensionDays = parseInt(daysMatch[1], 10);
            trialDays = extensionDays;
            trialEndDate = new Date(now);
            trialEndDate.setDate(trialEndDate.getDate() + extensionDays);
            currentPeriodEnd = new Date(trialEndDate);
          }
        } else {
          // Apply price discount
          discountApplied = calculatedDiscount;
          price = Math.max(0, price - discountApplied);
        }

        appliedCouponCode = coupon.code;
        appliedCouponId = coupon._id;
        couponToRecord = coupon;
      }
    }

    // Direct payments are not yet available, so a paid subscription can only be
    // activated for free via a valid coupon. If a coupon was supplied but could
    // not be applied, fail loudly instead of creating a dead pending_payment row.
    if (!isTrial && couponCode && price > 0) {
      res.status(400).json({
        error: 'Coupon could not be applied',
        message: couponRejectionReason || 'This coupon is not valid for this subscription',
      });
      return;
    }

    // Create subscription
    const subscription = new AgencyFeaturedSubscription({
      agencyId,
      userId,
      status: isTrial ? 'trial' : 'pending_payment',
      interval,
      price,
      currency: 'EUR',
      startDate: now,
      currentPeriodStart: now,
      currentPeriodEnd,
      trialEndDate,
      isTrial,
      trialDays: isTrial ? trialDays : undefined,
      appliedCouponCode,
      appliedCouponId,
      discountApplied,
      autoRenewing: true,
      cancelAtPeriodEnd: false,
    });

    await subscription.save();

    // Update agency featured status if free (trial or 100% discount)
    if (price === 0) {
      agency.isFeatured = true;
      agency.featuredStartDate = now;
      agency.featuredEndDate = currentPeriodEnd;
      await agency.save();

      // Mark as active instead of pending_payment
      subscription.status = 'active';
      await subscription.save();
    }

    // Record coupon usage only now that the subscription is persisted, so a
    // failed save never consumes a coupon use.
    if (couponToRecord) {
      await couponToRecord.recordUsage(userId as any, agencyId as any, discountApplied);
    }

    res.status(201).json({
      message: price === 0
        ? 'Subscription activated successfully (free)'
        : isTrial
          ? 'Free trial started successfully'
          : 'Subscription created, pending payment',
      subscription,
      requiresPayment: price > 0 && !isTrial,
      finalPrice: price,
    });
  } catch (error) {
    agencyLogger.error('Error creating featured subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
};

/**
 * Get agency featured subscription details
 * GET /api/agencies/:agencyId/featured-subscription
 */
export const getFeaturedSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    // Fetch both subscription and agency data in parallel for optimal performance
    const [subscription, agency] = await Promise.all([
      AgencyFeaturedSubscription.findOne({
        agencyId,
      })
        .sort({ createdAt: -1 })
        .select('-__v') // Exclude version key for lighter payload
        .lean(), // Use lean() for faster query as we don't need Mongoose document methods
      Agency.findById(agencyId)
        .select('isFeatured featuredStartDate featuredEndDate')
        .lean()
    ]);

    if (!subscription) {
      // No subscription found, but return agency featured status
      if (agency) {
        res.json({
          subscription: null,
          agency: {
            isFeatured: agency.isFeatured || false,
            featuredStartDate: agency.featuredStartDate,
            featuredEndDate: agency.featuredEndDate,
            daysRemaining: agency.featuredEndDate
              ? Math.max(0, Math.ceil((new Date(agency.featuredEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : 0
          }
        });
        return;
      }
      res.status(404).json({ error: 'No subscription found' });
      return;
    }

    // Calculate days remaining
    const daysRemaining = subscription.currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      subscription,
      agency: {
        isFeatured: agency?.isFeatured || false,
        featuredStartDate: agency?.featuredStartDate,
        featuredEndDate: agency?.featuredEndDate,
        daysRemaining
      }
    });
  } catch (error) {
    agencyLogger.error('Error fetching featured subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

/**
 * Cancel featured subscription
 * DELETE /api/agencies/:agencyId/featured-subscription
 */
export const cancelFeaturedSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const { immediately = false } = req.body;
    const userId = (req as any).user?.id || (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
      status: { $in: ['active', 'trial'] },
    });

    if (!subscription) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    // Check ownership
    if (subscription.userId.toString() !== userId) {
      res.status(403).json({ error: 'Unauthorized to cancel this subscription' });
      return;
    }

    if (immediately) {
      // Cancel immediately
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      subscription.currentPeriodEnd = new Date();

      // Update agency featured status
      const agency = await Agency.findById(agencyId);
      if (agency) {
        agency.isFeatured = false;
        agency.featuredEndDate = new Date();
        await agency.save();
      }
    } else {
      // Cancel at period end
      subscription.cancelAtPeriodEnd = true;
      subscription.autoRenewing = false;
      subscription.canceledAt = new Date();
    }

    await subscription.save();

    res.json({
      message: immediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of current period',
      subscription,
    });
  } catch (error) {
    agencyLogger.error('Error canceling featured subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

/**
 * Confirm payment and activate subscription (admin or payment webhook)
 * POST /api/agencies/:agencyId/featured-subscription/confirm-payment
 */
export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const { externalSubscriptionId, externalCustomerId } = req.body;

    const subscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
      status: 'pending_payment',
    });

    if (!subscription) {
      res.status(404).json({ error: 'No pending subscription found' });
      return;
    }

    // Update subscription
    subscription.status = 'active';
    subscription.externalSubscriptionId = externalSubscriptionId;
    subscription.externalCustomerId = externalCustomerId;
    subscription.lastPaymentDate = new Date();
    subscription.nextPaymentDate = subscription.currentPeriodEnd;

    await subscription.save();

    // Update agency featured status
    const agency = await Agency.findById(agencyId);
    if (agency) {
      agency.isFeatured = true;
      agency.featuredStartDate = subscription.startDate;
      agency.featuredEndDate = subscription.currentPeriodEnd;
      await agency.save();
    }

    res.json({
      message: 'Payment confirmed, subscription activated',
      subscription,
    });
  } catch (error) {
    agencyLogger.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

/**
 * Apply coupon to subscription
 * POST /api/agencies/:agencyId/featured-subscription/apply-coupon
 */
export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const { couponCode } = req.body;
    const userId = (req as any).user?.id || (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!couponCode) {
      res.status(400).json({ error: 'Coupon code is required' });
      return;
    }

    const subscription = await AgencyFeaturedSubscription.findOne({
      agencyId,
      status: { $in: ['active', 'trial', 'pending_payment'] },
    });

    if (!subscription) {
      res.status(404).json({ error: 'No active subscription found' });
      return;
    }

    // Find coupon
    const coupon = await PromotionCoupon.findOne({
      code: couponCode.toUpperCase(),
      status: 'active',
    });

    if (!coupon) {
      res.status(404).json({ error: 'Coupon not found or expired' });
      return;
    }

    if (!coupon.isValid()) {
      res.status(400).json({ error: 'Coupon is not valid' });
      return;
    }

    const canUse = await coupon.canBeUsedBy(userId as any);
    if (!canUse) {
      res.status(400).json({ error: 'You cannot use this coupon' });
      return;
    }

    // Calculate discount
    const originalPrice = subscription.price + (subscription.discountApplied || 0);
    const discountApplied = coupon.calculateDiscount(originalPrice);
    const newPrice = Math.max(0, originalPrice - discountApplied);

    // Update subscription
    subscription.appliedCouponCode = coupon.code;
    subscription.appliedCouponId = coupon._id as any;
    subscription.discountApplied = discountApplied;
    subscription.price = newPrice;

    await subscription.save();

    res.json({
      message: 'Coupon applied successfully',
      subscription,
      originalPrice,
      discountApplied,
      newPrice,
    });
  } catch (error) {
    agencyLogger.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
};

/**
 * Check and update expired subscriptions (cron job)
 * GET /api/admin/featured-subscriptions/check-expired
 */
export const checkExpiredSubscriptions = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // Find all subscriptions that have expired
    const expiredSubscriptions = await AgencyFeaturedSubscription.find({
      status: { $in: ['active', 'trial'] },
      currentPeriodEnd: { $lte: now },
    });

    let updatedCount = 0;
    for (const subscription of expiredSubscriptions) {
      // Check if should auto-renew
      if (subscription.autoRenewing && !subscription.cancelAtPeriodEnd) {
        // In a real implementation, you would charge the payment method here
        // For now, we'll just extend the period
        const newPeriodStart = subscription.currentPeriodEnd;
        const newPeriodEnd = computePeriodEnd(newPeriodStart, subscription.interval);

        subscription.currentPeriodStart = newPeriodStart;
        subscription.currentPeriodEnd = newPeriodEnd;
        subscription.nextPaymentDate = newPeriodEnd;
        subscription.isTrial = false; // No longer trial after first renewal

        // Update agency
        const agency = await Agency.findById(subscription.agencyId);
        if (agency) {
          agency.featuredEndDate = newPeriodEnd;
          await agency.save();
        }
      } else {
        // Expire subscription
        subscription.status = 'expired';
        subscription.isTrial = false;

        // Update agency
        const agency = await Agency.findById(subscription.agencyId);
        if (agency) {
          agency.isFeatured = false;
          agency.featuredEndDate = now;
          await agency.save();
        }
      }

      await subscription.save();
      updatedCount++;
    }

    res.json({
      message: `Checked and updated ${updatedCount} expired subscriptions`,
      updatedCount,
    });
  } catch (error) {
    agencyLogger.error('Error checking expired subscriptions:', error);
    res.status(500).json({ error: 'Failed to check expired subscriptions' });
  }
};

/**
 * Get all featured subscriptions (admin)
 * GET /api/admin/featured-subscriptions
 */
export const getAllFeaturedSubscriptions = async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const subscriptions = await AgencyFeaturedSubscription.find(query)
      .populate('agencyId', 'name slug logo')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await AgencyFeaturedSubscription.countDocuments(query);

    res.json({
      subscriptions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    agencyLogger.error('Error fetching featured subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
};
