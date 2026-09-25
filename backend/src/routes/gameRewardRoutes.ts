import express from 'express';
import { claimGameReward, getGameRewardStatus } from '../controllers/gameRewardController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.get('/status', protect, getGameRewardStatus);
router.post('/claim', protect, claimGameReward);

export default router;
