import { Request, Response } from 'express';
import Favorite from '../models/Favorite';
import Property from '../models/Property';
import { IUser } from '../models/User';
import { incrementSaveCount, decrementSaveCount } from '../utils/statsUpdater';

// @desc    Get user's favorites
// @route   GET /api/favorites
// @access  Private
export const getFavorites = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = req.user as IUser;
    const favorites = await Favorite.find({ userId: String(user._id) })
      .populate({
        path: 'propertyId',
        populate: {
          path: 'sellerId',
          select: 'name email phone avatarUrl role agencyName',
        },
      })
      .sort({ createdAt: -1 });

    // Filter out any null properties (in case they were deleted)
    const validFavorites = favorites.filter((fav) => fav.propertyId != null);

    res.json({ favorites: validFavorites });
  } catch (error: any) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Error fetching favorites', error: error.message });
  }
};

// @desc    Toggle favorite (add or remove)
// @route   POST /api/favorites/toggle
// @access  Private
export const toggleFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { propertyId } = req.body;

    if (!propertyId) {
      res.status(400).json({ message: 'Property ID is required' });
      return;
    }

    // Check if property exists
    const property = await Property.findById(propertyId);

    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId: String((req.user as IUser)._id),
      propertyId,
    });

    if (existingFavorite) {
      // Remove favorite
      await existingFavorite.deleteOne();

      // Decrement saves count on property
      property.saves = Math.max(0, property.saves - 1);
      await property.save();

      // Update seller's stats in real-time
      await decrementSaveCount(String(property.sellerId));

      res.json({ message: 'Favorite removed', isSaved: false });
    } else {
      // Add favorite
      await Favorite.create({
        userId: String((req.user as IUser)._id),
        propertyId,
      });

      // Increment saves count on property
      property.saves += 1;
      await property.save();

      // Update seller's stats in real-time
      await incrementSaveCount(String(property.sellerId));

      res.json({ message: 'Favorite added', isSaved: true });
    }
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Error toggling favorite', error: error.message });
  }
};

// @desc    Check if property is favorited
// @route   GET /api/favorites/check/:propertyId
// @access  Private
export const checkFavorite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const favorite = await Favorite.findOne({
      userId: String((req.user as IUser)._id),
      propertyId: req.params.propertyId,
    });

    res.json({ isSaved: !!favorite });
  } catch (error: any) {
    console.error('Check favorite error:', error);
    res.status(500).json({ message: 'Error checking favorite', error: error.message });
  }
};
