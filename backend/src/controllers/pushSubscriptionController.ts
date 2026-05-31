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

    // Validate endpoint is a valid HTTPS URL (push endpoints are always HTTPS)
    try {
      const url = new URL(subscription.endpoint);
      if (url.protocol !== 'https:') {
        res.status(400).json({ message: 'Invalid push subscription: endpoint must use HTTPS' });
        return;
      }
    } catch {
      res.status(400).json({ message: 'Invalid push subscription endpoint URL' });
      return;
    }

    // Validate p256dh and auth are non-empty base64url strings within expected length bounds
    const isValidBase64url = (s: string, minLen: number, maxLen: number): boolean =>
      typeof s === 'string' && s.length >= minLen && s.length <= maxLen && /^[A-Za-z0-9_-]+=*$/.test(s);

    if (!isValidBase64url(subscription.keys.p256dh, 86, 88)) {
      res.status(400).json({ message: 'Invalid push subscription: p256dh key format is invalid' });
      return;
    }
    if (!isValidBase64url(subscription.keys.auth, 22, 24)) {
      res.status(400).json({ message: 'Invalid push subscription: auth key format is invalid' });
      return;
    }

    // Enforce max subscriptions per user (skip check if updating existing endpoint)
    const existingSubs = await pushService.getUserSubscriptions(userId);
    const isUpdatingExisting = existingSubs.some(s => s.endpoint === subscription.endpoint);
    if (!isUpdatingExisting && existingSubs.length >= MAX_SUBSCRIPTIONS_PER_USER) {
      // Auto-evict oldest subscription to make room for the new device
      const sorted = [...existingSubs].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      await pushService.removeSubscription(userId, sorted[0].endpoint);
      apiLogger.info(`Auto-evicted oldest push subscription for user ${userId} to make room for new device`);
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

    if (!endpoint || typeof endpoint !== 'string') {
      res.status(400).json({ message: 'Endpoint is required' });
      return;
    }

    // Validate endpoint format to prevent NoSQL injection via crafted strings
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') {
        res.status(400).json({ message: 'Invalid endpoint' });
        return;
      }
    } catch {
      res.status(400).json({ message: 'Invalid endpoint' });
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
