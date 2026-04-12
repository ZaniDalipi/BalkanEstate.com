import { IUser } from '../models/User';
import User from '../models/User';
import Product from '../models/Product';
import Property from '../models/Property';
import { logger } from '../utils/logger';

/**
 * Listing Limit Service
 *
 * Simple model: Users get X listings per month, old listings stay active.
 * After 1 year, archive old listings and reset the cycle.
 *
 * Example:
 * - Month 1: can have 30 active listings
 * - Month 2: can have 60 active listings (30 old + 30 new)
 * - Month 12: can have 360 active listings (annual cap)
 * - After 365 days: archive old listings, reset cycle
 */

class ListingLimitService {
  /**
   * Get monthly allowance from Product
   */
  async getMonthlyAllowance(productId: string): Promise<number> {
    if (!productId) throw new Error('productId is required');

    const product = await Product.findOne({ productId }).lean();
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    return product.listingsLimit || 0;
  }

  /**
   * Calculate max allowed listings based on months in current subscription cycle
   *
   * Example:
   * - 30 listings/month × 1 month = 30 max
   * - 30 listings/month × 6 months = 180 max
   * - 30 listings/month × 12 months = 360 max (annual cap)
   */
  getMaxAllowedListings(
    cycleStartDate: Date | undefined,
    monthlyAllowance: number
  ): number {
    if (!cycleStartDate) {
      return monthlyAllowance; // Default to 1 month if no start date
    }

    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - cycleStartDate.getTime()) / (24 * 60 * 60 * 1000));
    const monthsElapsed = Math.floor(daysSinceStart / 30); // ~30 days per month

    // Cap at 12 months = annual limit
    const effectiveMonths = Math.min(monthsElapsed + 1, 12);

    return effectiveMonths * monthlyAllowance;
  }

  /**
   * Check if user can create a new listing
   */
  async canCreateListing(userId: string): Promise<boolean> {
    const user = await User.findById(userId).lean();
    if (!user?.subscription || !user.subscriptionPlan) {
      return false;
    }

    const monthlyAllowance = await this.getMonthlyAllowance(user.subscriptionPlan);
    const maxAllowed = this.getMaxAllowedListings(user.subscription.subscriptionCycleStartDate, monthlyAllowance);
    const activeCount = user.subscription.activeListingsCount || 0;

    return activeCount < maxAllowed;
  }

  /**
   * Check if annual cycle is complete (365+ days since start)
   */
  isAnnualCycleComplete(user: IUser): boolean {
    if (!user?.subscription?.subscriptionCycleEndDate) {
      return false;
    }

    const cycleEndDate = new Date(user.subscription.subscriptionCycleEndDate);
    const now = new Date();

    return now >= cycleEndDate;
  }

  /**
   * Apply annual reset: archive old listings, reset cycle
   *
   * Archived listings:
   * - Older than 90 days from now
   * - User can see them in profile but they won't be visible to buyers
   * - User can unarchive if needed
   */
  async applyAnnualReset(userId: string): Promise<{ success: boolean; error?: string; archivedCount?: number }> {
    try {
      if (!userId) {
        return { success: false, error: 'User ID is required' };
      }

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (!user.subscription) {
        return { success: false, error: 'No subscription found' };
      }

      // Archive listings older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const result = await Property.updateMany(
        {
          owner: user._id,
          createdAt: { $lt: cutoffDate },
          status: { $ne: 'archived' },
        },
        { status: 'archived' }
      );

      const archivedCount = result.modifiedCount || 0;

      // Send notification if listings were archived
      if (archivedCount > 0 && !user.subscription.archiveNotificationSent) {
        try {
          const { sendEmail: emailSender } = await import('./emailService');
          await emailSender({
            to: user.email,
            subject: 'Your Listings Have Been Archived',
            html: `
              <h2>Listings Archived</h2>
              <p>Hi ${user.name},</p>
              <p>We've archived ${archivedCount} of your listings that are older than 90 days to keep your profile clean.</p>
              <p>These listings are no longer visible to buyers, but you can reactivate them from your dashboard if needed.</p>
              <p>Your recent listings (from the last 3 months) remain active and visible.</p>
              <p>Best regards,<br/>BalkanEstate Team</p>
            `,
          });
          user.subscription.archiveNotificationSent = true;
        } catch (emailError) {
          logger.warn('Failed to send archive notification', { userId, error: emailError });
          // Don't fail the reset if email fails
        }
      }

      // Reset the annual cycle
      const now = new Date();
      user.subscription.subscriptionCycleStartDate = now;
      user.subscription.subscriptionCycleEndDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      user.subscription.lastListingsArchiveDate = new Date();
      user.subscription.archiveNotificationSent = false;

      user.markModified('subscription');
      await user.save();

      logger.info('Annual reset applied', {
        userId,
        archivedCount,
        newCycleStart: user.subscription.subscriptionCycleStartDate,
      });

      return { success: true, archivedCount };
    } catch (error: any) {
      logger.error('Error applying annual reset', { userId, error: error?.message });
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}

export default new ListingLimitService();
