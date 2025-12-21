import express from 'express';
import {
  getAgents,
  getAgent,
  getAgentByUserId,
  updateAgentProfile,
  addTestimonial,
  addReview,
  leaveAgency,
} from '../controllers/agentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAgents);
router.get('/user/:userId', getAgentByUserId);
router.get('/:id', getAgent);

// Protected routes
router.put('/profile', protect, updateAgentProfile);
router.post('/:id/reviews', protect, addReview);
router.post('/:id/testimonials', protect, addTestimonial); // Deprecated - use /reviews instead
router.post('/leave-agency', protect, leaveAgency);

export default router;
