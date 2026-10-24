import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth';
import {
  listPublic,
  getPublicBySlug,
  listPublicUnits,
  getPublicUnit,
  getResidenceForListing,
} from '../controllers/developmentController';
import { getPublishedScene, listPublicViews } from '../controllers/developmentSceneController';
import { sendUnitInquiry } from '../controllers/developmentInquiryController';
import {
  follow,
  getStatus,
  unfollow,
  listFollowing,
} from '../controllers/developmentFollowController';
import {
  nearbyDevelopments,
  requestAttachment,
} from '../controllers/developmentSuggestionController';

const router = express.Router();

// Same budget as the platform's other public inquiry endpoints (inquiryRoutes).
const unitInquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: 'Too many inquiries sent. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
});

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
router.get('/nearby', protect, nearbyDevelopments);
router.get('/for-listing/:listingId', getResidenceForListing);

router.get('/:slug/scene', getPublishedScene);
router.get('/:slug/views', listPublicViews);
router.get('/:slug/units/:unitId', getPublicUnit);
router.post('/:slug/units/:unitId/inquiries', unitInquiryRateLimiter, sendUnitInquiry);
router.get('/:slug/units', listPublicUnits);

// Follow / alerts (signed-in buyers)
router.get('/:slug/follow', protect, getStatus);
router.post('/:slug/follow', protect, follow);
router.delete('/:slug/follow', protect, unfollow);
router.post('/:slug/request-attachment', protect, requestAttachment);

router.get('/:slug', getPublicBySlug);

export default router;
