import express from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth, protect } from '../middleware/auth';
import {
  deleteOpenHouse,
  deleteRsvp,
  getMyOpenHouses,
  getPropertyOpenHouses,
  postOpenHouse,
  postRsvp,
} from '../controllers/openHouseController';
import { requireTurnstile } from '../middleware/requireTurnstile';

const router = express.Router();

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/** Sign-ups are public, so cap them per IP like viewing requests. */
const rsvpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many sign-ups. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment,
});

router.get('/mine', protect, getMyOpenHouses);
router.get('/property/:propertyId', optionalAuth, getPropertyOpenHouses);
router.post('/', protect, postOpenHouse);
router.delete('/:id', protect, deleteOpenHouse);
router.post('/:id/rsvp', rsvpRateLimiter, requireTurnstile(), optionalAuth, postRsvp);
router.delete('/:id/rsvp', rsvpRateLimiter, optionalAuth, deleteRsvp);

export default router;
