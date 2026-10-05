import { Request, Response, NextFunction } from 'express';
import type { IUser } from '../models/User';
import AgencyFeed, { type IAgencyFeed } from '../models/AgencyFeed';
import { getObjectIdParam } from '../utils/validateParams';
import { agencyLogger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      agencyFeed?: IAgencyFeed;
    }
  }
}

/**
 * Property-feed management is limited to agency managers — the owner and the
 * agency's admins. Member agents can use the rest of the dashboard but cannot
 * connect feeds, publish inventory in bulk, or approve deactivations.
 *
 * Must run after `protect` and `agencyDashboardAuth` (which loads req.agency
 * and checks membership and subscription).
 */
export const requireAgencyFeedManager = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user as IUser | undefined;
  const agency = req.agency;
  if (!user || !agency) {
    res.status(401).json({ message: 'Not authorized' });
    return;
  }
  const userId = String(user._id);
  const isManager = String(agency.ownerId) === userId || (agency.admins ?? []).some((a) => String(a) === userId);
  if (!isManager) {
    agencyLogger.warn(`Feed management denied for non-manager ${userId} in agency ${String(agency._id)}`);
    res.status(403).json({ message: 'Only the agency owner or an agency admin can manage property imports' });
    return;
  }
  next();
};

/** Load `:feedId` and ensure it belongs to req.agency (never trust the id alone). */
export const loadAgencyFeed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const feedId = getObjectIdParam(req, res, 'feedId');
  if (!feedId) return;
  try {
    const feed = await AgencyFeed.findOne({ _id: feedId, agencyId: req.agency?._id });
    if (!feed) {
      res.status(404).json({ message: 'Feed not found' });
      return;
    }
    req.agencyFeed = feed;
    next();
  } catch (err) {
    agencyLogger.error('Failed to load agency feed', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
