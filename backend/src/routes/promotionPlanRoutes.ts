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

const router = express.Router();

// Public routes
router.get('/', getPromotionPlans);

// Admin routes
router.get('/admin', protect, checkAdminRole, getAdminPromotionPlans);
router.post('/', protect, checkAdminRole, createPromotionPlan);
router.put('/:id', protect, checkAdminRole, updatePromotionPlan);
router.delete('/:id', protect, checkAdminRole, deletePromotionPlan);
router.post('/:id/toggle-status', protect, checkAdminRole, togglePromotionPlanStatus);
router.post('/seed', protect, checkAdminRole, seedPromotionPlans);

export default router;
