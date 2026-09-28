import express from 'express';
import { protect } from '../middleware/auth';
import { checkAdminRole, logAdminAction } from '../middleware/adminAuth';
import {
  getConfig,
  list,
  queueProperty,
  approve,
  reject,
  restore,
  groupShared,
} from '../controllers/socialPostController';

const router = express.Router();

// The social share queue is admin-only: nothing is posted without approval.
router.use(protect);
router.use(checkAdminRole);

router.get('/config', getConfig);
router.get('/', list);
router.post('/queue', logAdminAction('QUEUE_SOCIAL_POST'), queueProperty);
router.post('/:id/approve', logAdminAction('APPROVE_SOCIAL_POST'), approve);
router.post('/:id/reject', logAdminAction('REJECT_SOCIAL_POST'), reject);
router.post('/:id/restore', logAdminAction('RESTORE_SOCIAL_POST'), restore);
router.post('/:id/group-shared', logAdminAction('MARK_SOCIAL_GROUP_SHARED'), groupShared);

export default router;
