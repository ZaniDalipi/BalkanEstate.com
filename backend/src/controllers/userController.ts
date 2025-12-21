import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import Property from '../models/Property';
import { syncUserStats, initializeUserStats } from '../utils/statsUpdater';

// Get all agents with their statistics
export const getAllAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all users with agent role
    const agents = await User.find({ role: 'agent' })
      .select('name email phone avatarUrl city country agencyName agentId licenseNumber licenseVerified stats')
      .lean();

    // Get property counts for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const agentId = String(agent._id);

        // Get active listings count
        const activeListings = await Property.countDocuments({
          sellerId: agentId,
          status: 'active'
        });

        // Calculate rating based on stats (simple algorithm)
        const propertiesSold = agent.stats?.propertiesSold || 0;
        const totalViews = agent.stats?.totalViews || 0;
        const rating = Math.min(5, 3.5 + (propertiesSold * 0.1) + (totalViews / 1000) * 0.05);

        return {
          id: String(agent._id),
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          avatarUrl: agent.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=0D8ABC&color=fff&size=200`,
          city: agent.city,
          country: agent.country,
          agencyName: agent.agencyName,
          agentId: agent.agentId,
          licenseNumber: agent.licenseNumber,
          licenseVerified: agent.licenseVerified,
          totalSalesValue: agent.stats?.totalSalesValue || 0,
          propertiesSold: agent.stats?.propertiesSold || 0,
          activeListings,
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal
          totalViews: agent.stats?.totalViews || 0,
          totalInquiries: agent.stats?.totalInquiries || 0,
        };
      })
    );

    // Sort by total sales value by default
    agentsWithStats.sort((a, b) => b.totalSalesValue - a.totalSalesValue);

    res.json({ agents: agentsWithStats, count: agentsWithStats.length });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user statistics (uses cached stats from database)
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Ensure stats are initialized for this user
    await initializeUserStats(userId);

    // Get user with stats
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Get current active listings count
    const activeListings = await Property.countDocuments({
      sellerId: userId,
      status: 'active'
    });

    // Return stats from database (real-time updated)
    const stats = {
      activeListings,
      totalListings: user.totalListingsCreated || 0,
      totalViews: user.stats?.totalViews || 0,
      totalSaves: user.stats?.totalSaves || 0,
      totalInquiries: user.stats?.totalInquiries || 0,
      propertiesSold: user.stats?.propertiesSold || 0,
      totalSalesValue: user.stats?.totalSalesValue || 0,
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sync user statistics (recalculate from database)
export const syncStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    // Ensure stats are initialized first
    await initializeUserStats(userId);

    // Call the sync function
    await syncUserStats(userId);

    // Fetch updated stats
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // **SYNC SUBSCRIPTION COUNTERS**: Recount all properties and update subscription
    if (user.subscription) {
      const existingProperties = await Property.find({
        sellerId: user._id,
        status: { $in: ['active', 'pending', 'draft'] }
      });

      const activeListingsCount = existingProperties.length;
      const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
      const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

      user.subscription.activeListingsCount = activeListingsCount;
      user.subscription.privateSellerCount = privateSellerCount;
      user.subscription.agentCount = agentCount;

      await user.save();

      console.log(`📊 [syncStats] Updated subscription counters for ${user.email}: ${activeListingsCount} total (${privateSellerCount} private, ${agentCount} agent)`);
    }

    // Get current active listings count
    const activeListings = await Property.countDocuments({
      sellerId: userId,
      status: 'active'
    });

    // Return synced stats
    const stats = {
      activeListings,
      totalListings: user.totalListingsCreated || 0,
      totalViews: user.stats?.totalViews || 0,
      totalSaves: user.stats?.totalSaves || 0,
      totalInquiries: user.stats?.totalInquiries || 0,
      propertiesSold: user.stats?.propertiesSold || 0,
      totalSalesValue: user.stats?.totalSalesValue || 0,
    };

    res.json({
      message: 'Statistics synced successfully',
      stats
    });
  } catch (error) {
    console.error('Error syncing user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Sync all users' subscription counters from database
 * This endpoint recounts all properties for all users and updates their subscription counters
 * Making the database the single source of truth
 */
export const syncAllSubscriptionCounters = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📊 Starting subscription counter sync for all users...\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to sync`);

    let syncedCount = 0;
    let errorCount = 0;
    const results: any[] = [];

    for (const user of users) {
      try {
        // Determine tier and limit from proSubscription or default to free
        let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
        let listingsLimit = 3;

        if (user.proSubscription?.isActive) {
          tier = 'pro';
          listingsLimit = user.proSubscription.totalListingsLimit || 25;
        }

        // Count existing properties for this user
        const existingProperties = await Property.find({
          sellerId: user._id,
          status: { $in: ['active', 'pending', 'draft'] }
        });

        const activeListingsCount = existingProperties.length;
        const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
        const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;

        // Initialize or update subscription object
        if (!user.subscription) {
          // Initialize new subscription
          const legacyCoupons = user.proSubscription?.promotionCoupons;
          const promotionCoupons = {
            monthly: tier === 'pro' ? 3 : 0,
            available: legacyCoupons?.highlightCoupons ?? (tier === 'pro' ? 3 : 0),
            used: legacyCoupons?.usedHighlightCoupons ?? 0,
            rollover: 0,
            lastRefresh: new Date(),
          };

          user.subscription = {
            tier,
            status: 'active',
            listingsLimit,
            activeListingsCount,
            privateSellerCount,
            agentCount,
            promotionCoupons,
            savedSearchesLimit: tier === 'pro' ? 10 : 3,
            totalPaid: 0,
            startDate: user.proSubscription?.startedAt || new Date(),
            expiresAt: user.proSubscription?.expiresAt,
          };
        } else {
          // Update existing subscription counters
          user.subscription.activeListingsCount = activeListingsCount;
          user.subscription.privateSellerCount = privateSellerCount;
          user.subscription.agentCount = agentCount;

          // Ensure listingsLimit is correct
          if (user.subscription.tier === 'pro' && user.subscription.listingsLimit !== 20) {
            user.subscription.listingsLimit = 20;
          }
        }

        await user.save();

        results.push({
          email: user.email,
          tier,
          listingsLimit,
          activeListingsCount,
          privateSellerCount,
          agentCount,
          status: 'synced'
        });

        syncedCount++;
        console.log(`✅ Synced ${user.email}: ${activeListingsCount}/${listingsLimit} listings`);
      } catch (error) {
        console.error(`❌ Error syncing ${user.email}:`, error);
        errorCount++;
        results.push({
          email: user.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`\n📊 Sync complete: ${syncedCount} synced, ${errorCount} errors\n`);

    res.json({
      message: 'Subscription counters synced successfully',
      totalUsers: users.length,
      syncedCount,
      errorCount,
      results
    });
  } catch (error) {
    console.error('Error syncing all subscription counters:', error);
    res.status(500).json({ message: 'Server error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};
