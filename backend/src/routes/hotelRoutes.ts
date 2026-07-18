import express from 'express';
import multer from 'multer';
import {
  getHotels,
  getHotel,
  getMyHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  uploadHotelCover,
  uploadHotelPhotos,
  uploadHotelImage,
} from '../controllers/hotelController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage (image uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
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
router.get('/', getHotels);

// Protected routes (must come before /:id to avoid conflicts)
router.get('/my-listings', protect, getMyHotels);
router.post('/', protect, createHotel);
router.post('/upload-image', protect, upload.single('image'), uploadHotelImage);

// Parameterized routes
router.get('/:id', getHotel);
router.put('/:id', protect, updateHotel);
router.delete('/:id', protect, deleteHotel);
router.post('/:id/upload-cover', protect, upload.single('cover'), uploadHotelCover);
router.post('/:id/upload-photos', protect, upload.array('photos', 15), uploadHotelPhotos);

export default router;
