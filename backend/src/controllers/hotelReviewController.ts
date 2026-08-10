import { Request, Response } from 'express';
import mongoose from 'mongoose';
import HotelReview, { REVIEW_CATEGORIES } from '../models/HotelReview';
import Hotel from '../models/Hotel';
import { IUser } from '../models/User';
import { apiLogger } from '../utils/logger';
import { encodeId, resolveId } from '../utils/idObfuscation';
import { getParam } from '../utils/validateParams';

const clampScore = (v: any): number | undefined => {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(5, Math.max(1, Math.round(n)));
};

const transformReview = (doc: any) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { _id, __v, guest, hotel, ...rest } = obj;
  return { id: encodeId(String(_id)), ...rest };
};

/** Recompute the hotel's aggregate rating + count after any review change. */
const recomputeHotelRating = async (hotelId: mongoose.Types.ObjectId | string) => {
  const agg = await HotelReview.aggregate([
    { $match: { hotel: new mongoose.Types.ObjectId(String(hotelId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg || 0;
  const count = agg[0]?.count || 0;
  await Hotel.findByIdAndUpdate(hotelId, { avgRating: Math.round(avg * 10) / 10, reviewCount: count });
};

// @desc    Create or update the signed-in guest's review for a hotel
// @route   POST /api/hotel-reviews
// @access  Private
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const currentUser = req.user as IUser;
    const hotelId = resolveId(req.body.hotelId) || req.body.hotelId;
    const hotel = await Hotel.findById(hotelId).select('_id owner');
    if (!hotel) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }
    if (String(hotel.owner) === String(currentUser._id)) {
      res.status(403).json({ message: 'You cannot review your own property' });
      return;
    }
    const rating = clampScore(req.body.rating);
    if (!rating) {
      res.status(400).json({ message: 'A rating between 1 and 5 is required' });
      return;
    }

    const update: Record<string, any> = {
      guestName: currentUser.name,
      guestAvatar: currentUser.avatarUrl,
      rating,
      comment: typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 2000) : undefined,
    };
    for (const cat of REVIEW_CATEGORIES) {
      update[cat] = clampScore(req.body[cat]);
    }

    const review = await HotelReview.findOneAndUpdate(
      { hotel: hotel._id, guest: currentUser._id },
      { $set: update, $setOnInsert: { hotel: hotel._id, guest: currentUser._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recomputeHotelRating(hotel._id as mongoose.Types.ObjectId);

    res.status(201).json({ review: transformReview(review), message: 'Review saved' });
  } catch (error: any) {
    apiLogger.error('Create hotel review error:', error);
    res.status(500).json({ message: 'Failed to save review' });
  }
};

// @desc    List reviews for a hotel with an aggregate summary
// @route   GET /api/hotel-reviews/hotel/:hotelId
// @access  Public
export const getHotelReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = getParam(req, 'hotelId');
    const hotelId = resolveId(raw) || raw;
    if (!mongoose.isValidObjectId(hotelId)) {
      res.status(400).json({ message: 'Invalid property id' });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const hotelObjectId = new mongoose.Types.ObjectId(String(hotelId));
    const [reviews, total, summaryAgg] = await Promise.all([
      HotelReview.find({ hotel: hotelObjectId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      HotelReview.countDocuments({ hotel: hotelObjectId }),
      HotelReview.aggregate([
        { $match: { hotel: hotelObjectId } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            cleanliness: { $avg: '$cleanliness' },
            location: { $avg: '$location' },
            value: { $avg: '$value' },
            service: { $avg: '$service' },
          },
        },
      ]),
    ]);

    const s = summaryAgg[0] || {};
    const round = (v: any) => (v == null ? null : Math.round(v * 10) / 10);
    const summary = {
      avgRating: round(s.avgRating) || 0,
      reviewCount: total,
      categories: {
        cleanliness: round(s.cleanliness),
        location: round(s.location),
        value: round(s.value),
        service: round(s.service),
      },
    };

    res.json({
      reviews: reviews.map(transformReview),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      summary,
    });
  } catch (error: any) {
    apiLogger.error('Get hotel reviews error:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

// @desc    Delete the signed-in guest's own review
// @route   DELETE /api/hotel-reviews/:id
// @access  Private
export const deleteReview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    const reviewId = resolveId(getParam(req, 'id')) || getParam(req, 'id');
    const review = await HotelReview.findById(reviewId);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }
    if (String(review.guest) !== String((req.user as IUser)._id)) {
      res.status(403).json({ message: 'Not authorized to delete this review' });
      return;
    }
    const hotelId = review.hotel;
    await review.deleteOne();
    await recomputeHotelRating(hotelId as mongoose.Types.ObjectId);
    res.json({ message: 'Review deleted' });
  } catch (error: any) {
    apiLogger.error('Delete hotel review error:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
};
