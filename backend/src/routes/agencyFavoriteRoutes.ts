import express from 'express';
import {
  getAgencyFavorites,
  toggleAgencyFavorite,
  checkAgencyFavorite,
} from '../controllers/agencyFavoriteController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect);

router.get('/', getAgencyFavorites);
router.post('/toggle', toggleAgencyFavorite);
router.get('/check/:agencyId', checkAgencyFavorite);

export default router;
