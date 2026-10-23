import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/checkSubscription';
import { mutationRateLimiter, uploadRateLimiter } from '../middleware/security';
import { withUploadErrors } from '../middleware/uploadErrors';
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
  updateUnit,
  deleteUnit,
  bulkUpdateUnits,
  exportUnitsCsv,
  uploadUnitFloorplan,
  deleteUnitFloorplan,
  uploadUnitGallery,
  deleteUnitGalleryImage,
  listAudit,
  structureDeleteImpact,
  deleteStructureHandler,
  updateBuilding,
  updateFloor,
} from '../controllers/developmentController';
import {
  attach,
  detach,
  previewConflicts,
  bulkAttachListings,
  listControllableListings,
} from '../controllers/developmentListingController';
import {
  upsertSceneImage,
  listScenes,
  getScene,
  saveDraft,
  publishScene,
  deleteScene,
  updateSceneMeta,
  unpublishScene,
} from '../controllers/developmentSceneController';
import { attachListing } from '../controllers/developmentSuggestionController';

const router = express.Router();

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** A single-image upload whose errors become clear 4xx responses (withUploadErrors). */
const MAX_GALLERY_FILES = 10;
const galleryImages = (field: string) =>
  withUploadErrors(uploadMany.array(field, MAX_GALLERY_FILES), {
    field,
    maxFiles: MAX_GALLERY_FILES,
    maxFileSizeBytes: MAX_IMAGE_BYTES,
  });

const singleImage = (field: string) =>
  withUploadErrors(upload.single(field), { field, maxFiles: 1, maxFileSizeBytes: MAX_IMAGE_BYTES });

// In-memory upload for cover, scene and floorplan images (handed to the media
// service as a buffer). Raster formats only: SVG is refused because an uploaded
// SVG can carry script. The media service still decodes every file, so a
// mislabelled non-image fails there too.
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 }, // 10 MB, one file
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP or AVIF images are accepted'));
  },
});
// Same rules, several files at once (unit gallery).
const uploadMany = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ACCEPTED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, WebP or AVIF images are accepted'));
  },
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
  singleImage('cover'),
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
router.patch(
  '/:developmentId/buildings/:buildingId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('building.manage'),
  updateBuilding
);
router.patch(
  '/:developmentId/floors/:floorId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('floor.manage'),
  updateFloor
);
router.get(
  '/:developmentId/buildings/:buildingId/delete-impact',
  protect,
  developmentAuth,
  requireDevelopmentPermission('building.manage'),
  structureDeleteImpact('building')
);
router.delete(
  '/:developmentId/buildings/:buildingId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('building.manage'),
  deleteStructureHandler('building')
);
router.get(
  '/:developmentId/floors/:floorId/delete-impact',
  protect,
  developmentAuth,
  requireDevelopmentPermission('floor.manage'),
  structureDeleteImpact('floor')
);
router.delete(
  '/:developmentId/floors/:floorId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('floor.manage'),
  deleteStructureHandler('floor')
);
router.post(
  '/:developmentId/units',
  protect,
  developmentAuth,
  requireDevelopmentPermission('unit.manage'),
  addUnit
);
router.get('/:developmentId/units', protect, developmentAuth, getUnits);
// Static unit paths before /units/:unitId so they are not captured as an id.
router.get('/:developmentId/units/export.csv', protect, developmentAuth, exportUnitsCsv);
// Bulk edits: the handler requires availability.change and/or unit.manage
// depending on which fields the request changes (field-level authz).
router.post(
  '/:developmentId/units/bulk',
  protect,
  mutationRateLimiter,
  developmentAuth,
  bulkUpdateUnits
);
// General unit edit: field-level authz in the handler (unit.manage for
// structure, price.change for price fields, availability.change for status).
router.patch(
  '/:developmentId/units/:unitId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  updateUnit
);
router.delete(
  '/:developmentId/units/:unitId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('unit.manage'),
  deleteUnit
);
router.post(
  '/:developmentId/units/:unitId/floorplan',
  protect,
  uploadRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('media.upload'),
  singleImage('floorplan'),
  uploadUnitFloorplan
);
router.delete(
  '/:developmentId/units/:unitId/floorplan',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('unit.manage'),
  deleteUnitFloorplan
);
router.post(
  '/:developmentId/units/:unitId/gallery',
  protect,
  uploadRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('media.upload'),
  galleryImages('images'),
  uploadUnitGallery
);
router.delete(
  '/:developmentId/units/:unitId/gallery/:index',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('unit.manage'),
  deleteUnitGalleryImage
);
router.get('/:developmentId/audit', protect, developmentAuth, requireDevelopmentPermission('team.manage'), listAudit);
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
// Associate a listing with the development (no specific unit) — used by the
// "attach to this nearby development" suggestion.
router.post(
  '/:developmentId/attach-listing',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.attach'),
  attachListing
);
// The caller's controllable listings, for the scene editor's listing picker.
router.get(
  '/:developmentId/attachable-listings',
  protect,
  developmentAuth,
  requireDevelopmentPermission('listing.attach'),
  listControllableListings
);

// Interactive scenes (visual map / floor-plan editor)
router.get('/:developmentId/scenes', protect, developmentAuth, listScenes);
router.post(
  '/:developmentId/scenes',
  protect,
  uploadRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('scene.edit'),
  singleImage('image'),
  upsertSceneImage
);
router.get('/:developmentId/scenes/:sceneId', protect, developmentAuth, getScene);
router.patch(
  '/:developmentId/scenes/:sceneId',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('scene.edit'),
  updateSceneMeta
);
router.patch(
  '/:developmentId/scenes/:sceneId/draft',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('scene.edit'),
  saveDraft
);
router.post(
  '/:developmentId/scenes/:sceneId/publish',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('publish'),
  publishScene
);
router.post(
  '/:developmentId/scenes/:sceneId/unpublish',
  protect,
  mutationRateLimiter,
  developmentAuth,
  requireDevelopmentPermission('publish'),
  unpublishScene
);
router.delete(
  '/:developmentId/scenes/:sceneId',
  protect,
  developmentAuth,
  requireDevelopmentPermission('scene.edit'),
  deleteScene
);

export default router;
