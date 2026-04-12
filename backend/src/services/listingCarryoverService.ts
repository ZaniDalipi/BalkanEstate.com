import { IUser } from '../models/User';
import User from '../models/User';
import Product from '../models/Product';
import { logger } from '../utils/logger';

/**
 * Listing Carryover & Annual Cap System Service
 *
 * Manages monthly carryover of unused listing allowances and annual accumulation caps.
 * Follows architecture: Domain logic → Service layer → Controller
 * Error handling: Try-catch with logging and Result pattern
 * Validation: Input checks at service level
 */

interface CarryoverResult {
  success: boolean;
  error?: string;
  user?: IUser;
}

class ListingCarryoverService {
  /**
   * Get monthly listing allowance from Product by productId
   * @param productId - The product ID (e.g., 'pro_monthly', 'agency_monthly')
   * @throws Error if productId is missing or product not found
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

      return product.listingsLimit || 0;
    } catch (error) {
      logger.error('Error getting monthly allowance', {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate effective listing limit (respects annual cap)
   * Returns the minimum of available listings and remaining annual allowance
   */
  getEffectiveListingLimit(
    user: IUser,
    monthlyAllowance: number,
  ): number {
    try {
      if (!user?.subscription) {
        throw new Error('User subscription not found');
      }

      const listingsAllowanceYTD = user.subscription.listingsAllowanceYTD || 0;
      const annualCap = monthlyAllowance * 12; // 12-month cap
      const remainingAnnualAllowance = Math.max(0, annualCap - listingsAllowanceYTD);

      return remainingAnnualAllowance;
    } catch (error) {
      logger.error('Error calculating effective limit', {
        userId: user?._id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Refresh monthly listing allowance on subscription renewal
   * - Carry over unused listings from previous month
   * - Add new month's allocation
   * - Track cumulative YTD total
   */
  async refreshMonthlyAllowance(userId: string): Promise<CarryoverResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required',
        };
      }

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.subscription) {
        return {
          success: false,
          error: 'No subscription found',
        };
      }

      // Validate subscriptionPlan exists
      const subscriptionPlan = (user as any).subscriptionPlan;
      if (!subscriptionPlan) {
        return {
          success: false,
          error: 'No subscriptionPlan found on user',
        };
      }

      // Get current productId's monthly allowance from Product
      const monthlyAllowance = await this.getMonthlyAllowance(subscriptionPlan);

      // Calculate carryover: unused from previous month
      const previousMonthListingsCreated = user.subscription.listingsCreatedThisMonth || 0;
      const previousMonthAllowance = user.subscription.listingsAllowanceThisMonth || monthlyAllowance;
      const previousMonthUnused = Math.max(0, previousMonthAllowance - previousMonthListingsCreated);

      // Carryover is carried forward automatically (no 50% penalty)
      const carryoverListings = previousMonthUnused;

      // Update subscription with new month's numbers
      user.subscription.listingsAllowanceThisMonth = monthlyAllowance;
      user.subscription.carryoverListings = carryoverListings;
      user.subscription.listingsCreatedThisMonth = 0;

      // Increment YTD cumulative allowance (for annual cap tracking)
      user.subscription.listingsAllowanceYTD =
        (user.subscription.listingsAllowanceYTD || 0) + monthlyAllowance;

      await user.save();

      logger.info('Monthly allowance refreshed', {
        userId,
        monthlyAllowance,
        carryoverListings,
        listingsAllowanceYTD: user.subscription.listingsAllowanceYTD,
      });

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error('Error refreshing monthly allowance', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply annual reset when subscription cycle completes (365 days)
   * - Archive listings created before 90 days ago
   * - Send notification email to user
   * - Reset counters for new cycle
   */
  async applyAnnualReset(userId: string): Promise<CarryoverResult> {
    try {
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required',
        };
      }

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.subscription) {
        return {
          success: false,
          error: 'No subscription found',
        };
      }

      // Validate subscriptionPlan exists
      const subscriptionPlan = (user as any).subscriptionPlan;
      if (!subscriptionPlan) {
        return {
          success: false,
          error: 'No subscriptionPlan found on user',
        };
      }

      // Get monthly allowance for this productId
      const monthlyAllowance = await this.getMonthlyAllowance(subscriptionPlan);

      // Calculate cutoff date: 90 days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      // Archive listings older than 90 days
      const Property = (await import('../models/Property')).default;
      const archivedCount = await Property.updateMany(
        {
          owner: user._id,
          createdAt: { $lt: cutoffDate },
          status: { $ne: 'archived' }, // Don't re-archive
        },
        { status: 'archived' },
      );

      // Send notification email if listings were archived
      if (archivedCount.modifiedCount > 0 && !user.subscription.archiveNotificationSent) {
        await this.sendArchiveNotification(user, archivedCount.modifiedCount);
      }

      // Reset for new annual cycle
      user.subscription.listingsAllowanceThisMonth = monthlyAllowance;
      user.subscription.listingsAllowanceYTD = monthlyAllowance; // Start fresh YTD
      user.subscription.carryoverListings = 0;
      user.subscription.listingsCreatedThisMonth = 0;
      user.subscription.subscriptionCycleStartDate = new Date();
      user.subscription.subscriptionCycleEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      user.subscription.lastListingsArchiveDate = new Date();
      user.subscription.archiveNotificationSent = false; // Reset for next cycle

      await user.save();

      logger.info('Annual reset applied', {
        userId,
        archivedCount: archivedCount.modifiedCount,
        monthlyAllowance,
        newCycleStart: user.subscription.subscriptionCycleStartDate,
        newCycleEnd: user.subscription.subscriptionCycleEndDate,
      });

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error('Error applying annual reset', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email notification about archived listings
   * User receives notification about listings >90 days old being archived
   */
  private async sendArchiveNotification(
    user: IUser,
    archivedCount: number,
  ): Promise<void> {
    try {
      // Import email service
      const { sendEmail } = await import('./emailService');

      const subject = 'Your Old Listings Have Been Archived';
      const html = `
        <h2>Listings Archived</h2>
        <p>Hi ${user.name},</p>
        <p>We've archived ${archivedCount} of your listings that are older than 90 days to save storage space.</p>
        <p>These listings are no longer visible to buyers, but you can reactivate them anytime from your dashboard.</p>
        <p>Your recent listings (from the last 3 months) remain active and visible.</p>
        <p>Best regards,<br/>BalkanEstate Team</p>
      `;

      await sendEmail({
        to: user.email,
        subject,
        html,
      });

      // Mark notification as sent
      user.subscription!.archiveNotificationSent = true;
      await user.save();

      logger.info('Archive notification sent', {
        userId: user._id,
        email: user.email,
        archivedCount,
      });
    } catch (error) {
      logger.error('Error sending archive notification', {
        userId: user._id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - archive should succeed even if email fails
    }
  }

  /**
   * Check if annual cycle is complete
   * Returns true if subscription cycle has reached 365 days
   */
  isAnnualCycleComplete(user: IUser): boolean {
    try {
      if (!user?.subscription?.subscriptionCycleEndDate) {
        return false;
      }

      const cycleEndDate = new Date(user.subscription.subscriptionCycleEndDate);
      const now = new Date();

      return now >= cycleEndDate;
    } catch (error) {
      logger.error('Error checking annual cycle', {
        userId: user?._id,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Check if user can create a listing based on current month's allowance
   */
  async canCreateListing(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        return false;
      }

      const user = await User.findById(userId).lean();
      if (!user?.subscription) {
        return false;
      }

      // Get subscriptionPlan (productId)
      const subscriptionPlan = (user as any).subscriptionPlan;
      if (!subscriptionPlan) {
        return false;
      }

      // Get current month's allowance
      const monthlyAllowance = await this.getMonthlyAllowance(subscriptionPlan);
      const effectiveLimit = this.getEffectiveListingLimit(user as any, monthlyAllowance);

      // Get listings created this month
      const listingsCreatedThisMonth = user.subscription.listingsCreatedThisMonth || 0;

      // Can create if under the effective limit
      return listingsCreatedThisMonth < effectiveLimit;
    } catch (error) {
      logger.error('Error checking if can create listing', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export default new ListingCarryoverService();
