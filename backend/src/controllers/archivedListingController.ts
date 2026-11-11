import { Request, Response } from 'express';
import { adminLogger } from '../utils/logger';
import { listArchivedListings, parseArchiveListQuery } from '../services/archivedListingQuery';

// @desc    Removed, sold and rented listings, newest first
// @route   GET /api/admin/archived-listings
// @access  Private/Admin
export const getArchivedListingsAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = parseArchiveListQuery(req.query as Record<string, unknown>);
    res.json(await listArchivedListings(query));
  } catch (error) {
    adminLogger.error('Get archived listings error:', error);
    res.status(500).json({ message: 'Error loading archived listings' });
  }
};
