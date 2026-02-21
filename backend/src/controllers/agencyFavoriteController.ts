import { Request, Response } from 'express';
import AgencyFavorite from '../models/AgencyFavorite';
import Agency from '../models/Agency';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';

// @desc    Get user's favourite agencies
// @route   GET /api/agency-favorites
// @access  Private
export const getAgencyFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const favorites = await AgencyFavorite.find({ userId })
      .populate({
        path: 'agencyId',
        select: 'name slug logo city country totalAgents totalProperties isFeatured',
      })
      .sort({ createdAt: -1 });

    const validFavorites = favorites.filter((fav) => fav.agencyId != null);

    res.json({ favorites: validFavorites });
  } catch (error: any) {
    apiLogger.error('Get agency favorites error:', error);
    res.status(500).json({ message: 'Error fetching agency favorites' });
  }
};

// @desc    Toggle agency favourite (add or remove)
// @route   POST /api/agency-favorites/toggle
// @access  Private
export const toggleAgencyFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { agencyId } = req.body;

    if (!agencyId) {
      res.status(400).json({ message: 'Agency ID is required' });
      return;
    }

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      res.status(404).json({ message: 'Agency not found' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const existing = await AgencyFavorite.findOne({ userId, agencyId });

    if (existing) {
      await existing.deleteOne();
      res.json({ message: 'Agency removed from favourites', isSaved: false });
    } else {
      await AgencyFavorite.create({ userId, agencyId });
      res.json({ message: 'Agency added to favourites', isSaved: true });
    }
  } catch (error: any) {
    apiLogger.error('Toggle agency favorite error:', error);
    res.status(500).json({ message: 'Error toggling agency favorite' });
  }
};

// @desc    Check if agency is favourited
// @route   GET /api/agency-favorites/check/:agencyId
// @access  Private
export const checkAgencyFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const favorite = await AgencyFavorite.findOne({
      userId,
      agencyId: req.params.agencyId,
    });

    res.json({ isSaved: !!favorite });
  } catch (error: any) {
    apiLogger.error('Check agency favorite error:', error);
    res.status(500).json({ message: 'Error checking agency favorite' });
  }
};
