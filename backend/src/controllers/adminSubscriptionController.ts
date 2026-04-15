/**
 * Admin Subscription Controller
 *
 * Handles admin operations for viewing and managing subscriptions and payments.
 * Used for monitoring payment activity and troubleshooting user subscription issues.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription';
import PaymentRecord from '../models/PaymentRecord';
import SubscriptionEvent from '../models/SubscriptionEvent';
import User from '../models/User';
import Agency from '../models/Agency';
import Product from '../models/Product';
import { adminLogger } from '../utils/logger';
import { invalidateCache } from '../middleware/cache';
import { getObjectIdParam } from '../utils/validateParams';
import { escapeRegex } from '../utils/escapeRegex';
import { PRO_TIER_LIMITS, ENTERPRISE_TIER_LIMITS, FREE_TIER_LIMITS } from '../config/subscriptionConstants';

/**
 * @desc    Get all subscriptions with pagination and filters
 * @route   GET /api/admin/subscriptions
 * @access  Admin
 */
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const store = req.query.store as string;
    const search = req.query.search as string;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (store) query.store = store;

    // If search provided, find users first then filter by user IDs
    let userIds: any[] = [];
    if (search) {
      const safeSearch = escapeRegex(String(search));
      const users = await User.find({
        $or: [
          { email: { $regex: safeSearch, $options: 'i' } },
          { name: { $regex: safeSearch, $options: 'i' } },
        ],
      }).select('_id');
      userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('userId', 'email name phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
    ]);

    res.json({
      success: true,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting subscriptions:', error);
    res.status(500).json({ message: 'Error getting subscriptions' });
  }
};

/**
 * @desc    Get subscription details by ID
 * @route   GET /api/admin/subscriptions/:id
 * @access  Admin
 */
export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const subscription = await Subscription.findById(id)
      .populate('userId', 'email name phone role isSubscribed subscriptionStatus')
      .lean();

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    // Get related payment records
    const payments = await PaymentRecord.find({ subscriptionId: id })
      .sort({ transactionDate: -1 })
      .lean();

    // Get subscription events
    const events = await SubscriptionEvent.find({ subscriptionId: id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      subscription,
      payments,
      events,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting subscription:', error);
    res.status(500).json({ message: 'Error getting subscription' });
  }
};

/**
 * @desc    Get all payment records with pagination and filters
 * @route   GET /api/admin/payments
 * @access  Admin
 */
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const store = req.query.store as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (store) query.store = store;
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    // Search by email or transaction ID
    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { userEmail: { $regex: safeSearch, $options: 'i' } },
        { userName: { $regex: safeSearch, $options: 'i' } },
        { storeTransactionId: { $regex: safeSearch, $options: 'i' } },
      ];
    }

    const [payments, total, totalAmount] = await Promise.all([
      PaymentRecord.find(query)
        .populate('userId', 'email name')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentRecord.countDocuments(query),
      PaymentRecord.aggregate([
        { $match: { ...query, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalAmount: totalAmount[0]?.total || 0,
        totalTransactions: total,
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting payments:', error);
    res.status(500).json({ message: 'Error getting payments' });
  }
};

/**
 * @desc    Get payment details by ID
 * @route   GET /api/admin/payments/:id
 * @access  Admin
 */
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const payment = await PaymentRecord.findById(id)
      .populate('userId', 'email name phone role')
      .populate('subscriptionId', 'plan status startDate endDate')
      .lean();

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting payment:', error);
    res.status(500).json({ message: 'Error getting payment' });
  }
};

/**
 * @desc    Get payment/subscription statistics
 * @route   GET /api/admin/payments/stats
 * @access  Admin
 */
export const getPaymentStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalRevenue,
      monthlyRevenue,
      lastMonthRevenue,
      activeSubscriptions,
      recentPayments,
      paymentsByStore,
      subscriptionsByStatus,
    ] = await Promise.all([
      // Total revenue all time
      PaymentRecord.aggregate([
        { $match: { status: 'completed', transactionType: 'charge' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // This month's revenue
      PaymentRecord.aggregate([
        {
          $match: {
            status: 'completed',
            transactionType: 'charge',
            transactionDate: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Last month's revenue
      PaymentRecord.aggregate([
        {
          $match: {
            status: 'completed',
            transactionType: 'charge',
            transactionDate: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Active subscriptions count
      Subscription.countDocuments({ status: 'active' }),
      // Recent 10 payments
      PaymentRecord.find({ status: 'completed' })
        .populate('userId', 'email name')
        .sort({ transactionDate: -1 })
        .limit(10)
        .lean(),
      // Payments by store
      PaymentRecord.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$store', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
      // Subscriptions by status
      Subscription.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        lastMonthRevenue: lastMonthRevenue[0]?.total || 0,
        activeSubscriptions,
        recentPayments,
        paymentsByStore: paymentsByStore.reduce((acc, curr) => {
          acc[curr._id] = { count: curr.count, total: curr.total };
          return acc;
        }, {} as Record<string, { count: number; total: number }>),
        subscriptionsByStatus: subscriptionsByStatus.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting payment stats:', error);
    res.status(500).json({ message: 'Error getting payment stats' });
  }
};

/**
 * @desc    Manually activate a user's subscription (admin override)
 * @route   POST /api/admin/subscriptions/activate
 * @access  Admin
 */
export const activateUserSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, planName, durationDays, reason } = req.body;

    if (!userId || !planName || !durationDays) {
      res.status(400).json({ message: 'userId, planName, and durationDays are required' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(durationDays));

    // Update user
    const normalizedPlan = planName.toLowerCase().replace(/\s+/g, '_');
    user.isSubscribed = true;
    user.subscriptionStatus = 'active';
    user.subscriptionPlan = normalizedPlan;
    user.subscriptionProductName = planName;
    user.subscriptionSource = 'web';
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionStartedAt = new Date();

    // Sync embedded subscription object
    const isEnterprise = normalizedPlan.includes('enterprise') || normalizedPlan === 'agency_yearly';
    const isPro = normalizedPlan.includes('pro_') || normalizedPlan.includes('seller_pro_');
    const isYearly = normalizedPlan.includes('yearly');

    if (!user.subscription) {
      user.subscription = {} as any;
    }
    user.subscription.status = 'active';
    user.subscription.expiresAt = expiresAt;
    user.subscription.startDate = new Date();

    if (isEnterprise) {
      user.subscription.tier = 'agency_owner';
      user.subscription.listingsLimit = ENTERPRISE_TIER_LIMITS.LISTINGS;
    } else if (isPro) {
      user.subscription.tier = 'pro';
      user.subscription.listingsLimit = isYearly ? PRO_TIER_LIMITS.YEARLY.LISTINGS : PRO_TIER_LIMITS.MONTHLY.LISTINGS;
    }
    user.markModified('subscription');

    // Sync activeListingsLimit
    if (user.subscription.listingsLimit) {
      user.activeListingsLimit = user.subscription.listingsLimit;
    }

    // Sync activeRole and primaryRole
    const currentRole = user.role;
    if (currentRole && currentRole !== 'buyer') {
      if (user.activeRole !== currentRole) user.activeRole = currentRole as any;
      if (user.primaryRole !== currentRole) user.primaryRole = currentRole as any;
    }

    await user.save();

    // Create subscription record
    const subscription = await Subscription.create({
      userId,
      store: 'web',
      productId: planName.toLowerCase().replace(/\s+/g, '_'),
      startDate: new Date(),
      expirationDate: expiresAt,
      renewalDate: expiresAt,
      status: 'active',
      autoRenewing: false,
      price: 0,
      currency: 'EUR',
      purchaseToken: `admin_${userId}_${Date.now()}`,
      transactionId: `admin_txn_${userId}_${Date.now()}`,
    });

    // Update user with subscription ID
    user.activeSubscriptionId = subscription._id as mongoose.Types.ObjectId;
    await user.save();

    // Create event for audit trail
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      userId,
      eventType: 'subscription_purchased',
      store: 'web',
      metadata: {
        activatedByAdmin: true,
        adminUserId: (req as any).user?._id,
        reason,
      },
    });

    adminLogger.info(`[Admin] Subscription activated for user ${user._id} - Plan: ${planName}, Duration: ${durationDays} days`);

    // Invalidate caches so subscription change reflects immediately
    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: `Subscription activated for ${user.email}`,
      subscription: {
        planName,
        expiresAt,
        userId: user._id,
        email: user.email,
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error activating subscription:', error);
    res.status(500).json({ message: 'Error activating subscription' });
  }
};

/**
 * @desc    Cancel a user's subscription (admin action)
 * @route   POST /api/admin/subscriptions/:id/cancel
 * @access  Admin
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { reason, immediate } = req.body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const user = await User.findById(subscription.userId);

    if (immediate) {
      // Immediate cancellation
      subscription.status = 'canceled';
      subscription.canceledAt = new Date();
      subscription.cancellationReason = reason || 'Admin cancellation';

      if (user) {
        user.isSubscribed = false;
        user.subscriptionStatus = 'canceled';
        await user.save();
      }
    } else {
      // Cancel at end of period
      subscription.status = 'pending_cancellation';
      subscription.autoRenewing = false;
      subscription.willCancelAt = subscription.expirationDate;
      subscription.cancellationReason = reason || 'Admin cancellation';

      if (user) {
        user.subscriptionStatus = 'canceled';
        await user.save();
      }
    }

    await subscription.save();

    // Create event
    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      userId: subscription.userId,
      eventType: 'subscription_canceled',
      store: subscription.store,
      metadata: {
        canceledByAdmin: true,
        adminUserId: (req as any).user?._id,
        reason,
        immediate,
      },
    });

    adminLogger.info(`[Admin] Subscription ${id} canceled for user ${user?._id}`);

    // Invalidate caches so cancellation reflects immediately
    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: immediate ? 'Subscription canceled immediately' : 'Subscription will cancel at end of period',
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error canceling subscription:', error);
    res.status(500).json({ message: 'Error canceling subscription' });
  }
};

/**
 * @desc    Directly adjust a user's active listing limit (admin override)
 * @route   PATCH /api/admin/subscriptions/listing-limit/:userId
 * @access  Admin
 */
export const adjustListingLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;
    const { listingsLimit, reason } = req.body;

    if (listingsLimit === undefined || listingsLimit === null || Number(listingsLimit) < 0) {
      res.status(400).json({ message: 'listingsLimit must be a non-negative number' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const newLimit = Number(listingsLimit);

    // Update unified subscription object — initialize if missing
    if (!user.subscription) {
      user.subscription = {
        tier: 'free',
        status: 'active',
        listingsLimit: newLimit,
        activeListingsCount: 0,
      } as any;
    } else {
      user.subscription.listingsLimit = newLimit;
    }
    user.markModified('subscription');

    // Sync activeListingsLimit (the field actually checked for listing creation)
    user.activeListingsLimit = newLimit;

    // Also update proSubscription if it exists
    if (user.proSubscription) {
      user.proSubscription.totalListingsLimit = newLimit;
      user.markModified('proSubscription');
    }

    // Also update legacy freeSubscription field if it exists
    if (user.freeSubscription) {
      user.freeSubscription.listingsLimit = newLimit;
      user.markModified('freeSubscription');
    }

    await user.save();

    // Audit trail (use userId as subscriptionId — no separate subscription doc for individual users)
    await SubscriptionEvent.create({
      subscriptionId: userId,
      userId,
      eventType: 'subscription_updated',
      store: 'web',
      metadata: {
        action: 'admin_listing_limit_override',
        newListingsLimit: newLimit,
        adminUserId: (req as any).user?._id,
        reason: reason || 'Admin manual override',
      },
    });

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    adminLogger.info(`[Admin] Listing limit for user ${userId} set to ${newLimit} by admin ${(req as any).user?._id}`);

    res.json({
      success: true,
      message: `Listing limit updated to ${newLimit} for ${user.email}`,
      listingsLimit: newLimit,
      userId: user._id,
      email: user.email,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error adjusting listing limit:', error);
    res.status(500).json({ message: 'Error adjusting listing limit' });
  }
};

/**
 * @desc    Deactivate a user's subscription immediately (admin action)
 * @route   POST /api/admin/subscriptions/:id/deactivate
 * @access  Admin
 */
export const deactivateUserSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;
    const { reason } = req.body;

    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      res.status(400).json({ message: 'Reason must be a string with max 500 characters' });
      return;
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    if (subscription.status !== 'active' && subscription.status !== 'trial' && subscription.status !== 'grace') {
      res.status(400).json({ message: `Cannot deactivate subscription with status '${subscription.status}'` });
      return;
    }

    const previousStatus = subscription.status;
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    subscription.autoRenewing = false;
    subscription.cancellationReason = reason || 'Admin deactivation';
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      user.isSubscribed = false;
      user.subscriptionStatus = 'canceled';
      await user.save();
    }

    await SubscriptionEvent.create({
      subscriptionId: subscription._id,
      userId: subscription.userId,
      eventType: 'subscription_canceled',
      store: subscription.store,
      previousStatus,
      newStatus: 'canceled',
      metadata: {
        deactivatedByAdmin: true,
        adminUserId: (req as any).user?._id,
        reason: reason || 'Admin deactivation',
      },
    });

    adminLogger.info(`[Admin] Subscription ${id} deactivated for user ${user?._id} by admin ${(req as any).user?._id}`);

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: `Subscription deactivated for ${user?.email || 'unknown user'}`,
    });
  } catch (error: unknown) {
    adminLogger.error('[Admin] Error deactivating subscription:', error);
    res.status(500).json({ message: 'Error deactivating subscription' });
  }
};

// ===== Agency Subscription Management =====

/**
 * @desc    Activate an agency's subscription (admin override)
 * @route   POST /api/admin/agencies/:agencyId/subscription/activate
 * @access  Admin
 */
export const activateAgencySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    const { durationDays, reason } = req.body;

    // Validate durationDays
    const duration = parseInt(durationDays, 10);
    if (!duration || duration < 1 || duration > 730) {
      res.status(400).json({ message: 'durationDays must be a number between 1 and 730' });
      return;
    }

    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      res.status(400).json({ message: 'Reason must be a string with max 500 characters' });
      return;
    }

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const previousStatus = agency.subscription?.status || 'expired';
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Update agency subscription
    agency.subscription.status = 'active';
    agency.subscription.startDate = now;
    agency.subscription.expiresAt = expiresAt;
    agency.subscription.autoRenew = false;
    agency.markModified('subscription');
    await agency.save();

    // Update the agency owner's user record
    const owner = await User.findById(agency.ownerId);
    if (owner) {
      owner.isSubscribed = true;
      owner.subscriptionStatus = 'active';
      owner.subscriptionPlan = 'agency';
      owner.subscriptionExpiresAt = expiresAt;
      await owner.save();
    }

    // Audit trail — use agency._id as subscriptionId since agency subscriptions are embedded
    await SubscriptionEvent.create({
      subscriptionId: agency._id,
      userId: agency.ownerId,
      eventType: 'subscription_reactivated',
      store: 'web',
      previousStatus,
      newStatus: 'active',
      metadata: {
        activatedByAdmin: true,
        adminUserId: (req as any).user?._id,
        reason: reason || 'Admin activation',
        agencyId: String(agency._id),
        agencyName: agency.name,
        durationDays: duration,
      },
    });

    adminLogger.info(`[Admin] Agency subscription activated for ${agency.name} (${agencyId}) - Duration: ${duration} days`);

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: `Subscription activated for agency "${agency.name}"`,
      subscription: {
        status: 'active',
        startDate: now,
        expiresAt,
        agencyId: agency._id,
        agencyName: agency.name,
      },
    });
  } catch (error: unknown) {
    adminLogger.error('[Admin] Error activating agency subscription:', error);
    res.status(500).json({ message: 'Error activating agency subscription' });
  }
};

/**
 * @desc    Deactivate an agency's subscription (admin action)
 * @route   POST /api/admin/agencies/:agencyId/subscription/deactivate
 * @access  Admin
 */
export const deactivateAgencySubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    const { reason, immediate } = req.body;

    if (reason && (typeof reason !== 'string' || reason.length > 500)) {
      res.status(400).json({ message: 'Reason must be a string with max 500 characters' });
      return;
    }

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const currentStatus = agency.subscription?.status;
    if (currentStatus !== 'active' && currentStatus !== 'trial') {
      res.status(400).json({ message: `Cannot deactivate subscription with status '${currentStatus}'` });
      return;
    }

    const shouldDeactivateNow = immediate !== false; // Default to immediate
    const previousStatus = currentStatus;

    if (shouldDeactivateNow) {
      agency.subscription.status = 'canceled';
      agency.markModified('subscription');
      await agency.save();

      // Update owner user record
      const owner = await User.findById(agency.ownerId);
      if (owner) {
        owner.isSubscribed = false;
        owner.subscriptionStatus = 'canceled';
        await owner.save();
      }
    } else {
      // Let it expire naturally — just disable auto-renew
      agency.subscription.autoRenew = false;
      agency.markModified('subscription');
      await agency.save();
    }

    await SubscriptionEvent.create({
      subscriptionId: agency._id,
      userId: agency.ownerId,
      eventType: 'subscription_canceled',
      store: 'web',
      previousStatus,
      newStatus: shouldDeactivateNow ? 'canceled' : previousStatus,
      metadata: {
        deactivatedByAdmin: true,
        adminUserId: (req as any).user?._id,
        reason: reason || 'Admin deactivation',
        agencyId: String(agency._id),
        agencyName: agency.name,
        immediate: shouldDeactivateNow,
      },
    });

    adminLogger.info(`[Admin] Agency subscription ${shouldDeactivateNow ? 'deactivated' : 'set to expire'} for ${agency.name} (${agencyId})`);

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: shouldDeactivateNow
        ? `Subscription deactivated for agency "${agency.name}"`
        : `Subscription for agency "${agency.name}" will expire at end of period`,
    });
  } catch (error: unknown) {
    adminLogger.error('[Admin] Error deactivating agency subscription:', error);
    res.status(500).json({ message: 'Error deactivating agency subscription' });
  }
};

/**
 * @desc    Get agency subscription details and history
 * @route   GET /api/admin/agencies/:agencyId/subscription
 * @access  Admin
 */
export const getAgencySubscriptionHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;

    const agency = await Agency.findById(agencyId)
      .populate('ownerId', 'name email')
      .lean();

    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // Fetch subscription events where metadata.agencyId matches
    const events = await SubscriptionEvent.find({
      subscriptionId: new mongoose.Types.ObjectId(agencyId),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      subscription: agency.subscription,
      owner: agency.ownerId,
      agencyName: agency.name,
      events,
    });
  } catch (error: unknown) {
    adminLogger.error('[Admin] Error getting agency subscription history:', error);
    res.status(500).json({ message: 'Error getting agency subscription history' });
  }
};

/**
 * @desc    Adjust listing limit for an agency and propagate to all its agents
 * @route   PATCH /api/admin/agencies/:agencyId/listing-limit
 * @access  Admin
 */
export const adjustAgencyListingLimit = async (req: Request, res: Response): Promise<void> => {
  try {
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return;
    const { listingsLimit, reason } = req.body;

    if (listingsLimit === undefined || listingsLimit === null || Number(listingsLimit) < 0) {
      res.status(400).json({ message: 'listingsLimit must be a non-negative number' });
      return;
    }

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const newLimit = Number(listingsLimit);

    // Update agency subscription listingsLimit
    (agency.subscription as any).listingsLimit = newLimit;
    agency.markModified('subscription');
    await agency.save();

    // Propagate to the agency owner
    const owner = await User.findById(agency.ownerId);
    let ownerUpdated = false;
    if (owner) {
      if (!owner.subscription) {
        owner.subscription = {
          tier: 'agency_owner',
          status: 'active',
          listingsLimit: newLimit,
          activeListingsCount: 0,
        } as any;
      } else {
        owner.subscription.listingsLimit = newLimit;
      }
      owner.markModified('subscription');
      await owner.save();
      ownerUpdated = true;
    }

    // Propagate to all agents in the agency
    const agentIds = agency.agents || [];
    let agentsUpdated = 0;
    if (agentIds.length > 0) {
      const result = await User.updateMany(
        { _id: { $in: agentIds } },
        { $set: { 'subscription.listingsLimit': newLimit } }
      );
      agentsUpdated = result.modifiedCount;
    }

    // Audit trail
    await SubscriptionEvent.create({
      subscriptionId: agency._id,
      userId: agency.ownerId,
      eventType: 'subscription_updated',
      store: 'web',
      metadata: {
        action: 'admin_agency_listing_limit_override',
        newListingsLimit: newLimit,
        adminUserId: (req as any).user?._id,
        reason: reason || 'Admin manual override',
        agencyId: String(agency._id),
        agencyName: agency.name,
        ownerUpdated,
        agentsUpdated,
      },
    });

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    adminLogger.info(`[Admin] Agency listing limit for ${agency.name} (${agencyId}) set to ${newLimit} by admin ${(req as any).user?._id} — owner: ${ownerUpdated}, agents: ${agentsUpdated}`);

    res.json({
      success: true,
      message: `Listing limit updated to ${newLimit} for agency "${agency.name}" (owner + ${agentsUpdated} agents updated)`,
      listingsLimit: newLimit,
      agencyId: agency._id,
      agencyName: agency.name,
      ownerUpdated,
      agentsUpdated,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error adjusting agency listing limit:', error);
    res.status(500).json({ message: 'Error adjusting agency listing limit' });
  }
};

/**
 * @desc    Manage a user's subscription (activate/deactivate/update dates) from the admin User Manager
 * @route   PATCH /api/admin/subscriptions/manage/:userId
 * @access  Admin
 */
export const manageUserSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const { isSubscribed, subscriptionPlan, subscriptionStartedAt, subscriptionExpiresAt, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Deactivate subscription
    if (isSubscribed === false) {
      // Cancel any active Subscription document
      if (user.activeSubscriptionId) {
        const sub = await Subscription.findById(user.activeSubscriptionId);
        if (sub && ['active', 'grace', 'trial'].includes(sub.status as string)) {
          sub.status = 'canceled';
          sub.canceledAt = new Date();
          sub.autoRenewing = false;
          sub.cancellationReason = reason || 'Admin deactivation via User Manager';
          await sub.save();
        }
      }

      const prevSubscriptionId = user.activeSubscriptionId;

      user.isSubscribed = false;
      user.subscriptionStatus = 'canceled';
      user.subscriptionPlan = undefined;
      user.subscriptionProductName = undefined;
      user.subscriptionSource = undefined;
      user.activeSubscriptionId = undefined;

      // Reset embedded subscription object
      if (user.subscription) {
        user.subscription.tier = 'free';
        user.subscription.status = 'canceled';
        user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
        user.subscription.expiresAt = undefined;
        user.markModified('subscription');
      }
      user.activeListingsLimit = FREE_TIER_LIMITS.LISTINGS;

      await user.save();

      await SubscriptionEvent.create({
        subscriptionId: prevSubscriptionId || userId,
        userId,
        eventType: 'subscription_canceled',
        store: 'web',
        metadata: {
          deactivatedByAdmin: true,
          adminUserId: (req as any).user?._id,
          reason: reason || 'Admin deactivation via User Manager',
        },
      });

      invalidateCache('/api/agents');
      invalidateCache('/api/properties');

      res.json({ success: true, message: `Subscription deactivated for ${user.email}` });
      return;
    }

    // Activate or update subscription
    const expiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : undefined;
    const startedAt = subscriptionStartedAt ? new Date(subscriptionStartedAt) : new Date();

    if (isSubscribed === true) {
      if (!subscriptionPlan || !expiresAt) {
        res.status(400).json({ message: 'subscriptionPlan and subscriptionExpiresAt are required for activation' });
        return;
      }

      user.isSubscribed = true;
      user.subscriptionStatus = 'active';
      user.subscriptionPlan = subscriptionPlan;
      user.subscriptionProductName = subscriptionPlan.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
      user.subscriptionSource = 'web';
      user.subscriptionExpiresAt = expiresAt;
      user.subscriptionStartedAt = startedAt;

      // Sync embedded subscription object
      const isEnterprise = subscriptionPlan.includes('enterprise') || subscriptionPlan === 'agency_yearly';
      const isPro = subscriptionPlan.includes('pro_') || subscriptionPlan.includes('seller_pro_');
      const isYearly = subscriptionPlan.includes('yearly');

      if (!user.subscription) {
        user.subscription = {} as any;
      }
      user.subscription.status = 'active';
      user.subscription.expiresAt = expiresAt;
      user.subscription.startDate = startedAt;

      if (isEnterprise) {
        user.subscription.tier = 'agency_owner';
        user.subscription.listingsLimit = ENTERPRISE_TIER_LIMITS.LISTINGS;
      } else if (isPro) {
        user.subscription.tier = 'pro';
        user.subscription.listingsLimit = isYearly ? PRO_TIER_LIMITS.YEARLY.LISTINGS : PRO_TIER_LIMITS.MONTHLY.LISTINGS;
      }
      user.markModified('subscription');

      // Sync activeListingsLimit
      if (user.subscription.listingsLimit) {
        user.activeListingsLimit = user.subscription.listingsLimit;
      }

      // Sync activeRole and primaryRole to match the user's actual role
      const currentRole = user.role;
      if (currentRole && currentRole !== 'buyer') {
        if (user.activeRole !== currentRole) user.activeRole = currentRole as any;
        if (user.primaryRole !== currentRole) user.primaryRole = currentRole as any;
      }

      // Create or update Subscription document
      let subscription = user.activeSubscriptionId
        ? await Subscription.findById(user.activeSubscriptionId)
        : null;

      if (subscription) {
        subscription.productId = subscriptionPlan;
        subscription.status = 'active';
        subscription.expirationDate = expiresAt;
        subscription.renewalDate = expiresAt;
        subscription.startDate = startedAt;
        subscription.autoRenewing = false;
        subscription.lastUpdated = new Date();
        await subscription.save();
      } else {
        subscription = await Subscription.create({
          userId,
          store: 'web',
          productId: subscriptionPlan,
          startDate: startedAt,
          expirationDate: expiresAt,
          renewalDate: expiresAt,
          status: 'active',
          autoRenewing: false,
          price: 0,
          currency: 'EUR',
          purchaseToken: `admin_${userId}_${Date.now()}`,
          transactionId: `admin_txn_${userId}_${Date.now()}`,
        });
        user.activeSubscriptionId = subscription._id as mongoose.Types.ObjectId;
      }

      await user.save();

      await SubscriptionEvent.create({
        subscriptionId: subscription._id,
        userId,
        eventType: 'subscription_purchased',
        store: 'web',
        metadata: {
          activatedByAdmin: true,
          adminUserId: (req as any).user?._id,
          reason: reason || 'Admin activation via User Manager',
          plan: subscriptionPlan,
          expiresAt,
          startedAt,
        },
      });

      invalidateCache('/api/agents');
      invalidateCache('/api/properties');

      res.json({
        success: true,
        message: `Subscription activated for ${user.email} — ${subscriptionPlan} until ${expiresAt.toLocaleDateString()}`,
      });
      return;
    }

    // Update dates only (isSubscribed not explicitly set)
    if (subscriptionPlan) {
      user.subscriptionPlan = subscriptionPlan;
      user.subscriptionProductName = subscriptionPlan.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    if (expiresAt) user.subscriptionExpiresAt = expiresAt;
    if (subscriptionStartedAt) user.subscriptionStartedAt = startedAt;
    await user.save();

    // Also update the Subscription document if it exists
    if (user.activeSubscriptionId) {
      const sub = await Subscription.findById(user.activeSubscriptionId);
      if (sub) {
        if (subscriptionPlan) sub.productId = subscriptionPlan;
        if (expiresAt) {
          sub.expirationDate = expiresAt;
          sub.renewalDate = expiresAt;
        }
        if (subscriptionStartedAt) sub.startDate = startedAt;
        sub.lastUpdated = new Date();
        await sub.save();
      }
    }

    invalidateCache('/api/agents');
    invalidateCache('/api/properties');

    res.json({
      success: true,
      message: `Subscription updated for ${user.email}`,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error managing user subscription:', error);
    res.status(500).json({ message: 'Error managing subscription' });
  }
};

/**
 * @desc    Get carryover stats for a user (testing)
 * @route   GET /api/admin/subscriptions/carryover/:userId
 * @access  Admin
 */
export const getCarryoverStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const user = await User.findById(userId).lean();
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const product = await Product.findOne({ productId: user.subscriptionPlan }).lean();

    res.json({
      success: true,
      userId: user._id,
      email: user.email,
      name: user.name,
      subscriptionPlan: user.subscriptionPlan,
      product: product
        ? {
            productId: product.productId,
            name: product.name,
            listingsLimit: product.listingsLimit,
            billingPeriod: product.billingPeriod,
            tier: product.tier,
          }
        : null,
      monthlyListing: {
        listingsCreatedThisMonth: user.subscription?.listingsCreatedThisMonth ?? 0,
        monthResetDate: user.subscription?.monthResetDate ?? null,
      },
      activeListingsCount: user.subscription?.activeListingsCount ?? 0,
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting carryover stats:', error);
    res.status(500).json({ message: 'Error getting carryover stats' });
  }
};

/**
 * @desc    Manually trigger subscription renewal (for testing carryover)
 * @route   POST /api/admin/subscriptions/trigger-renewal/:userId
 * @access  Admin
 */
export const triggerSubscriptionRenewal = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.subscription) {
      res.status(400).json({ message: 'User has no subscription' });
      return;
    }

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'grace', 'pending_cancellation'] },
    });

    if (!subscription) {
      res.status(404).json({ message: 'No active subscription found' });
      return;
    }

    const product = await Product.findOne({ productId: subscription.productId });
    if (!product) {
      res.status(404).json({ message: `Product not found: ${subscription.productId}` });
      return;
    }

    // Calculate new expiration date
    const newExpirationDate = new Date();
    if (product.billingPeriod === 'yearly') {
      newExpirationDate.setFullYear(newExpirationDate.getFullYear() + 1);
    } else {
      newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);
    }

    // Update subscription
    subscription.expirationDate = newExpirationDate;
    subscription.renewalDate = newExpirationDate;
    subscription.status = 'active';
    subscription.autoRenewing = true;
    subscription.lastUpdated = new Date();
    await subscription.save();

    // Reset monthly counter on renewal
    user.subscription.listingsCreatedThisMonth = 0;
    user.subscription.monthResetDate = new Date();

    user.markModified('subscription');
    await user.save();

    // Fetch updated user
    const updatedUser = await User.findById(userId).lean();

    res.json({
      success: true,
      message: 'Subscription renewal triggered successfully',
      subscription: {
        expirationDate: subscription.expirationDate,
        status: subscription.status,
      },
      monthlyListing: {
        listingsCreatedThisMonth: updatedUser?.subscription?.listingsCreatedThisMonth ?? 0,
        monthResetDate: updatedUser?.subscription?.monthResetDate ?? null,
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error triggering renewal:', error);
    res.status(500).json({ message: 'Error triggering renewal', error: error.message });
  }
};

/**
 * @desc    Update monthly listing fields directly (for testing)
 * @route   PATCH /api/admin/subscriptions/monthly-listing/:userId
 * @access  Admin
 */
export const updateCarryoverFields = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getObjectIdParam(req, res, 'userId');
    if (!userId) return;

    const {
      listingsCreatedThisMonth,
      monthResetDate,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    if (!user.subscription) {
      res.status(400).json({ message: 'User has no subscription' });
      return;
    }

    // Update only provided fields
    if (listingsCreatedThisMonth !== undefined) {
      user.subscription.listingsCreatedThisMonth = listingsCreatedThisMonth;
    }
    if (monthResetDate !== undefined) {
      user.subscription.monthResetDate = new Date(monthResetDate);
    }

    user.markModified('subscription');
    await user.save();

    res.json({
      success: true,
      message: 'Monthly listing fields updated',
      monthlyListing: {
        listingsCreatedThisMonth: user.subscription?.listingsCreatedThisMonth ?? 0,
        monthResetDate: user.subscription?.monthResetDate ?? null,
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error updating monthly listing fields:', error);
    res.status(500).json({ message: 'Error updating monthly listing fields' });
  }
};

/**
 * @desc    Get Product configuration (for understanding tier limits)
 * @route   GET /api/admin/subscriptions/product-config/:productId
 * @access  Admin
 */
export const getProductConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    if (!productId) {
      res.status(400).json({ message: 'productId is required' });
      return;
    }

    const product = await Product.findOne({ productId }).lean();
    if (!product) {
      res.status(404).json({ message: `Product not found: ${productId}` });
      return;
    }

    res.json({
      success: true,
      product: {
        productId: product.productId,
        name: product.name,
        tier: product.tier,
        listingsLimit: product.listingsLimit,
        billingPeriod: product.billingPeriod,
        price: product.price,
        currency: product.currency,
        isActive: product.isActive,
        isVisible: product.isVisible,
        promotionCoupons: product.promotionCoupons,
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting product config:', error);
    res.status(500).json({ message: 'Error getting product config' });
  }
};

/**
 * @desc    List all products (for testing)
 * @route   GET /api/admin/subscriptions/products
 * @access  Admin
 */
export const getAllProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({}).lean() as any[];

    res.json({
      success: true,
      products: products.map((p: any) => ({
        productId: p.productId,
        name: p.name,
        tier: p.tier,
        listingsLimit: p.listingsLimit,
        billingPeriod: p.billingPeriod,
        price: p.price,
        isActive: p.isActive,
        isVisible: p.isVisible,
      })),
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error getting products:', error);
    res.status(500).json({ message: 'Error getting products' });
  }
};

/**
 * @desc    Update user's monthly listing counter
 * @route   PATCH /api/admin/users/:userId/listing-counter
 * @access  Admin
 * @body    { listingsCreatedThisMonth: number, resetMonth: boolean }
 */
/**
 * @desc    Update user's monthly listing counter
 * @route   PATCH /api/admin/users/:userId/listing-counter
 * @access  Admin
 * @body    { listingsCreatedThisMonth: number, resetMonth: boolean }
 *
 * IMPORTANT: Only explicit value changes are allowed. No automatic resets.
 * If resetMonth is true, monthResetDate is updated to current date.
 * Changes are reflected immediately in database and cached invalidated.
 */
export const updateUserListingCounter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { listingsCreatedThisMonth, resetMonth } = req.body;

    // ===== VALIDATION =====
    // 1. Validate userId format
    const userIdStr = typeof userId === 'string' ? userId : String(userId);
    if (!userIdStr || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
      });
      return;
    }

    // 2. Validate listingsCreatedThisMonth
    if (typeof listingsCreatedThisMonth !== 'number') {
      res.status(400).json({
        success: false,
        message: 'listingsCreatedThisMonth must be a number',
      });
      return;
    }

    if (!Number.isInteger(listingsCreatedThisMonth)) {
      res.status(400).json({
        success: false,
        message: 'listingsCreatedThisMonth must be a whole number',
      });
      return;
    }

    if (listingsCreatedThisMonth < 0) {
      res.status(400).json({
        success: false,
        message: 'listingsCreatedThisMonth cannot be negative',
      });
      return;
    }

    if (listingsCreatedThisMonth > 999) {
      res.status(400).json({
        success: false,
        message: 'listingsCreatedThisMonth cannot exceed 999',
      });
      return;
    }

    // 3. Validate resetMonth flag
    if (typeof resetMonth !== 'boolean' && resetMonth !== undefined) {
      res.status(400).json({
        success: false,
        message: 'resetMonth must be a boolean',
      });
      return;
    }

    // ===== FETCH USER =====
    const user = await User.findById(userIdStr);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // ===== CHECK FOR CHANGES =====
    const currentCounter = user.subscription?.listingsCreatedThisMonth ?? 0;
    const hasCounterChanged = listingsCreatedThisMonth !== currentCounter;
    const hasResetRequested = resetMonth === true;

    if (!hasCounterChanged && !hasResetRequested) {
      res.status(400).json({
        success: false,
        message: 'No changes to apply. Counter and reset flag are the same.',
      });
      return;
    }

    // ===== BUILD UPDATE OBJECT =====
    const updateData: Record<string, any> = {};

    if (hasCounterChanged) {
      updateData['subscription.listingsCreatedThisMonth'] = Math.floor(listingsCreatedThisMonth);
    }

    if (hasResetRequested) {
      updateData['subscription.monthResetDate'] = new Date();
    }

    // ===== UPDATE DATABASE =====
    const updatedUser = await User.findByIdAndUpdate(
      userIdStr,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
      });
      return;
    }

    // ===== INVALIDATE CACHE =====
    invalidateCache(`/api/auth/me/${userIdStr}`);
    invalidateCache(`/api/auth/user/${userIdStr}`);
    invalidateCache('/api/admin/subscriptions');

    // ===== AUDIT LOG =====
    adminLogger.info('[Admin] Updated user listing counter', {
      adminId: (req.user as any)?._id,
      adminEmail: (req.user as any)?.email,
      userId: userIdStr,
      userEmail: user.email,
      changes: {
        counterChanged: hasCounterChanged,
        previousCounter: currentCounter,
        newCounter: listingsCreatedThisMonth,
        resetMonthDate: hasResetRequested,
      },
      timestamp: new Date().toISOString(),
    });

    // ===== RETURN SUCCESS RESPONSE =====
    res.status(200).json({
      success: true,
      message: 'Listing counter updated successfully',
      user: {
        id: String(updatedUser._id),
        email: updatedUser.email,
        name: updatedUser.name,
        subscription: {
          tier: updatedUser.subscription?.tier,
          listingsCreatedThisMonth: updatedUser.subscription?.listingsCreatedThisMonth || 0,
          monthResetDate: updatedUser.subscription?.monthResetDate,
          listingsLimit: updatedUser.subscription?.listingsLimit,
          activeListingsCount: updatedUser.subscription?.activeListingsCount,
        },
      },
    });
  } catch (error: any) {
    adminLogger.error('[Admin] Error updating user listing counter', {
      userId: req.params.userId,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Error updating listing counter: ' + (error.message || 'Unknown error'),
    });
  }
};

export default {
  getAllSubscriptions,
  getSubscriptionById,
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  activateUserSubscription,
  cancelSubscription,
  deactivateUserSubscription,
  adjustListingLimit,
  adjustAgencyListingLimit,
  activateAgencySubscription,
  deactivateAgencySubscription,
  getAgencySubscriptionHistory,
  manageUserSubscription,
  getCarryoverStats,
  updateUserListingCounter,
  triggerSubscriptionRenewal,
  updateCarryoverFields,
  getProductConfig,
  getAllProducts,
};
