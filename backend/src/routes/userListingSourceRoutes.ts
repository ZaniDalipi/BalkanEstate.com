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
} from '../controllers/userListingSourceController';

const router = express.Router();

// Authenticated users only. Each handler scopes its query to req.user._id
// so users can only ever see/modify their own sources.
router.use(protect);

router.get('/', list);
router.get('/:id', get);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

router.post('/:id/run', runNow);
router.get('/:id/stats', stats);

export default router;
