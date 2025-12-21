import express from 'express';
import {
  getFavorites,
  toggleFavorite,
  checkFavorite,
} from '../controllers/favoriteController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getFavorites);
router.post('/toggle', toggleFavorite);
router.get('/check/:propertyId', checkFavorite);

export default router;
