import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth';
import {
  getPropertyRequests,
  createPropertyRequest,
  getMyPropertyRequests,
  closePropertyRequest,
  getPropertyRequestStats,
} from '../controllers/propertyRequestController';

const router = express.Router();

const requestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many property requests submitted. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes
router.get('/', getPropertyRequests);
router.get('/stats', getPropertyRequestStats);

// Rate-limited submission (auth optional - guests can also submit)
router.post('/', requestRateLimiter, createPropertyRequest);

// Authenticated routes
router.get('/my', protect, getMyPropertyRequests);
router.patch('/:id/close', protect, closePropertyRequest);

export default router;
