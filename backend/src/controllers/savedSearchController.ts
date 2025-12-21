import { Request, Response } from 'express';
import SavedSearch from '../models/SavedSearch';
import { IUser } from '../models/User';

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
    console.error('Get saved searches error:', error);
    res.status(500).json({ message: 'Error fetching saved searches', error: error.message });
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

    res.status(201).json({ savedSearch });
  } catch (error: any) {
    console.error('Create saved search error:', error);
    res.status(500).json({ message: 'Error creating saved search', error: error.message });
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

    const savedSearch = await SavedSearch.findById(req.params.id);

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
    console.error('Update access time error:', error);
    res.status(500).json({ message: 'Error updating access time', error: error.message });
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

    const savedSearch = await SavedSearch.findById(req.params.id);

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
    console.error('Update saved search error:', error);
    res.status(500).json({ message: 'Error updating saved search', error: error.message });
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

    const savedSearch = await SavedSearch.findById(req.params.id);

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
    console.error('Delete saved search error:', error);
    res.status(500).json({ message: 'Error deleting saved search', error: error.message });
  }
};
