import express from 'express';
import multer from 'multer';
import {
  createAgency,
  getAgencies,
  getAgency,
  updateAgency,
  addAgentToAgency,
  removeAgentFromAgency,
  getFeaturedAgencies,
  uploadAgencyLogo,
  uploadAgencyCover,
  joinAgencyByInvitationCode,
  verifyInvitationCode,
  findAgencyByInvitationCode,
  addAgencyAdmin,
  removeAgencyAdmin,
  leaveAgency,
  generateAgentCoupons,
  redeemAgentCoupon,
  getAgencyCoupons,
  usePromotionCoupon,
  getAgencyAgents,
  migrateAgentSubscriptions,
  sendPromotionCouponsEmailEndpoint,
} from '../controllers/agencyController';
import { protect, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  },
});

// Public routes (static paths first)
router.get('/', getAgencies);
router.get('/featured/rotation', getFeaturedAgencies);

// Protected routes (static paths)
router.post('/', protect, createAgency);
router.post('/join-by-code', protect, joinAgencyByInvitationCode);
router.post('/find-by-code', protect, findAgencyByInvitationCode);
router.post('/leave', protect, leaveAgency);
router.post('/coupons/redeem', protect, redeemAgentCoupon); // Redeem agent coupon (any user)
router.post('/migrate-agent-subscriptions', protect, migrateAgentSubscriptions);

// Nested :id routes (MUST be before the catch-all /:idOrSlug and /:country/:name)
router.put('/:id', protect, updateAgency);
router.post('/:id/agents', protect, addAgentToAgency);
router.delete('/:id/agents/:agentId', protect, removeAgentFromAgency);
router.get('/:id/agents', protect, getAgencyAgents);
router.post('/:id/verify-code', protect, verifyInvitationCode);
router.post('/:id/admins', protect, addAgencyAdmin);
router.delete('/:id/admins/:userId', protect, removeAgencyAdmin);
router.post('/:id/upload-logo', protect, upload.single('logo'), uploadAgencyLogo);
router.post('/:id/upload-cover', protect, upload.single('cover'), uploadAgencyCover);
router.get('/:id/coupons', protect, getAgencyCoupons);
router.post('/:id/coupons/generate', protect, generateAgentCoupons);
router.post('/:id/coupons/use-promotion', protect, usePromotionCoupon);
router.post('/:id/coupons/send-promotion-email', protect, sendPromotionCouponsEmailEndpoint);

// Catch-all routes LAST — these match any single or two-segment path
router.get('/:country/:name', optionalAuth, getAgency); // Format: /agencies/albania/zano-real-estate
router.get('/:idOrSlug', optionalAuth, getAgency); // Fallback for ID or single-segment slug

export default router;
