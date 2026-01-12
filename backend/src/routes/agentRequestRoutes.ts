import express from 'express';
import {
  createAgentRequest,
  getAllAgentRequests,
  getAgentRequests,
  updateAgentRequestStatus,
  getAgentRequestStats,
} from '../controllers/agentRequestController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', createAgentRequest);

// Protected routes (for agents to view their assigned requests)
router.get('/agent/:agentId', protect, getAgentRequests);

// Admin routes
router.get('/stats', protect, getAgentRequestStats);
router.get('/', protect, getAllAgentRequests);
router.patch('/:id/status', protect, updateAgentRequestStatus);

export default router;
