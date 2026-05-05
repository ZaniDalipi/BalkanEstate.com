import User from '../models/User';
import Product from '../models/Product';
import { logger } from '../utils/logger';

/**
 * Listing Limit Service
 *
 * Monthly reset model: Users get X listings per month.
 * At calendar month boundary, counter resets to 0.
 * Old listings stay active indefinitely (no archiving).
 *
 * Example:
 * - Monthly allowance: 30 listings
 * - January: 5 created (under limit)
 * - February: counter resets to 0, can create 30 more
 * - Old listings from January stay active
 */

class ListingLimitService {
  /**
   * Get monthly listing allowance for a subscription product
   * @param productId - Product ID (e.g., 'pro_monthly', 'agency_monthly')
   * @returns Monthly allowance count
   * @throws Error if product not found or has no valid allowance
   */
  async getMonthlyAllowance(productId: string): Promise<number> {
    try {
      if (!productId) {
        throw new Error('productId is required');
      }

      const product = await Product.findOne({
        productId,
        isActive: true,
      }).lean();

      if (!product) {
        throw new Error(`Product not found for productId: ${productId}`);
      }

      const allowance = product.listingsLimit || 0;

      if (allowance <= 0) {
        throw new Error(`Product ${productId} has no valid listings allowance configured`);
      }

      return allowance;
    } catch (error) {
      logger.error('Error getting monthly allowance', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if a calendar month boundary has passed since last reset
   * @param lastResetDate - When monthly counter was last reset
   * @returns true if month/year has changed, false otherwise
   */
  isMonthBoundaryPassed(lastResetDate: Date | undefined): boolean {
    if (!lastResetDate) {
      return true; // If no reset date, treat as boundary passed
    }

    const now = new Date();
    return (
      now.getMonth() !== lastResetDate.getMonth() ||
      now.getFullYear() !== lastResetDate.getFullYear()
    );
  }

  /**
   * Check if user can create a listing this month
   * @param userId - User ID
   * @returns true if under monthly limit, false otherwise
   */
  async canCreateListing(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        return false;
      }

      const user = await User.findById(userId).lean();
      if (!user?.subscription || !user.subscriptionPlan) {
        return false;
      }

      // Prefer stored subscription limit (may be admin-overridden) over product default
      const monthlyAllowance = user.subscription.listingsLimit ||
        await this.getMonthlyAllowance(user.subscriptionPlan);

      // Get current month's creation count
      let listingsCreatedThisMonth = user.subscription.listingsCreatedThisMonth || 0;

      // Check if month boundary has passed
      if (this.isMonthBoundaryPassed(user.subscription.monthResetDate)) {
        listingsCreatedThisMonth = 0;
      }

      // Can create if under limit
      return listingsCreatedThisMonth < monthlyAllowance;
    } catch (error) {
      logger.error('Error checking if can create listing', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get monthly listing usage stats for a user
   * @param userId - User ID
   * @returns { monthlyAllowance, created, remaining, percentage }
   */
  async getMonthlyUsage(userId: string): Promise<{
    monthlyAllowance: number;
    created: number;
    remaining: number;
    percentage: number;
  }> {
    try {
      const user = await User.findById(userId).lean();
      if (!user?.subscription || !user.subscriptionPlan) {
        throw new Error('User subscription not found');
      }

      // Prefer stored subscription limit (may be admin-overridden) over product default
      const monthlyAllowance = user.subscription.listingsLimit ||
        await this.getMonthlyAllowance(user.subscriptionPlan);
      let created = user.subscription.listingsCreatedThisMonth || 0;

      // Reset counter if month boundary passed
      if (this.isMonthBoundaryPassed(user.subscription.monthResetDate)) {
        created = 0;
      }

      const remaining = Math.max(0, monthlyAllowance - created);
      const percentage = Math.min(100, (created / monthlyAllowance) * 100);

      return {
        monthlyAllowance,
        created,
        remaining,
        percentage,
      };
    } catch (error) {
      logger.error('Error getting monthly usage', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Reset monthly counter for a user (called by cron job at month boundary)
   * @param userId - User ID
   */
  async resetMonthlyCounter(userId: string): Promise<void> {
    try {
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            'subscription.listingsCreatedThisMonth': 0,
            'subscription.monthResetDate': new Date(),
          },
        }
      );

      logger.info('Monthly counter reset', { userId });
    } catch (error) {
      logger.error('Error resetting monthly counter', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default new ListingLimitService();
