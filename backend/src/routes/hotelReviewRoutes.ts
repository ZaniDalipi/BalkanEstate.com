import express from 'express';
import {
  createReview,
  getHotelReviews,
  deleteReview,
} from '../controllers/hotelReviewController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public: read reviews for a property
router.get('/hotel/:hotelId', getHotelReviews);

// Protected: create/update or delete your own review
router.post('/', protect, createReview);
router.delete('/:id', protect, deleteReview);

export default router;
