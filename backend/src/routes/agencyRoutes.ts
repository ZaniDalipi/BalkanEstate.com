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
  getTopAgencies,
  recomputeAgencyScores,
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

// Public routes
router.get('/', getAgencies);
router.get('/featured/rotation', getFeaturedAgencies);

// Protected routes
router.post('/', protect, createAgency);
router.put('/:id', protect, updateAgency);
router.post('/:id/agents', protect, addAgentToAgency);
router.delete('/:id/agents/:agentId', protect, removeAgentFromAgency);
router.post('/join-by-code', protect, joinAgencyByInvitationCode);
router.post('/find-by-code', protect, findAgencyByInvitationCode);
router.post('/leave', protect, leaveAgency);

// Admin management routes
router.post('/:id/verify-code', protect, verifyInvitationCode);
router.post('/:id/admins', protect, addAgencyAdmin);
router.delete('/:id/admins/:userId', protect, removeAgencyAdmin);

// Image upload routes
router.post('/:id/upload-logo', protect, upload.single('logo'), uploadAgencyLogo);
router.post('/:id/upload-cover', protect, upload.single('cover'), uploadAgencyCover);

// Coupon management routes (new monetization system)
router.post('/:id/coupons/generate', protect, generateAgentCoupons); // Generate agent coupons (owner only)
router.post('/coupons/redeem', protect, redeemAgentCoupon); // Redeem agent coupon (any user)
router.get('/:id/coupons', protect, getAgencyCoupons); // Get coupon status (owner + agents)
router.post('/:id/coupons/use-promotion', protect, usePromotionCoupon); // Use promotion coupon (owner + agents)
router.post('/:id/coupons/send-promotion-email', protect, sendPromotionCouponsEmailEndpoint); // Send promotion coupons email (owner only)
router.get('/:id/agents', protect, getAgencyAgents); // Get agent list with details (owner only)

// Migration route (run once to fix existing agents)
router.post('/migrate-agent-subscriptions', protect, migrateAgentSubscriptions);

// Leaderboard and admin routes (must be before catch-all /:country/:name)
router.get('/leaderboard', getTopAgencies);
router.post('/admin/recompute-scores', protect, recomputeAgencyScores);

// Catch-all public lookup routes (must be LAST — /:country/:name matches any two-segment path)
router.get('/:country/:name', optionalAuth, getAgency); // Format: /agencies/:country/:name (e.g., /agencies/albania/zano-real-estate)
router.get('/:idOrSlug', optionalAuth, getAgency); // Fallback for ID or single-segment slug lookups

export default router;
