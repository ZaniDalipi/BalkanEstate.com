/**
 * Weekly Statistics Email Job
 * Sends weekly performance reports to Pro members and agency owners
 * Runs every Monday at 9:00 AM UTC
 */

import User from '../models/User';
import Agency from '../models/Agency';
import Property from '../models/Property';
import PageView from '../models/PageView';
import Conversation from '../models/Conversation';
import emailService, { WeeklyStatsData, AgencyWeeklyStatsData } from '../services/emailService';

/**
 * Format date range for display (e.g., "Dec 30 - Jan 5")
 */
const formatDateRange = (startDate: Date, endDate: Date): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const start = startDate.toLocaleDateString('en-US', options);
  const end = endDate.toLocaleDateString('en-US', options);
  return `${start} - ${end}`;
};

/**
 * Calculate percentage change between two values
 */
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

/**
 * Get view counts for a time period
 */
const getViewsInPeriod = async (
  entityType: 'property' | 'agent' | 'agency',
  entityIds: string[],
  startDate: Date,
  endDate: Date
): Promise<{ total: number; unique: number }> => {
  if (entityIds.length === 0) return { total: 0, unique: 0 };

  const result = await PageView.aggregate([
    {
      $match: {
        entityType,
        entityId: { $in: entityIds.map(id => id.toString()) },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unique: { $sum: { $cond: ['$isUnique', 1, 0] } },
      },
    },
  ]);

  return result[0] || { total: 0, unique: 0 };
};

/**
 * Get inquiry count for a time period
 */
const getInquiriesInPeriod = async (
  sellerIds: string[],
  startDate: Date,
  endDate: Date
): Promise<number> => {
  if (sellerIds.length === 0) return 0;

  const count = await Conversation.countDocuments({
    sellerId: { $in: sellerIds },
    createdAt: { $gte: startDate, $lte: endDate },
  });

  return count;
};

/**
 * Send weekly statistics to Pro member sellers
 */
export const sendProMemberWeeklyStats = async (): Promise<void> => {
  console.log('📊 Starting weekly statistics job for Pro members...');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // Find all Pro members (sellers with active Pro subscription)
    const proMembers = await User.find({
      'subscription.tier': { $in: ['pro', 'agency_agent'] },
      'subscription.status': 'active',
      role: { $in: ['private_seller', 'agent'] },
      email: { $exists: true, $ne: '' },
    });

    console.log(`Found ${proMembers.length} Pro members to send weekly stats`);

    for (const user of proMembers) {
      try {
        // Get user's properties
        const properties = await Property.find({ sellerId: user._id });
        const propertyIds = properties.map(p => String(p._id));

        // Current week stats
        const currentViews = await getViewsInPeriod('property', propertyIds, oneWeekAgo, now);
        const currentInquiries = await getInquiriesInPeriod([String(user._id)], oneWeekAgo, now);

        // Previous week stats (for comparison)
        const previousViews = await getViewsInPeriod('property', propertyIds, twoWeeksAgo, oneWeekAgo);
        const previousInquiries = await getInquiriesInPeriod([String(user._id)], twoWeeksAgo, oneWeekAgo);

        // Get current saves count
        const totalSaves = properties.reduce((sum, p) => sum + (p.saves || 0), 0);

        // Find top performing property this week
        let topProperty: WeeklyStatsData['topPerformingProperty'] | undefined;
        if (propertyIds.length > 0) {
          const propertyViewsThisWeek = await PageView.aggregate([
            {
              $match: {
                entityType: 'property',
                entityId: { $in: propertyIds },
                createdAt: { $gte: oneWeekAgo, $lte: now },
              },
            },
            {
              $group: {
                _id: '$entityId',
                views: { $sum: 1 },
              },
            },
            { $sort: { views: -1 } },
            { $limit: 1 },
          ]);

          if (propertyViewsThisWeek.length > 0) {
            const topProp = properties.find(p => String(p._id) === propertyViewsThisWeek[0]._id);
            if (topProp) {
              topProperty = {
                title: topProp.title || 'Property',
                address: `${topProp.address}, ${topProp.city}`,
                views: propertyViewsThisWeek[0].views,
                inquiries: topProp.inquiries || 0,
              };
            }
          }
        }

        // Get sold properties this week
        const soldThisWeek = await Property.find({
          sellerId: user._id,
          status: 'sold',
          soldAt: { $gte: oneWeekAgo, $lte: now },
        });
        const totalSalesValue = soldThisWeek.reduce((sum, p) => sum + (p.price || 0), 0);

        const statsData: WeeklyStatsData = {
          userName: user.name,
          email: user.email,
          totalViews: currentViews.total,
          viewsChange: calculatePercentageChange(currentViews.total, previousViews.total),
          totalInquiries: currentInquiries,
          inquiriesChange: calculatePercentageChange(currentInquiries, previousInquiries),
          totalSaves,
          savesChange: 0, // Would need historical saves tracking for accurate change
          activeListings: properties.filter(p => p.status === 'active').length,
          topPerformingProperty: topProperty,
          propertiesSold: soldThisWeek.length,
          totalSalesValue,
          period: formatDateRange(oneWeekAgo, now),
        };

        await emailService.sendWeeklyStats(statsData);
        // Sent weekly stats to user
      } catch (userError) {
        console.error('❌ Failed to send weekly stats to user:', userError);
      }
    }

    console.log('📊 Pro member weekly statistics job completed');
  } catch (error) {
    console.error('❌ Weekly stats job error:', error);
  }
};

/**
 * Send weekly statistics to agency owners
 */
export const sendAgencyWeeklyStats = async (): Promise<void> => {
  console.log('🏢 Starting weekly statistics job for agencies...');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // Find all agencies with active subscriptions
    const agencies = await Agency.find({
      'subscription.status': { $in: ['active', 'trial'] },
    }).populate('ownerId', 'email name');

    console.log(`Found ${agencies.length} agencies to send weekly stats`);

    for (const agency of agencies) {
      try {
        const owner = agency.ownerId as any;
        if (!owner?.email) {
          console.warn(`Skipping agency ${agency.name} - no owner email`);
          continue;
        }

        const agencyId = String(agency._id);

        // Get agency profile views
        const currentProfileViews = await getViewsInPeriod('agency', [agencyId], oneWeekAgo, now);
        const previousProfileViews = await getViewsInPeriod('agency', [agencyId], twoWeeksAgo, oneWeekAgo);

        // Get agent IDs for the agency
        const agentIds = (agency.agents || []).map((a: any) => String(a));

        // Get all properties for this agency's agents
        const agencyProperties = await Property.find({
          sellerId: { $in: agentIds },
        });
        const propertyIds = agencyProperties.map(p => String(p._id));

        // Get inquiries for agency properties
        const currentInquiries = await getInquiriesInPeriod(agentIds, oneWeekAgo, now);
        const previousInquiries = await getInquiriesInPeriod(agentIds, twoWeeksAgo, oneWeekAgo);

        // Find top performing agent
        let topAgent: AgencyWeeklyStatsData['topAgent'] | undefined;
        if (agentIds.length > 0) {
          const agentStats = await Promise.all(
            agentIds.map(async (agentId) => {
              const agentProperties = agencyProperties.filter(p => String(p.sellerId) === agentId);
              const propIds = agentProperties.map(p => String(p._id));
              const views = await getViewsInPeriod('property', propIds, oneWeekAgo, now);
              const inquiries = await getInquiriesInPeriod([agentId], oneWeekAgo, now);
              return { agentId, views: views.total, inquiries };
            })
          );

          const sortedAgents = agentStats.sort((a, b) => b.views - a.views);
          if (sortedAgents[0] && sortedAgents[0].views > 0) {
            const topAgentUser = await User.findById(sortedAgents[0].agentId);
            if (topAgentUser) {
              topAgent = {
                name: topAgentUser.name,
                views: sortedAgents[0].views,
                inquiries: sortedAgents[0].inquiries,
              };
            }
          }
        }

        // Find top property
        let topProperty: AgencyWeeklyStatsData['topProperty'] | undefined;
        if (propertyIds.length > 0) {
          const propertyViewsThisWeek = await PageView.aggregate([
            {
              $match: {
                entityType: 'property',
                entityId: { $in: propertyIds },
                createdAt: { $gte: oneWeekAgo, $lte: now },
              },
            },
            {
              $group: {
                _id: '$entityId',
                views: { $sum: 1 },
              },
            },
            { $sort: { views: -1 } },
            { $limit: 1 },
          ]);

          if (propertyViewsThisWeek.length > 0) {
            const topProp = agencyProperties.find(p => String(p._id) === propertyViewsThisWeek[0]._id);
            if (topProp) {
              topProperty = {
                title: topProp.title || `${topProp.address}, ${topProp.city}`,
                views: propertyViewsThisWeek[0].views,
              };
            }
          }
        }

        const statsData: AgencyWeeklyStatsData = {
          agencyName: agency.name,
          email: owner.email,
          profileViews: currentProfileViews.total,
          profileViewsChange: calculatePercentageChange(currentProfileViews.total, previousProfileViews.total),
          uniqueProfileViews: currentProfileViews.unique,
          totalAgents: agentIds.length,
          totalListings: agencyProperties.length,
          activeListings: agencyProperties.filter(p => p.status === 'active').length,
          totalInquiries: currentInquiries,
          inquiriesChange: calculatePercentageChange(currentInquiries, previousInquiries),
          topAgent,
          topProperty,
          period: formatDateRange(oneWeekAgo, now),
        };

        await emailService.sendAgencyWeeklyStats(statsData);
        console.log(`✅ Sent weekly stats to agency ${agency.name}`);
      } catch (agencyError) {
        console.error(`❌ Failed to send stats to agency ${agency.name}:`, agencyError);
      }
    }

    console.log('🏢 Agency weekly statistics job completed');
  } catch (error) {
    console.error('❌ Agency weekly stats job error:', error);
  }
};

/**
 * Run all weekly statistics jobs
 */
export const runWeeklyStatsJobs = async (): Promise<void> => {
  console.log('📧 Running all weekly statistics jobs...');
  await sendProMemberWeeklyStats();
  await sendAgencyWeeklyStats();
  console.log('📧 All weekly statistics jobs completed');
};
