import express from 'express';
import { protect } from '../middleware/auth';
import {
  listPublic,
  getPublicBySlug,
  listPublicUnits,
  getPublicUnit,
} from '../controllers/developmentController';
import { getPublishedScene } from '../controllers/developmentSceneController';
import {
  follow,
  getStatus,
  unfollow,
  listFollowing,
} from '../controllers/developmentFollowController';

const router = express.Router();

/**
 * Public development routes. Read endpoints expose only published developments
 * and never any private ownership/lead/team information. The follow endpoints
 * require a signed-in user (a buyer) and are scoped to that user.
 *
 * Route order matters: the static `/following` path is declared before the
 * `/:slug` catch-all so it is never swallowed by it.
 */
router.get('/', listPublic);
router.get('/following', protect, listFollowing);

router.get('/:slug/scene', getPublishedScene);
router.get('/:slug/units/:unitId', getPublicUnit);
router.get('/:slug/units', listPublicUnits);

// Follow / alerts (signed-in buyers)
router.get('/:slug/follow', protect, getStatus);
router.post('/:slug/follow', protect, follow);
router.delete('/:slug/follow', protect, unfollow);

router.get('/:slug', getPublicBySlug);

export default router;
