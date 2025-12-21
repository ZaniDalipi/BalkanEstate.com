import express from 'express';
import {
  getSavedSearches,
  createSavedSearch,
  updateAccessTime,
  updateSavedSearch,
  deleteSavedSearch,
} from '../controllers/savedSearchController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.use(protect); // All routes are protected

router.get('/', getSavedSearches);
router.post('/', createSavedSearch);
router.patch('/:id/access', updateAccessTime);
router.put('/:id', updateSavedSearch);
router.delete('/:id', deleteSavedSearch);

export default router;
