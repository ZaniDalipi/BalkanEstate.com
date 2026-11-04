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
router.put('/:id', protect, updateBusinessListing);
router.delete('/:id', protect, deleteBusinessListing);
router.post('/:id/upload-logo', protect, upload.single('logo'), uploadBusinessLogo);
router.post('/:id/upload-banner', protect, upload.single('banner'), uploadBusinessBanner);

export default router;
