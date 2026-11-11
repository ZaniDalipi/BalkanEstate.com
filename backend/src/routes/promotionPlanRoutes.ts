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
import { protect } from '../middleware/auth';
import { checkAdminRole } from '../middleware/adminAuth';
import { requireAdminStepUp } from '../middleware/adminStepUp';

const router = express.Router();

// Public routes
router.get('/', getPromotionPlans);

// Admin routes
router.get('/admin', protect, checkAdminRole, getAdminPromotionPlans);
router.post('/', protect, checkAdminRole, requireAdminStepUp, createPromotionPlan);
router.put('/:id', protect, checkAdminRole, requireAdminStepUp, updatePromotionPlan);
router.delete('/:id', protect, checkAdminRole, requireAdminStepUp, deletePromotionPlan);
router.post('/:id/toggle-status', protect, checkAdminRole, requireAdminStepUp, togglePromotionPlanStatus);
router.post('/seed', protect, checkAdminRole, requireAdminStepUp, seedPromotionPlans);

export default router;
