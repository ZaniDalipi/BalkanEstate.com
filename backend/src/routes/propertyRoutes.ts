import express from 'express';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getMyListings,
  uploadImages,
  markAsSold,
  renewProperty,
} from '../controllers/propertyController';
import { protect } from '../middleware/auth';
import { upload } from '../utils/upload';

const router = express.Router();

// Public routes
router.get('/', getProperties);
router.get('/:id', getProperty);

// Protected routes
router.post('/', protect, createProperty);
router.put('/:id', protect, updateProperty);
router.delete('/:id', protect, deleteProperty);
router.get('/my/listings', protect, getMyListings);
// Upload images - can be used with or without propertyId
router.post('/upload-images', protect, upload.array('images', 30), uploadImages);
router.post('/:propertyId/upload-images', protect, upload.array('images', 30), uploadImages);
router.patch('/:id/mark-sold', protect, markAsSold);
router.patch('/:id/renew', protect, renewProperty);

export default router;
