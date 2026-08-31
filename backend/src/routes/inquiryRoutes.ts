import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import {
  sendPropertyInquiry,
  sendAgentGeneralInquiry,
  sendAreaSearchInquiry,
  sendContactInquiry,
  uploadAdvertisingImage,
} from '../controllers/inquiryController';
import { decryptPayload } from '../middleware/decryptPayload';

const router = express.Router();

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Rate limit inquiries to prevent spam (10 inquiries per hour per IP)
const inquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: { message: 'Too many inquiries sent. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDevelopment, // Skip rate limiting in development
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

// All inquiry routes are public (no auth required)
// but rate-limited to prevent abuse

// Send inquiry about a specific property
router.post('/property', inquiryRateLimiter, decryptPayload, sendPropertyInquiry);

// Send general inquiry to an agent
router.post('/agent', inquiryRateLimiter, decryptPayload, sendAgentGeneralInquiry);

// Send area search inquiry (sent to multiple agents in an area)
router.post('/area-search', inquiryRateLimiter, decryptPayload, sendAreaSearchInquiry);

// Send contact form inquiry to platform team
router.post('/contact', inquiryRateLimiter, decryptPayload, sendContactInquiry);

// Upload an advertising creative (attached to an advertising contact request)
router.post('/advertising-image', inquiryRateLimiter, adImageUpload.single('image'), uploadAdvertisingImage);

export default router;
