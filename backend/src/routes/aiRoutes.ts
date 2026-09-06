import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { roomStyleCooldownLimiter } from '../middleware/security';
import { withUploadErrors } from '../middleware/uploadErrors';
import { MAX_AI_ANALYSIS_IMAGES, MAX_AI_IMAGE_SIZE_BYTES } from '../config/uploadLimits';
import {
  generateDescription,
  calculateDistances,
  aiChat,
  generateSearchName,
  restyleRoom,
  getRoomStyleUsage,
} from '../controllers/aiController';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AI_IMAGE_SIZE_BYTES },
});

// All AI routes require authentication
router.use(protect);

// POST /api/ai/generate-description - Generate property description from images
// The file cap must match what the listing form allows to upload; a lower cap
// here makes multer reject the extra files with "Unexpected field".
router.post(
  '/generate-description',
  withUploadErrors(upload.array('images', MAX_AI_ANALYSIS_IMAGES), {
    field: 'images',
    maxFiles: MAX_AI_ANALYSIS_IMAGES,
    maxFileSizeBytes: MAX_AI_IMAGE_SIZE_BYTES,
  }),
  generateDescription
);

// POST /api/ai/calculate-distances - Calculate distances to key amenities
router.post('/calculate-distances', calculateDistances);

// POST /api/ai/chat - AI real estate assistant chat
router.post('/chat', aiChat);

// POST /api/ai/generate-search-name - Generate human-readable search name
router.post('/generate-search-name', generateSearchName);

// GET /api/ai/room-style/usage - Current user's room-styler usage + resolved limit
router.get('/room-style/usage', getRoomStyleUsage);

// POST /api/ai/restyle-room - Restyle a room photo into a chosen interior design style
// roomStyleCooldownLimiter caps rapid-fire spam (3/min per user) on top of the monthly quota.
router.post('/restyle-room', roomStyleCooldownLimiter, restyleRoom);

export default router;
