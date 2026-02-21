import { Request, Response } from 'express';
import SavedSearch from '../models/SavedSearch';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';

// @desc    Get user's saved searches
// @route   GET /api/saved-searches
// @access  Private
export const getSavedSearches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const savedSearches = await SavedSearch.find({ userId: String((req.user as IUser)._id) }).sort({
      lastAccessed: -1,
    });

    res.json({ savedSearches });
  } catch (error: any) {
    apiLogger.error('Get saved searches error:', error);
    res.status(500).json({ message: 'Error fetching saved searches' });
  }
};

// @desc    Create saved search
// @route   POST /api/saved-searches
// @access  Private
export const createSavedSearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { name, filters, drawnBoundsJSON } = req.body;

    apiLogger.info('[savedSearchController] Creating saved search:', {
      name,
      drawnBoundsJSON,
      drawnBoundsType: typeof drawnBoundsJSON,
      hasFilters: !!filters,
    });

    if (!name || !filters) {
      res.status(400).json({ message: 'Name and filters are required' });
      return;
    }

    const savedSearch = await SavedSearch.create({
      userId: String((req.user as IUser)._id),
      name,
      filters,
      drawnBoundsJSON: drawnBoundsJSON || null,
    });

    apiLogger.info('[savedSearchController] Created saved search:', {
      id: savedSearch._id,
      drawnBoundsJSON: savedSearch.drawnBoundsJSON,
    });

    res.status(201).json({ savedSearch });
  } catch (error: any) {
    apiLogger.error('Create saved search error:', error);
    res.status(500).json({ message: 'Error creating saved search' });
  }
};

// @desc    Update saved search access time and seen properties
// @route   PATCH /api/saved-searches/:id/access
// @access  Private
export const updateAccessTime = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      res.status(404).json({ message: 'Saved search not found' });
      return;
    }

    // Check ownership
    if (savedSearch.userId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this search' });
      return;
    }

    savedSearch.lastAccessed = new Date();

    // Update seen property IDs if provided
    if (req.body.seenPropertyIds && Array.isArray(req.body.seenPropertyIds)) {
      savedSearch.seenPropertyIds = req.body.seenPropertyIds;
    }

    await savedSearch.save();

    res.json({ savedSearch });
  } catch (error: any) {
    apiLogger.error('Update access time error:', error);
    res.status(500).json({ message: 'Error updating access time' });
  }
};

// @desc    Update saved search name
// @route   PUT /api/saved-searches/:id
// @access  Private
export const updateSavedSearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      res.status(404).json({ message: 'Saved search not found' });
      return;
    }

    // Check ownership
    if (savedSearch.userId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this search' });
      return;
    }

    const { name } = req.body;

    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        res.status(400).json({ message: 'Name cannot be empty' });
        return;
      }
      savedSearch.name = name;
    }

    await savedSearch.save();

    res.json({
      message: 'Saved search updated successfully',
      savedSearch,
    });
  } catch (error: any) {
    apiLogger.error('Update saved search error:', error);
    res.status(500).json({ message: 'Error updating saved search' });
  }
};

// @desc    Update saved search alert settings
// @route   PATCH /api/saved-searches/:id/alerts
// @access  Private
export const updateAlertSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      res.status(404).json({ message: 'Saved search not found' });
      return;
    }

    // Check ownership
    if (savedSearch.userId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to update this search' });
      return;
    }

    const { alertsEnabled, alertFrequency } = req.body;

    // Validate frequency
    const validFrequencies = ['instant', 'daily', 'weekly'];
    if (alertFrequency && !validFrequencies.includes(alertFrequency)) {
      res.status(400).json({ message: 'Invalid alert frequency. Must be instant, daily, or weekly' });
      return;
    }

    // Update alert settings
    if (typeof alertsEnabled === 'boolean') {
      savedSearch.alertsEnabled = alertsEnabled;
    }
    if (alertFrequency) {
      savedSearch.alertFrequency = alertFrequency;
    }

    await savedSearch.save();

    apiLogger.info(`[savedSearchController] Updated alerts for search ${savedSearch._id}: enabled=${savedSearch.alertsEnabled}, frequency=${savedSearch.alertFrequency}`);

    res.json({
      message: 'Alert settings updated successfully',
      savedSearch,
    });
  } catch (error: any) {
    apiLogger.error('Update alert settings error:', error);
    res.status(500).json({ message: 'Error updating alert settings' });
  }
};

// @desc    Delete all saved searches for user
// @route   DELETE /api/saved-searches/all
// @access  Private
export const deleteAllSavedSearches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const result = await SavedSearch.deleteMany({ userId: String((req.user as IUser)._id) });

    res.json({ message: `Deleted ${result.deletedCount} saved searches` });
  } catch (error: any) {
    apiLogger.error('Delete all saved searches error:', error);
    res.status(500).json({ message: 'Error deleting saved searches' });
  }
};

// @desc    Delete saved search
// @route   DELETE /api/saved-searches/:id
// @access  Private
export const deleteSavedSearch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const savedSearch = await SavedSearch.findById(id);

    if (!savedSearch) {
      res.status(404).json({ message: 'Saved search not found' });
      return;
    }

    // Check ownership
    if (savedSearch.userId.toString() !== String((req.user as IUser)._id).toString()) {
      res.status(403).json({ message: 'Not authorized to delete this search' });
      return;
    }

    await savedSearch.deleteOne();

    res.json({ message: 'Saved search deleted successfully' });
  } catch (error: any) {
    apiLogger.error('Delete saved search error:', error);
    res.status(500).json({ message: 'Error deleting saved search' });
  }
};
