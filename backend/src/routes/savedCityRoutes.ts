import express from 'express';
import {
  getSavedCities,
  toggleSavedCityController,
  checkSavedCity,
} from '../controllers/savedCityController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // Following a city is always tied to an account

router.get('/', getSavedCities);
router.post('/toggle', toggleSavedCityController);
router.get('/check/:city/:country', checkSavedCity);

export default router;
