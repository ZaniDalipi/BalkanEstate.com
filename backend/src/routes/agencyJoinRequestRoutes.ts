import express from 'express';
import {
  createJoinRequest,
  getAgencyJoinRequests,
  getAgentJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  joinByInvitationCode,
} from '../controllers/agencyJoinRequestController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Create a join request
router.post('/', protect, createJoinRequest);

// Join agency using invitation code
router.post('/join-by-code', protect, joinByInvitationCode);

// Get all join requests for the current agent
router.get('/my-requests', protect, getAgentJoinRequests);

// Get all join requests for an agency (agency owner only)
router.get('/agency/:agencyId', protect, getAgencyJoinRequests);

// Approve a join request (agency owner only)
router.put('/:requestId/approve', protect, approveJoinRequest);

// Reject a join request (agency owner only)
router.put('/:requestId/reject', protect, rejectJoinRequest);

// Cancel a join request (agent only)
router.delete('/:requestId', protect, cancelJoinRequest);

export default router;
