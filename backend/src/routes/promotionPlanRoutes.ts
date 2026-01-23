import express from 'express';
import {
  getPromotionPlans,
  getAdminPromotionPlans,
  createPromotionPlan,
  updatePromotionPlan,
  deletePromotionPlan,
  togglePromotionPlanStatus,
  seedPromotionPlans,
} from '../controllers/promotionPlanController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/', getPromotionPlans);

// Admin routes
router.get('/admin', authMiddleware, adminMiddleware, getAdminPromotionPlans);
router.post('/', authMiddleware, adminMiddleware, createPromotionPlan);
router.put('/:id', authMiddleware, adminMiddleware, updatePromotionPlan);
router.delete('/:id', authMiddleware, adminMiddleware, deletePromotionPlan);
router.post('/:id/toggle-status', authMiddleware, adminMiddleware, togglePromotionPlanStatus);
router.post('/seed', authMiddleware, adminMiddleware, seedPromotionPlans);

export default router;
