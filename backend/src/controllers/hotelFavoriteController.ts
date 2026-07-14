import { Request, Response } from 'express';
import HotelFavorite from '../models/HotelFavorite';
import Hotel from '../models/Hotel';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { encodeId, resolveId } from '../utils/idObfuscation';
import { getParam } from '../utils/validateParams';

const HOTEL_CARD_FIELDS =
  'name slug propertyType starRating city country coverImageUrl images amenities rooms priceFrom currency isVerified views';

/** Transform a populated hotel subdocument into the shape the frontend card expects. */
const transformHotel = (doc: any) => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc.toObject ? doc.toObject() : doc;
  return { id: encodeId(String(_id)), ...rest };
};

// @desc    Get user's favourite hotels
// @route   GET /api/hotel-favorites
// @access  Private
export const getHotelFavorites = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const favorites = await HotelFavorite.find({ userId })
      .populate({ path: 'hotelId', select: HOTEL_CARD_FIELDS })
      .sort({ createdAt: -1 });

    const hotels = favorites
      .filter((fav) => fav.hotelId != null)
      .map((fav) => transformHotel(fav.hotelId));

    res.json({ hotels });
  } catch (error: any) {
    apiLogger.error('Get hotel favorites error:', error);
    res.status(500).json({ message: 'Error fetching favourite hotels' });
  }
};

// @desc    Toggle hotel favourite (add or remove)
// @route   POST /api/hotel-favorites/toggle
// @access  Private
export const toggleHotelFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const rawHotelId = req.body.hotelId;
    if (!rawHotelId) {
      res.status(400).json({ message: 'Hotel ID is required' });
      return;
    }

    const hotelId = resolveId(rawHotelId) || rawHotelId;
    const hotel = await Hotel.findById(hotelId).select('_id');
    if (!hotel) {
      res.status(404).json({ message: 'Hotel not found' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const existing = await HotelFavorite.findOne({ userId, hotelId });

    if (existing) {
      await existing.deleteOne();
      res.json({ message: 'Hotel removed from favourites', isSaved: false });
    } else {
      await HotelFavorite.create({ userId, hotelId });
      res.json({ message: 'Hotel added to favourites', isSaved: true });
    }
  } catch (error: any) {
    if (error?.code === 11000) {
      // Race with a concurrent toggle — treat as already saved.
      res.json({ message: 'Hotel added to favourites', isSaved: true });
      return;
    }
    apiLogger.error('Toggle hotel favorite error:', error);
    res.status(500).json({ message: 'Error toggling hotel favorite' });
  }
};

// @desc    Check whether a hotel is favourited by the current user
// @route   GET /api/hotel-favorites/check/:hotelId
// @access  Private
export const checkHotelFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const rawHotelId = getParam(req, 'hotelId') || '';
    const hotelId = resolveId(rawHotelId) || rawHotelId;
    const userId = String((req.user as IUser)._id);
    const existing = await HotelFavorite.exists({ userId, hotelId });

    res.json({ isSaved: !!existing });
  } catch (error: any) {
    apiLogger.error('Check hotel favorite error:', error);
    res.status(500).json({ message: 'Error checking hotel favorite' });
  }
};
