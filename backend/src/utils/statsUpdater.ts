import User from '../models/User';
import Property from '../models/Property';
import Conversation from '../models/Conversation';
import { apiLogger } from './logger';

/**
 * Initialize stats object for a user if it doesn't exist
 */
export const initializeUserStats = async (userId: string): Promise<void> => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      apiLogger.error(`User not found: ${userId}`);
      return;
    }

    // Check if stats object exists and has all required fields
    if (!user.stats ||
        user.stats.totalViews === undefined ||
        user.stats.totalSaves === undefined ||
        user.stats.totalInquiries === undefined ||
        user.stats.propertiesSold === undefined ||
        user.stats.totalSalesValue === undefined ||
        user.stats.activeListings === undefined ||
        user.stats.rating === undefined) {

      await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            stats: {
              totalViews: user.stats?.totalViews || 0,
              totalSaves: user.stats?.totalSaves || 0,
              totalInquiries: user.stats?.totalInquiries || 0,
              propertiesSold: user.stats?.propertiesSold || 0,
              totalSalesValue: user.stats?.totalSalesValue || 0,
              activeListings: user.stats?.activeListings || 0,
              rating: user.stats?.rating || 0,
              lastUpdated: new Date()
            }
          }
        }
      );

      apiLogger.info(`Stats initialized for user ${userId}`);
    }
  } catch (error) {
    apiLogger.error('Error initializing user stats:', error);
  }
};

/**
 * Increment property view count for a seller
 */
export const incrementViewCount = async (sellerId: string, count: number = 1): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.totalViews': count },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error incrementing view count:', error);
  }
};

/**
 * Increment property save/favorite count for a seller
 */
export const incrementSaveCount = async (sellerId: string, count: number = 1): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.totalSaves': count },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error incrementing save count:', error);
  }
};

/**
 * Decrement property save count for a seller (when unfavorited)
 */
export const decrementSaveCount = async (sellerId: string, count: number = 1): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.totalSaves': -count },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error decrementing save count:', error);
  }
};

/**
 * Increment inquiry/conversation count for a seller
 */
export const incrementInquiryCount = async (sellerId: string, count: number = 1): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.totalInquiries': count },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error incrementing inquiry count:', error);
  }
};

/**
 * Update sold property statistics
 */
export const updateSoldStats = async (sellerId: string, propertyPrice: number): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: {
          'stats.propertiesSold': 1,
          'stats.totalSalesValue': propertyPrice,
          'stats.activeListings': -1 // Decrease active listings when sold
        },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error updating sold stats:', error);
  }
};

/**
 * Update active listings count when a property is created
 */
export const incrementActiveListings = async (sellerId: string): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.activeListings': 1 },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error incrementing active listings:', error);
  }
};

/**
 * Update active listings count when a property is deleted or deactivated
 */
export const decrementActiveListings = async (sellerId: string): Promise<void> => {
  try {
    await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: { 'stats.activeListings': -1 },
        $set: { 'stats.lastUpdated': new Date() }
      }
    );
  } catch (error) {
    apiLogger.error('Error decrementing active listings:', error);
  }
};

/**
 * Sync all statistics for a user (recalculates from properties and conversations)
 * Use this for initial setup or fixing discrepancies
 */
export const syncUserStats = async (userId: string): Promise<void> => {
  try {
    // Fetch all user properties
    const properties = await Property.find({ sellerId: userId });

    // Calculate statistics
    const totalViews = properties.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalSaves = properties.reduce((sum, p) => sum + (p.saves || 0), 0);
    const soldProperties = properties.filter(p => p.status === 'sold');
    const activeProperties = properties.filter(p => p.status === 'active');
    const propertiesSold = soldProperties.length;
    const activeListings = activeProperties.length;
    const totalSalesValue = soldProperties.reduce((sum, p) => sum + p.price, 0);

    // Get total inquiries from conversations
    const totalInquiries = await Conversation.countDocuments({ sellerId: userId });

    // Calculate rating from Agent testimonials if the user is an agent.
    // The Agent model stores testimonials with individual ratings and has a pre-save
    // hook that computes the average (see Agent.calculateAverageRating).
    // We read the already-computed rating from the Agent document if available.
    let rating = 0;
    const agentDoc = await (await import('../models/Agent')).default.findOne({ userId }).select('rating').lean();
    if (agentDoc && typeof agentDoc.rating === 'number' && agentDoc.rating > 0) {
      rating = agentDoc.rating;
    }

    // Update user stats
    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          stats: {
            totalViews,
            totalSaves,
            totalInquiries,
            propertiesSold,
            totalSalesValue,
            activeListings,
            rating,
            lastUpdated: new Date()
          }
        }
      }
    );

    apiLogger.info(`Stats synced for user ${userId}: ${activeListings} active listings, ${propertiesSold} sold`);
  } catch (error) {
    apiLogger.error('Error syncing user stats:', error);
    throw error;
  }
};

/**
 * Batch sync stats for all sellers (agents and private sellers)
 */
export const syncAllSellerStats = async (): Promise<void> => {
  try {
    const sellers = await User.find({
      role: { $in: ['agent', 'private_seller'] }
    });

    apiLogger.info(`Syncing stats for ${sellers.length} sellers...`);

    for (const seller of sellers) {
      await syncUserStats(String(seller._id));
    }

    apiLogger.info('All seller stats synced successfully');
  } catch (error) {
    apiLogger.error('Error syncing all seller stats:', error);
    throw error;
  }
};
