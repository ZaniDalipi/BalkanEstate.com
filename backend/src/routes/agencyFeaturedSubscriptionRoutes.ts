import express from 'express';
import {
  createFeaturedSubscription,
  getFeaturedSubscription,
  cancelFeaturedSubscription,
  confirmPayment,
  applyCoupon,
  checkExpiredSubscriptions,
  getAllFeaturedSubscriptions,
} from '../controllers/agencyFeaturedSubscriptionController';
import { protect } from '../middleware/auth';
import { checkAdminRole } from '../middleware/adminAuth';

const router = express.Router();

// Agency owner routes
router.post('/agencies/:agencyId/featured-subscription', protect, createFeaturedSubscription);
router.get('/agencies/:agencyId/featured-subscription', getFeaturedSubscription);
router.delete('/agencies/:agencyId/featured-subscription', protect, cancelFeaturedSubscription);
// No payment provider confirms this yet, so only an admin may mark it paid
// (otherwise any signed-in user could feature any agency for free).
router.post('/agencies/:agencyId/featured-subscription/confirm-payment', protect, checkAdminRole, confirmPayment);
router.post('/agencies/:agencyId/featured-subscription/apply-coupon', protect, applyCoupon);

// Admin routes
router.get('/admin/featured-subscriptions', protect, checkAdminRole, getAllFeaturedSubscriptions);
router.post('/admin/featured-subscriptions/check-expired', protect, checkAdminRole, checkExpiredSubscriptions);

export default router;
