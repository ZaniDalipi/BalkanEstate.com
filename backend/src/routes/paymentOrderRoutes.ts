import express from 'express';
import { protect } from '../middleware/auth';
import { decryptPayload } from '../middleware/decryptPayload';
import { paymentRateLimiter } from '../middleware/security';
import { requestPlan, getMyOrders } from '../controllers/paymentOrderController';

/**
 * Customers requesting a plan, paid by arrangement with the team.
 * Mounted at /api/payment-orders. Admin routes live in adminRoutes.ts.
 */
const router = express.Router();

router.use(protect);

/** Request a plan: returns the reference, the amount and how to pay. */
router.post('/', paymentRateLimiter, decryptPayload, requestPlan);

/** My requests and how to pay. */
router.get('/mine', getMyOrders);

export default router;
