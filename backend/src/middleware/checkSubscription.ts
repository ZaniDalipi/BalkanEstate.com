import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

/**
 * Middleware to check if user has an active subscription
 * Use this to protect premium features
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        message: 'Authentication required',
        requiresAuth: true,
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if subscription is active
    if (!user.hasActiveSubscription()) {
      res.status(403).json({
        message: 'Active subscription required',
        subscriptionRequired: true,
        subscriptionStatus: user.subscriptionStatus || 'none',
        expiresAt: user.subscriptionExpiresAt,
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Error checking subscription status' });
  }
};

/**
 * Middleware to check if user can access premium features (includes grace period)
 */
export const requirePremiumAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        message: 'Authentication required',
        requiresAuth: true,
      });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check premium access (includes grace period)
    if (!user.canAccessPremiumFeatures()) {
      res.status(403).json({
        message: 'Premium subscription required or expired',
        subscriptionRequired: true,
        subscriptionStatus: user.subscriptionStatus || 'none',
        expiresAt: user.subscriptionExpiresAt,
        inGracePeriod: user.subscriptionStatus === 'grace',
      });
      return;
    }

    next();
  } catch (error: any) {
    console.error('Premium access check error:', error);
    res.status(500).json({ message: 'Error checking premium access' });
  }
};

/**
 * Middleware to add subscription info to request
 * Use this to get subscription data without enforcing it
 */
export const addSubscriptionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?._id;

    if (userId) {
      const user = await User.findById(userId).select(
        'isSubscribed subscriptionPlan subscriptionExpiresAt subscriptionStatus activeSubscriptionId'
      );

      if (user) {
        (req as any).subscription = {
          isSubscribed: user.isSubscribed,
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          status: user.subscriptionStatus,
          subscriptionId: user.activeSubscriptionId,
          hasActive: user.hasActiveSubscription(),
          canAccessPremium: user.canAccessPremiumFeatures(),
        };
      }
    }

    next();
  } catch (error: any) {
    // Don't fail the request, just log the error
    console.error('Error adding subscription info:', error);
    next();
  }
};
