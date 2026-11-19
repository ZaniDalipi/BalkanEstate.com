import express from 'express';
import {
  createValuationController,
  getValuationController,
  getValuationHistoryController,
  getCityStatsController,
} from '../controllers/propertyValuationController';
import { protect, optionalAuth } from '../middleware/auth';
import { requireTurnstile } from '../middleware/requireTurnstile';

const router = express.Router();

// Public routes (optionalAuth allows both authenticated and unauthenticated users)
router.post('/', requireTurnstile(), optionalAuth, createValuationController);
router.get('/stats/:city/:country', getCityStatsController);
router.get('/:id', getValuationController);

// Protected routes (requires authentication)
router.get('/user/history', protect, getValuationHistoryController);

export default router;
