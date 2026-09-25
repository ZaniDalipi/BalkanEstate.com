import express from 'express';
import { claimGameReward } from '../controllers/gameRewardController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/claim', protect, claimGameReward);

export default router;
