import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth';
import { roomStyleCooldownLimiter } from '../middleware/security';
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// All AI routes require authentication
router.use(protect);

// POST /api/ai/generate-description - Generate property description from images
router.post('/generate-description', upload.array('images', 20), generateDescription);

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
