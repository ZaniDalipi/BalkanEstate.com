import express from 'express';
import multer from 'multer';
import {
  getBusinessListings,
  getBusinessListing,
  createBusinessListing,
  updateBusinessListing,
  deleteBusinessListing,
  uploadBusinessLogo,
  uploadBusinessBanner,
  getMyBusinessListings,
} from '../controllers/businessListingController';
import { protect } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { askBusinessListing } from '../controllers/businessAssistantController';

/** "Ask the business": public, so limited per visitor IP to protect the AI quota. */
const askRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development',
  message: { message: 'You have asked a lot of questions — please try again later, or contact the business directly.' },
  validate: { xForwardedForHeader: false },
});

const router = express.Router();

// Configure multer for memory storage (logo uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    // Block SVG to prevent stored XSS
    if (file.mimetype === 'image/svg+xml') {
      cb(new Error('SVG files are not allowed'));
      return;
    }
    cb(null, true);
  },
});

// Public routes
router.get('/', getBusinessListings);

// Protected routes (must come before /:id to avoid conflicts)
router.get('/my-listings', protect, getMyBusinessListings);
router.post('/', protect, createBusinessListing);

// Parameterized routes
router.get('/:id', getBusinessListing);
router.post('/:id/ask', askRateLimiter, askBusinessListing);
router.put('/:id', protect, updateBusinessListing);
router.delete('/:id', protect, deleteBusinessListing);
router.post('/:id/upload-logo', protect, upload.single('logo'), uploadBusinessLogo);
router.post('/:id/upload-banner', protect, upload.single('banner'), uploadBusinessBanner);

export default router;
