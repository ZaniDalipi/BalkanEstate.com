import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  sendPropertyInquiry,
  sendAgentGeneralInquiry,
  sendAreaSearchInquiry,
} from '../controllers/inquiryController';

const router = express.Router();

// Rate limit inquiries to prevent spam (20 inquiries per hour per IP)
const inquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { message: 'You\'ve sent quite a few inquiries. Please wait a bit before sending more.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// All inquiry routes are public (no auth required)
// but rate-limited to prevent abuse

// Send inquiry about a specific property
router.post('/property', inquiryRateLimiter, sendPropertyInquiry);

// Send general inquiry to an agent
router.post('/agent', inquiryRateLimiter, sendAgentGeneralInquiry);

// Send area search inquiry (sent to multiple agents in an area)
router.post('/area-search', inquiryRateLimiter, sendAreaSearchInquiry);

export default router;
