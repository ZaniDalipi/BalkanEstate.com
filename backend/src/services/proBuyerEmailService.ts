/**
 * Pro Buyer Email Service
 *
 * Handles intelligent email delivery for pro buyers based on:
 * - User activity patterns (hot hours)
 * - Search behavior and preferences
 * - Property matches and price changes
 *
 * Features:
 * - Tracks user activity times to identify optimal email delivery windows
 * - Analyzes search patterns to send relevant property suggestions
 * - Sends price drop alerts for saved properties
 * - Delivers new listing alerts matching saved searches
 */

import User from '../models/User';
import Property from '../models/Property';
import SavedSearch from '../models/SavedSearch';
import { sendPropertyAlert, sendPriceDropAlert, sendNewListingsDigest } from './emailService';

// Track user activity patterns (in-memory, consider Redis for production)
interface UserActivityPattern {
  userId: string;
  activityHours: Map<number, number>; // hour (0-23) -> activity count
  lastSearchCriteria: SearchCriteria | null;
  lastActiveAt: Date;
}

interface SearchCriteria {
  city?: string;
  country?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
}

const userActivityPatterns = new Map<string, UserActivityPattern>();

/**
 * Track user activity for hot hours analysis
 */
export const trackUserActivity = (userId: string, searchCriteria?: SearchCriteria): void => {
  const currentHour = new Date().getHours();

  let pattern = userActivityPatterns.get(userId);
  if (!pattern) {
    pattern = {
      userId,
      activityHours: new Map(),
      lastSearchCriteria: null,
      lastActiveAt: new Date(),
    };
    userActivityPatterns.set(userId, pattern);
  }

  // Increment activity count for current hour
  const currentCount = pattern.activityHours.get(currentHour) || 0;
  pattern.activityHours.set(currentHour, currentCount + 1);

  // Update search criteria if provided
  if (searchCriteria) {
    pattern.lastSearchCriteria = searchCriteria;
  }

  pattern.lastActiveAt = new Date();
};

/**
 * Get user's hot hours (most active times)
 */
export const getUserHotHours = (userId: string): number[] => {
  const pattern = userActivityPatterns.get(userId);
  if (!pattern || pattern.activityHours.size === 0) {
    // Default hot hours if no data: 9am, 12pm, 6pm, 8pm
    return [9, 12, 18, 20];
  }

  // Sort hours by activity count and return top 3
  const sortedHours = [...pattern.activityHours.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => hour);

  return sortedHours.length > 0 ? sortedHours : [9, 12, 18, 20];
};

/**
 * Check if current time is a hot hour for the user
 */
export const isHotHour = (userId: string): boolean => {
  const hotHours = getUserHotHours(userId);
  const currentHour = new Date().getHours();
  return hotHours.includes(currentHour);
};

/**
 * Find matching properties for a user based on their search patterns
 */
export const findMatchingProperties = async (
  userId: string,
  limit: number = 5
): Promise<any[]> => {
  const pattern = userActivityPatterns.get(userId);

  // Also check saved searches
  const savedSearches = await SavedSearch.find({
    userId,
    alertsEnabled: true,
  }).lean();

  // Build query from activity pattern and saved searches
  const queries: any[] = [];

  // From activity pattern
  if (pattern?.lastSearchCriteria) {
    const criteria = pattern.lastSearchCriteria;
    const query: any = { status: 'active' };

    if (criteria.city) query.city = { $regex: criteria.city, $options: 'i' };
    if (criteria.country) query.country = { $regex: criteria.country, $options: 'i' };
    if (criteria.propertyType) query.propertyType = criteria.propertyType;
    if (criteria.minPrice || criteria.maxPrice) {
      query.price = {};
      if (criteria.minPrice) query.price.$gte = criteria.minPrice;
      if (criteria.maxPrice) query.price.$lte = criteria.maxPrice;
    }
    if (criteria.minBeds) query.beds = { $gte: criteria.minBeds };

    queries.push(query);
  }

  // From saved searches
  for (const search of savedSearches) {
    const query: any = { status: 'active' };
    const filters = search.filters as any;

    if (filters) {
      // IFilters uses 'query' for text search and 'country' for country filter
      if (filters.query) {
        query.$or = [
          { city: { $regex: filters.query, $options: 'i' } },
          { country: { $regex: filters.query, $options: 'i' } },
          { title: { $regex: filters.query, $options: 'i' } },
        ];
      }
      if (filters.country && filters.country !== '') {
        query.country = { $regex: filters.country, $options: 'i' };
      }
      if (filters.propertyType && filters.propertyType !== 'any') {
        query.propertyType = filters.propertyType;
      }
      if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = filters.minPrice;
        if (filters.maxPrice) query.price.$lte = filters.maxPrice;
      }
      if (filters.beds) query.beds = { $gte: filters.beds };
    }

    queries.push(query);
  }

  if (queries.length === 0) {
    return [];
  }

  // Find properties matching any of the queries, prioritize newer ones
  const properties = await Property.find({
    $or: queries,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return properties;
};

/**
 * Send property recommendations to pro buyers during hot hours
 */
export const sendHotHourRecommendations = async (): Promise<{
  sent: number;
  skipped: number;
  errors: number;
}> => {
  const stats = { sent: 0, skipped: 0, errors: 0 };

  // Find pro users who have been active recently
  const proBuyers = await User.find({
    'proSubscription.isActive': true,
    isEmailVerified: true,
  }).lean();

  for (const buyer of proBuyers) {
    try {
      const userId = String(buyer._id);

      // Check if it's a hot hour for this user
      if (!isHotHour(userId)) {
        stats.skipped++;
        continue;
      }

      // Check if user has been active recently (within last 7 days)
      const pattern = userActivityPatterns.get(userId);
      if (pattern) {
        const daysSinceActive = (Date.now() - pattern.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActive > 7) {
          stats.skipped++;
          continue;
        }
      }

      // Find matching properties
      const matchingProperties = await findMatchingProperties(userId, 3);
      if (matchingProperties.length === 0) {
        stats.skipped++;
        continue;
      }

      // Send property alert for the top match
      const topProperty = matchingProperties[0];
      await sendPropertyAlert({
        recipientEmail: buyer.email,
        recipientName: buyer.name,
        searchName: 'Your Search Preferences',
        property: {
          id: String(topProperty._id),
          title: topProperty.title || 'Property Listing',
          address: topProperty.address || '',
          city: topProperty.city,
          price: topProperty.price,
          beds: topProperty.beds || 0,
          baths: topProperty.baths || 0,
          sqft: topProperty.sqft || 0,
          imageUrl: topProperty.imageUrl || '',
        },
      });

      // Sent hot hour recommendation
      stats.sent++;
    } catch (error) {
      console.error('[proBuyerEmailService] Error sending hot hour recommendation:', error);
      stats.errors++;
    }
  }

  return stats;
};

/**
 * Send price drop alerts for saved properties
 */
export const sendPriceDropAlerts = async (
  propertyId: string,
  previousPrice: number,
  newPrice: number
): Promise<void> => {
  // Find users who have this property saved
  const usersWithSaved = await User.find({
    savedHomes: propertyId,
    isEmailVerified: true,
  }).lean();

  const property = await Property.findById(propertyId).lean();
  if (!property) {
    console.error(`[proBuyerEmailService] Property ${propertyId} not found for price drop alert`);
    return;
  }

  const percentageDrop = Math.round(((previousPrice - newPrice) / previousPrice) * 100);

  for (const user of usersWithSaved) {
    try {
      await sendPriceDropAlert({
        recipientEmail: user.email,
        recipientName: user.name,
        property: {
          id: String(property._id),
          title: property.title || 'Property Listing',
          address: property.address || '',
          city: property.city,
          previousPrice,
          newPrice,
          percentageDrop,
          beds: property.beds || 0,
          baths: property.baths || 0,
          sqft: property.sqft || 0,
          imageUrl: property.imageUrl || '',
        },
      });

      // Sent price drop alert
    } catch (error) {
      console.error('[proBuyerEmailService] Error sending price drop alert:', error);
    }
  }
};

/**
 * Process saved searches and send alerts for new matches
 */
export const processSavedSearchAlerts = async (): Promise<{
  searchesProcessed: number;
  alertsSent: number;
  errors: number;
}> => {
  const stats = { searchesProcessed: 0, alertsSent: 0, errors: 0 };

  // Find all active saved searches with alerts enabled
  const savedSearches = await SavedSearch.find({
    alertsEnabled: true,
  })
    .populate('userId', 'email name isEmailVerified')
    .lean();

  for (const search of savedSearches) {
    try {
      const user = search.userId as any;
      if (!user?.isEmailVerified) {
        continue;
      }

      // Build query from search filters
      const query: any = {
        status: 'active',
        createdAt: { $gt: search.lastAlertSentAt || new Date(0) },
      };

      const filters = search.filters as any;
      if (filters) {
        // IFilters uses 'query' for text search and 'country' for country filter
        if (filters.query) {
          query.$or = [
            { city: { $regex: filters.query, $options: 'i' } },
            { country: { $regex: filters.query, $options: 'i' } },
            { title: { $regex: filters.query, $options: 'i' } },
          ];
        }
        if (filters.country && filters.country !== '') {
          query.country = { $regex: filters.country, $options: 'i' };
        }
        if (filters.propertyType && filters.propertyType !== 'any') {
          query.propertyType = filters.propertyType;
        }
        if (filters.minPrice || filters.maxPrice) {
          query.price = {};
          if (filters.minPrice) query.price.$gte = filters.minPrice;
          if (filters.maxPrice) query.price.$lte = filters.maxPrice;
        }
        if (filters.beds) query.beds = { $gte: filters.beds };
      }

      // Find new matching properties
      const newProperties = await Property.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      stats.searchesProcessed++;

      if (newProperties.length === 0) {
        continue;
      }

      // Check alert frequency
      const now = new Date();
      const lastAlert = search.lastAlertSentAt ? new Date(search.lastAlertSentAt) : new Date(0);
      const hoursSinceLastAlert = (now.getTime() - lastAlert.getTime()) / (1000 * 60 * 60);

      let shouldSend = false;
      switch (search.alertFrequency) {
        case 'instant':
          shouldSend = true;
          break;
        case 'daily':
          shouldSend = hoursSinceLastAlert >= 24;
          break;
        case 'weekly':
          shouldSend = hoursSinceLastAlert >= 168; // 7 days
          break;
        default:
          shouldSend = hoursSinceLastAlert >= 24;
      }

      if (!shouldSend) {
        continue;
      }

      // Send digest if multiple properties, or single alert
      if (newProperties.length > 1) {
        await sendNewListingsDigest({
          recipientEmail: user.email,
          recipientName: user.name,
          searchName: search.name,
          properties: newProperties.slice(0, 5).map((p) => ({
            id: String(p._id),
            title: p.title || 'Property Listing',
            address: p.address || '',
            city: p.city,
            price: p.price,
            beds: p.beds || 0,
            baths: p.baths || 0,
            sqft: p.sqft || 0,
            imageUrl: p.imageUrl || '',
          })),
          frequency: search.alertFrequency || 'daily',
        });
      } else {
        await sendPropertyAlert({
          recipientEmail: user.email,
          recipientName: user.name,
          searchName: search.name,
          property: {
            id: String(newProperties[0]._id),
            title: newProperties[0].title || 'Property Listing',
            address: newProperties[0].address || '',
            city: newProperties[0].city,
            price: newProperties[0].price,
            beds: newProperties[0].beds || 0,
            baths: newProperties[0].baths || 0,
            sqft: newProperties[0].sqft || 0,
            imageUrl: newProperties[0].imageUrl || '',
          },
        });
      }

      // Update last alert sent time
      await SavedSearch.findByIdAndUpdate(search._id, {
        lastAlertSentAt: now,
      });

      stats.alertsSent++;
      // Sent saved search alert
    } catch (error) {
      console.error(`[proBuyerEmailService] Error processing saved search:`, error);
      stats.errors++;
    }
  }

  return stats;
};

/**
 * Cleanup old activity patterns (run periodically)
 */
export const cleanupOldPatterns = (): void => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const [userId, pattern] of userActivityPatterns.entries()) {
    if (pattern.lastActiveAt.getTime() < thirtyDaysAgo) {
      userActivityPatterns.delete(userId);
    }
  }
};

export default {
  trackUserActivity,
  getUserHotHours,
  isHotHour,
  findMatchingProperties,
  sendHotHourRecommendations,
  sendPriceDropAlerts,
  processSavedSearchAlerts,
  cleanupOldPatterns,
};
