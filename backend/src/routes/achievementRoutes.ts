import express from 'express';
import {
  getUserAchievements,
  addUserAchievement,
  updateUserAchievement,
  deleteUserAchievement,
  getAgencyAchievements,
  addAgencyAchievement,
  updateAgencyAchievement,
  deleteAgencyAchievement,
  verifyAchievement,
} from '../controllers/achievementController';
import { protect, adminProtect } from '../middleware/auth';

const router = express.Router();

// User (Agent) Achievements
router.get('/user/:userId', getUserAchievements);
router.post('/user', protect, addUserAchievement);
router.put('/user/:achievementId', protect, updateUserAchievement);
router.delete('/user/:achievementId', protect, deleteUserAchievement);

// Agency Achievements
router.get('/agency/:agencyId', getAgencyAchievements);
router.post('/agency/:agencyId', protect, addAgencyAchievement);
router.put('/agency/:agencyId/:achievementId', protect, updateAgencyAchievement);
router.delete('/agency/:agencyId/:achievementId', protect, deleteAgencyAchievement);

// Admin verification
router.post('/verify/:type/:entityId/:achievementId', protect, adminProtect, verifyAchievement);

export default router;
