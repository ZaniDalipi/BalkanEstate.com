import express from 'express';
import {
  getHotelFavorites,
  toggleHotelFavorite,
  checkHotelFavorite,
} from '../controllers/hotelFavoriteController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getHotelFavorites);
router.post('/toggle', toggleHotelFavorite);
router.get('/check/:hotelId', checkHotelFavorite);

export default router;
