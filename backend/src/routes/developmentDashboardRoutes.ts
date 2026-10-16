import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/checkSubscription';
import {
  developmentAuth,
  requireDevelopmentPermission,
} from '../middleware/developmentAuth';
import {
  create,
  listMine,
  getOne,
  getStructure,
  update,
  publish,
  uploadCover,
  remove,
  addBuilding,
  addFloor,
  addUnit,
  getUnits,
  updateAvailability,
} from '../controllers/developmentController';
import {
  attach,
  detach,
  previewConflicts,
  bulkAttachListings,
} from '../controllers/developmentListingController';

const router = express.Router();

// In-memory upload for the cover image (handed to the media service as a buffer).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/**
 * Authored (dashboard) development routes.
 *
 * Creating a development requires an active subscription plan
 * (`requireActiveSubscription`). Every other route is resource-scoped: after
 * `developmentAuth` resolves the caller's role on the development, each
 * mutation is guarded by the specific permission from the shared matrix.
 */

// Collection level
router.post('/', protect, requireActiveSubscription, create);
router.get('/', protect, listMine);

// Single development
router.get('/:developmentId', protect, developmentAuth, getOne);
router.get('/:developmentId/structure', protect, developmentAuth, getStructure);
router.post(
  '/:developmentId/cover',
  protect,
  developmentAuth,
  requireDevelopmentPermission('media.upload'),
  upload.single('cover'),
  uploadCover
);
router.patch(
  '/:developmentId',
  protect,
  developmentAuth,
  requireDevelopmentPermission('project.edit'),
  update
);
router.post(
  '/:developmentId/publish',
  protect,
  developmentAuth,
  requireDevelopmentPermission('publish'),
  publish
);
// Deletion is owner-only; only `owner` holds `ownership.transfer`.
router.delete(
  '/:developmentId',
  protect,
  developmentAuth,
  requireDevelopmentPermission('ownership.transfer'),
  remove
);

// Inventory
router.post(
  '/:developmentId/buildings',
  protect,
  developmentAuth,
  requireDevelopmentPermission('building.manage'),
  addBuilding
);
router.post(
  '/:developmentId/floors',
  protect,
  developmentAuth,
  requireDevelopmentPermission('floor.manage'),
  addFloor
);
router.post(
  '/:developmentId/units',
  protect,
  developmentAuth,
  requireDevelopmentPermission('unit.manage'),
  addUnit
);
router.get('/:developmentId/units', protect, developmentAuth, getUnits);
router.patch(
  '/:developmentId/units/:unitId/availability',
  protect,
  developmentAuth,
  requireDevelopmentPermission('availability.change'),
  updateAvailability
);

// Existing-listing attachment (highest-priority feature)
router.post(
  '/:developmentId/units/:unitId/listings/preview',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.attach'),
  previewConflicts
);
router.post(
  '/:developmentId/units/:unitId/listings',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.attach'),
  attach
);
router.delete(
  '/:developmentId/units/:unitId/listings/:listingId',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.detach'),
  detach
);
router.post(
  '/:developmentId/listings/bulk-attach',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.attach'),
  bulkAttachListings
);

export default router;
