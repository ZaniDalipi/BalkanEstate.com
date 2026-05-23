import express from 'express';
import { protect } from '../middleware/auth';
import { checkAdminRole, logAdminAction } from '../middleware/adminAuth';
import {
  list,
  get,
  create,
  update,
  remove,
  runNow,
  preview,
  confirmImport,
  stats,
} from '../controllers/listingSourceController';

const router = express.Router();

// All listing-source endpoints are admin-only.
router.use(protect);
router.use(checkAdminRole);

router.get('/', logAdminAction('LIST_LISTING_SOURCES'), list);
router.get('/:id', logAdminAction('VIEW_LISTING_SOURCE'), get);
router.post('/', logAdminAction('CREATE_LISTING_SOURCE'), create);
router.put('/:id', logAdminAction('UPDATE_LISTING_SOURCE'), update);
router.delete('/:id', logAdminAction('DELETE_LISTING_SOURCE'), remove);

router.post('/:id/run', logAdminAction('RUN_LISTING_SOURCE'), runNow);
router.post('/:id/preview', logAdminAction('PREVIEW_LISTING_SOURCE'), preview);
router.post('/:id/confirm-import', logAdminAction('CONFIRM_LISTING_SOURCE_IMPORT'), confirmImport);
router.get('/:id/stats', logAdminAction('LISTING_SOURCE_STATS'), stats);

export default router;
