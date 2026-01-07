import express from 'express';
import {
  getSavedSearches,
  createSavedSearch,
  updateAccessTime,
  updateSavedSearch,
  updateAlertSettings,
  deleteSavedSearch,
  deleteAllSavedSearches,
} from '../controllers/savedSearchController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getSavedSearches);
router.post('/', createSavedSearch);
router.delete('/all', deleteAllSavedSearches); // Must be before /:id
router.patch('/:id/access', updateAccessTime);
router.patch('/:id/alerts', updateAlertSettings);
router.put('/:id', updateSavedSearch);
router.delete('/:id', deleteSavedSearch);

export default router;
