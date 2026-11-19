import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { sendContactInquiry, uploadAdvertisingImage } from '../controllers/inquiryController';
import {
  sendPropertyInquiry,
  sendAgentGeneralInquiry,
  sendAreaSearchInquiry,
} from '../controllers/buyerInquiryController';
import { decryptPayload } from '../middleware/decryptPayload';
import { optionalAuth } from '../middleware/auth';
import { rateLimitStore } from '../middleware/redisRateLimitStore';
import { requireTurnstile } from '../middleware/requireTurnstile';

const router = express.Router();

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// First line of defence against spam: 15 inquiry requests per hour per IP,
// counted in Redis when REDIS_URL is set so every server instance shares them.
// The per-email / per-IP rules in services/inquiries/senderLimits.ts sit
// behind this and also hold in development.
const inquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  store: rateLimitStore('inquiries'),
  passOnStoreError: true,
  message: { message: 'Too many inquiries sent. Please try again later.', code: 'sender_limit' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
  validate: { xForwardedForHeader: false },
});

// Image upload for advertising creatives (public, image only, 5MB, no SVG).
const adImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    if (file.mimetype === 'image/svg+xml') {
      cb(new Error('SVG files are not allowed'));
      return;
    }
    cb(null, true);
  },
});

// All inquiry routes are public (no auth required) but rate-limited.
// optionalAuth records a signed-in sender as the inquiry's buyerId.

// Send inquiry about a specific property
router.post('/property', inquiryRateLimiter, requireTurnstile(), decryptPayload, optionalAuth, sendPropertyInquiry);

// Send general inquiry to an agent
router.post('/agent', inquiryRateLimiter, requireTurnstile(), decryptPayload, optionalAuth, sendAgentGeneralInquiry);

// Send area search inquiry (sent to multiple agents in an area)
router.post('/area-search', inquiryRateLimiter, requireTurnstile(), decryptPayload, optionalAuth, sendAreaSearchInquiry);

// Send contact form inquiry to platform team
router.post('/contact', inquiryRateLimiter, requireTurnstile(), decryptPayload, sendContactInquiry);

// Upload an advertising creative (attached to an advertising contact request)
router.post('/advertising-image', inquiryRateLimiter, adImageUpload.single('image'), uploadAdvertisingImage);

export default router;
