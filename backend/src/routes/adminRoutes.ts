import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/auth';
import { checkAdminRole, logAdminAction } from '../middleware/adminAuth';
import {
  getAdminStats,
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  getAllAgenciesAdmin,
  updateAgency,
  deleteAgency,
  getAllPropertiesAdmin,
  updateProperty,
  deleteProperty,
  getSystemConfig,
  fixPropertyCoordinates,
  fixSinglePropertyCoordinates,
  getPropertiesMissingCoords,
  getAllInquiries,
  getInquiryById,
  updateInquiry,
  deleteInquiry,
  bulkUpdateInquiryStatus,
  getInquiryStats,
} from '../controllers/adminController';
import {
  getAllDiscountCodes,
  createDiscountCode,
  generateDiscountCodes,
  deactivateDiscountCode,
  deleteDiscountCode,
} from '../controllers/discountCodeController';
import {
  sendTestMonthlyCouponEmail,
  sendTestAgencyCouponEmail,
  runMonthlyCouponRefreshManually,
} from '../jobs/monthlyCouponJob';

const router = express.Router();

// All admin routes require authentication + admin role (VPN check removed for accessibility)
router.use(protect);
router.use(checkAdminRole);

// ===== Dashboard & Statistics =====
router.get('/stats', getAdminStats);
router.get('/config', getSystemConfig);

// ===== User Management =====
router.get('/users', logAdminAction('VIEW_USERS'), getAllUsers);
router.patch('/users/:id', logAdminAction('UPDATE_USER'), updateUserAdmin);
router.delete('/users/:id', logAdminAction('DELETE_USER'), deleteUser);

// ===== Agency Management =====
router.get('/agencies', logAdminAction('VIEW_AGENCIES'), getAllAgenciesAdmin);
router.patch('/agencies/:id', logAdminAction('UPDATE_AGENCY'), updateAgency);
router.delete('/agencies/:id', logAdminAction('DELETE_AGENCY'), deleteAgency);

// ===== Property Management =====
router.get('/properties', logAdminAction('VIEW_PROPERTIES'), getAllPropertiesAdmin);
router.patch('/properties/:id', logAdminAction('UPDATE_PROPERTY'), updateProperty);
router.delete('/properties/:id', logAdminAction('DELETE_PROPERTY'), deleteProperty);
router.get('/properties-missing-coords', logAdminAction('VIEW_MISSING_COORDS'), getPropertiesMissingCoords);
router.post('/fix-coordinates', logAdminAction('FIX_COORDINATES'), fixPropertyCoordinates);
router.post('/fix-coordinates/:propertyId', logAdminAction('FIX_SINGLE_COORDINATES'), fixSinglePropertyCoordinates);

// ===== Discount Code Management =====
router.get('/discount-codes', logAdminAction('VIEW_DISCOUNT_CODES'), getAllDiscountCodes);
router.post('/discount-codes', logAdminAction('CREATE_DISCOUNT_CODE'), createDiscountCode);
router.post('/discount-codes/generate', logAdminAction('GENERATE_DISCOUNT_CODES'), generateDiscountCodes);
router.patch('/discount-codes/:id/deactivate', logAdminAction('DEACTIVATE_DISCOUNT_CODE'), deactivateDiscountCode);
router.delete('/discount-codes/:id', logAdminAction('DELETE_DISCOUNT_CODE'), deleteDiscountCode);

// ===== Inquiry Management =====
router.get('/inquiries/stats', logAdminAction('VIEW_INQUIRY_STATS'), getInquiryStats);
router.get('/inquiries', logAdminAction('VIEW_INQUIRIES'), getAllInquiries);
router.get('/inquiries/:id', logAdminAction('VIEW_INQUIRY'), getInquiryById);
router.patch('/inquiries/bulk-status', logAdminAction('BULK_UPDATE_INQUIRIES'), bulkUpdateInquiryStatus);
router.patch('/inquiries/:id', logAdminAction('UPDATE_INQUIRY'), updateInquiry);
router.delete('/inquiries/:id', logAdminAction('DELETE_INQUIRY'), deleteInquiry);

// ===== Test Email Endpoints =====
// Send test monthly coupon email (Pro user)
router.post('/test-emails/monthly-coupon', logAdminAction('TEST_EMAIL_MONTHLY_COUPON'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await sendTestMonthlyCouponEmail(email, userName || 'Test User');
    res.json({ success: true, message: `Test monthly coupon email sent to ${email}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: String(error) });
  }
});

// Send test agency coupon email
router.post('/test-emails/agency-coupon', logAdminAction('TEST_EMAIL_AGENCY_COUPON'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, userName, agencyName } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    await sendTestAgencyCouponEmail(email, userName || 'Test User', agencyName || 'Test Agency');
    res.json({ success: true, message: `Test agency coupon email sent to ${email}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: String(error) });
  }
});

// Run monthly coupon refresh manually (for testing)
router.post('/test-emails/run-monthly-refresh', logAdminAction('RUN_MONTHLY_COUPON_REFRESH'), async (_req: AuthRequest, res: Response) => {
  try {
    await runMonthlyCouponRefreshManually();
    res.json({ success: true, message: 'Monthly coupon refresh completed' });
  } catch (error) {
    console.error('Error running monthly refresh:', error);
    res.status(500).json({ message: 'Failed to run monthly refresh', error: String(error) });
  }
});

export default router;
