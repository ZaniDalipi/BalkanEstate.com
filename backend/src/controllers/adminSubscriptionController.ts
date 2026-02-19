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
import { adminLogger } from '../utils/logger';
import { invalidateCache } from '../middleware/cache';

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
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
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
    const { id } = req.params;

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
      query.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { storeTransactionId: { $regex: search, $options: 'i' } },
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
    const { id } = req.params;

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
    user.isSubscribed = true;
    user.subscriptionStatus = 'active';
    user.subscriptionPlan = planName.toLowerCase().replace(/\s+/g, '_');
    user.subscriptionProductName = planName;
    user.subscriptionSource = 'web';
    user.subscriptionExpiresAt = expiresAt;
    user.subscriptionStartedAt = new Date();
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
    const { id } = req.params;
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
    const { userId } = req.params;
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

    // Update unified subscription object
    if (user.subscription) {
      user.subscription.listingsLimit = newLimit;
      user.markModified('subscription');
    }
    // Also update legacy field if present
    if (user.listingsLimit !== undefined) {
      user.listingsLimit = newLimit;
    }

    await user.save();

    // Audit trail
    await SubscriptionEvent.create({
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

export default {
  getAllSubscriptions,
  getSubscriptionById,
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  activateUserSubscription,
  cancelSubscription,
  adjustListingLimit,
};
