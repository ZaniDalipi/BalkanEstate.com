import express from 'express';
import { protect } from '../middleware/auth';
import {
  list,
  get,
  create,
  update,
  remove,
  runNow,
  stats,
  detect,
  bulkDelete,
  clearImports,
} from '../controllers/userListingSourceController';

const router = express.Router();

// Authenticated users only. Each handler scopes its query to req.user._id
// so users can only ever see/modify their own sources.
router.use(protect);

router.get('/', list);
router.post('/', create);

// Static routes — must precede /:id so they aren't parsed as an ObjectId param.
router.post('/detect', detect);
router.post('/bulk-delete', bulkDelete);

router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

router.post('/:id/run', runNow);
router.post('/:id/clear-imports', clearImports);
router.get('/:id/stats', stats);

export default router;
