import express, { Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { checkAdminRole, logAdminAction } from '../middleware/adminAuth';
import {
  getAdminStats,
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  getAllAgenciesAdmin,
  getAgencyDetailAdmin,
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
import {
  getActivityLogs,
  getDailySummary,
  getUserActivityLogs,
} from '../controllers/activityLogController';
import { triggerDailyReportManually } from '../jobs/dailyActivityReportJob';
import {
  getAllContent,
  createContent,
  updateContent,
  deleteContent,
  uploadVideo,
} from '../controllers/siteContentController';
import multer from 'multer';

const router = express.Router();

// All admin routes require authentication + admin role (VPN check removed for accessibility)
router.use(protect);
router.use(checkAdminRole);

// ===== Dashboard & Statistics =====
router.get('/stats', getAdminStats);
router.get('/config', getSystemConfig);

// ===== Activity Logs =====
router.get('/activity-logs', logAdminAction('VIEW_ACTIVITY_LOGS'), getActivityLogs);
router.get('/activity-logs/summary', logAdminAction('VIEW_ACTIVITY_SUMMARY'), getDailySummary);
router.get('/activity-logs/user/:userId', logAdminAction('VIEW_USER_ACTIVITY'), getUserActivityLogs);

// ===== User Management =====
router.get('/users', logAdminAction('VIEW_USERS'), getAllUsers);
router.patch('/users/:id', logAdminAction('UPDATE_USER'), updateUserAdmin);
router.delete('/users/:id', logAdminAction('DELETE_USER'), deleteUser);

// ===== Agency Management =====
router.get('/agencies', logAdminAction('VIEW_AGENCIES'), getAllAgenciesAdmin);
router.get('/agencies/:id', logAdminAction('VIEW_AGENCY_DETAIL'), getAgencyDetailAdmin);
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
router.post('/test-emails/monthly-coupon', logAdminAction('TEST_EMAIL_MONTHLY_COUPON'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, userName } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    await sendTestMonthlyCouponEmail(email, userName || 'Test User');
    res.json({ success: true, message: `Test monthly coupon email sent to ${email}` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send test email', error: String(error) });
  }
});

// Send test agency coupon email
router.post('/test-emails/agency-coupon', logAdminAction('TEST_EMAIL_AGENCY_COUPON'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, userName, agencyName } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    await sendTestAgencyCouponEmail(email, userName || 'Test User', agencyName || 'Test Agency');
    res.json({ success: true, message: `Test agency coupon email sent to ${email}` });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send test email', error: String(error) });
  }
});

// Run monthly coupon refresh manually (for testing)
router.post('/test-emails/run-monthly-refresh', logAdminAction('RUN_MONTHLY_COUPON_REFRESH'), async (_req: Request, res: Response): Promise<void> => {
  try {
    await runMonthlyCouponRefreshManually();
    res.json({ success: true, message: 'Monthly coupon refresh completed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to run monthly refresh', error: String(error) });
  }
});

// Trigger daily activity report manually
router.post('/test-emails/daily-activity-report', logAdminAction('TRIGGER_DAILY_REPORT'), async (_req: Request, res: Response): Promise<void> => {
  try {
    await triggerDailyReportManually();
    res.json({ success: true, message: 'Daily activity report sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send daily report', error: String(error) });
  }
});

// ===== Site Content Management (How It Works videos, etc.) =====
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

router.get('/site-content', logAdminAction('VIEW_SITE_CONTENT'), getAllContent);
router.post('/site-content', logAdminAction('CREATE_SITE_CONTENT'), createContent);
router.patch('/site-content/:id', logAdminAction('UPDATE_SITE_CONTENT'), updateContent);
router.delete('/site-content/:id', logAdminAction('DELETE_SITE_CONTENT'), deleteContent);
router.post('/site-content/upload-video', logAdminAction('UPLOAD_VIDEO'), videoUpload.single('video'), uploadVideo);

export default router;
