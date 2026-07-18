import express from 'express';
import {
  createHotelBooking,
  getHostBookings,
  updateBookingStatus,
} from '../controllers/hotelBookingController';
import { protect, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Guests can request a booking without an account; attach the user when present.
router.post('/', optionalAuth, createHotelBooking);

// Host dashboard
router.get('/host', protect, getHostBookings);
router.patch('/:id/status', protect, updateBookingStatus);

export default router;
