import { IUser } from '../models/User';
import Product from '../models/Product';
import { logger } from '../utils/logger';

/**
 * Deprecated: Listing Carryover Service
 *
 * This service has been replaced by the simpler listingLimitService.
 * Kept for backwards compatibility but all methods are deprecated.
 * DO NOT USE - Use listingLimitService instead.
 */

class ListingCarryoverService {
  /**
   * DEPRECATED: Use listingLimitService.getMonthlyAllowance instead
   */
  async getMonthlyAllowance(productId: string): Promise<number> {
    try {
      if (!productId) throw new Error('productId is required');

      const product = await Product.findOne({ productId, isActive: true }).lean();
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
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
   * DEPRECATED: Not used in new monthly reset model
   */
  async refreshMonthlyAllowance(userId: string): Promise<{ success: boolean; error?: string; user?: IUser }> {
    logger.warn('refreshMonthlyAllowance called - this method is deprecated');
    return {
      success: false,
      error: 'This method is deprecated. Use listingLimitService instead.',
    };
  }

  /**
   * DEPRECATED: Not used in new monthly reset model
   */
  async applyAnnualReset(userId: string): Promise<{ success: boolean; error?: string; archivedCount?: number }> {
    logger.warn('applyAnnualReset called - this method is deprecated');
    return {
      success: false,
      error: 'This method is deprecated. Use listingLimitService instead.',
    };
  }

  /**
   * DEPRECATED: Not used in new monthly reset model
   */
  isAnnualCycleComplete(user: IUser): boolean {
    logger.warn('isAnnualCycleComplete called - this method is deprecated');
    return false;
  }
}

export default new ListingCarryoverService();
