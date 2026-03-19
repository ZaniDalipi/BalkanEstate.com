import { Request, Response } from 'express';
import { IUser } from '../models/User';
import pushService from '../services/pushNotificationService';
import { apiLogger } from '../utils/logger';

// Maximum push subscriptions per user (prevents device-spam abuse)
const MAX_SUBSCRIPTIONS_PER_USER = 5;

/**
 * @desc    Get VAPID public key for client-side push subscription
 * @route   GET /api/push/vapid-public-key
 * @access  Public
 */
export const getVapidPublicKey = (_req: Request, res: Response): void => {
  const key = pushService.getVapidPublicKey();
  if (!key) {
    res.status(503).json({ message: 'Push notifications are not configured' });
    return;
  }
  res.json({ publicKey: key });
};

/**
 * @desc    Subscribe to push notifications
 * @route   POST /api/push/subscribe
 * @access  Private
 */
export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { subscription } = req.body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ message: 'Invalid push subscription: endpoint and keys (p256dh, auth) are required' });
      return;
    }

    // Validate endpoint is a valid URL
    try {
      new URL(subscription.endpoint);
    } catch {
      res.status(400).json({ message: 'Invalid push subscription endpoint URL' });
      return;
    }

    // Enforce max subscriptions per user (skip check if updating existing endpoint)
    const existingSubs = await pushService.getUserSubscriptions(userId);
    const isUpdatingExisting = existingSubs.some(s => s.endpoint === subscription.endpoint);
    if (!isUpdatingExisting && existingSubs.length >= MAX_SUBSCRIPTIONS_PER_USER) {
      res.status(409).json({
        message: `Maximum of ${MAX_SUBSCRIPTIONS_PER_USER} devices allowed. Please remove an existing device first.`,
      });
      return;
    }

    const userAgent = req.headers['user-agent'];
    await pushService.saveSubscription(userId, subscription, userAgent);

    res.status(201).json({ success: true, message: 'Push subscription saved' });
  } catch (error: any) {
    apiLogger.error('Push subscribe error:', error);
    res.status(500).json({ message: 'Error saving push subscription' });
  }
};

/**
 * @desc    Unsubscribe from push notifications
 * @route   POST /api/push/unsubscribe
 * @access  Private
 */
export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { endpoint } = req.body;

    if (!endpoint) {
      res.status(400).json({ message: 'Endpoint is required' });
      return;
    }

    const removed = await pushService.removeSubscription(userId, endpoint);

    if (removed) {
      res.json({ success: true, message: 'Push subscription removed' });
    } else {
      res.status(404).json({ message: 'Subscription not found' });
    }
  } catch (error: any) {
    apiLogger.error('Push unsubscribe error:', error);
    res.status(500).json({ message: 'Error removing push subscription' });
  }
};

/**
 * @desc    Get push subscription status for current user
 * @route   GET /api/push/status
 * @access  Private
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const isSubscribed = await pushService.hasActiveSubscription(userId);

    res.json({ isSubscribed });
  } catch (error: any) {
    apiLogger.error('Push status error:', error);
    res.status(500).json({ message: 'Error checking push status' });
  }
};
