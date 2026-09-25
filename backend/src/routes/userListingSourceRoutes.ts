import express from 'express';
import { protect } from '../middleware/auth';
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
  detect,
  bulkDelete,
  clearImports,
  getTermsStatus,
  acceptTerms,
} from '../controllers/userListingSourceController';
import * as review from '../controllers/importReviewController';

const router = express.Router();

// Authenticated users only. Each handler scopes its query to req.user._id
// so users can only ever see/modify their own sources.
router.use(protect);

router.get('/', list);
router.post('/', create);

// Static routes — must precede /:id so they aren't parsed as an ObjectId param.
router.get('/terms-status', getTermsStatus);
router.post('/accept-terms', acceptTerms);
router.post('/detect', detect);
router.post('/bulk-delete', bulkDelete);

// Review queue for fetched listings — nothing from a user's feed goes live
// until it is accepted here.
router.get('/review', review.list);
router.get('/review/count', review.count);
router.post('/review/bulk', review.bulk);
router.get('/review/:draftId', review.get);
router.patch('/review/:draftId', review.edit);
router.post('/review/:draftId/accept', review.accept);
router.post('/review/:draftId/reject', review.reject);
router.post('/review/:draftId/restore', review.restore);

router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

router.post('/:id/run', runNow);
router.post('/:id/preview', preview);
router.post('/:id/confirm-import', confirmImport);
router.post('/:id/clear-imports', clearImports);
router.get('/:id/stats', stats);

export default router;
