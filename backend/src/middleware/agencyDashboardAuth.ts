import { Request, Response, NextFunction } from 'express';
import Agency, { IAgency } from '../models/Agency';
import { IUser } from '../models/User';
import { getObjectIdParam } from '../utils/validateParams';
import { agencyLogger } from '../utils/logger';

// Extend Express Request to include agency
declare global {
  namespace Express {
    interface Request {
      agency?: IAgency;
    }
  }
}

/**
 * Agency Dashboard authorization middleware.
 * Must be used AFTER the `protect` middleware (req.user is guaranteed).
 *
 * 1. Validates the `agencyId` route parameter as a valid ObjectId.
 * 2. Loads the agency document from the database.
 * 3. Verifies the authenticated user is the agency owner, an admin, or a member agent.
 * 4. Verifies the agency subscription is active or in trial.
 * 5. Attaches the agency document to `req.agency` for downstream handlers.
 */
export const agencyDashboardAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure user is authenticated (protect middleware should have run)
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // 1. Validate agencyId param
    const agencyId = getObjectIdParam(req, res, 'agencyId');
    if (!agencyId) return; // getObjectIdParam already sent 400 response

    // 2. Load agency from DB
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    // 3. Check user is owner, admin, or member agent
    const currentUser = req.user as IUser;
    const userId = String(currentUser._id);
    const isOwner = String(agency.ownerId) === userId;
    const isAdmin = agency.admins?.some(
      (adminId) => String(adminId) === userId
    );
    const isAgent = agency.agents?.some(
      (agentId) => String(agentId) === userId
    );

    if (!isOwner && !isAdmin && !isAgent) {
      agencyLogger.warn(
        `Unauthorized dashboard access attempt by user ${userId} for agency ${agencyId}`
      );
      res.status(403).json({
        message: 'You do not have permission to access this agency dashboard',
      });
      return;
    }

    // 4. Check agency subscription is active or trial
    const subscriptionStatus = agency.subscription?.status;
    if (subscriptionStatus !== 'active' && subscriptionStatus !== 'trial') {
      agencyLogger.warn(
        `Dashboard access denied for agency ${agencyId}: subscription status is '${subscriptionStatus}'`
      );
      res.status(403).json({
        message: 'Agency subscription is not active. Please renew your subscription to access the dashboard.',
      });
      return;
    }

    // 5. Attach agency to request for downstream handlers
    req.agency = agency;
    next();
  } catch (error: any) {
    agencyLogger.error('Agency dashboard auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
