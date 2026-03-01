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
  syncPropertySchema,
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
import { sendProSubscriptionWelcomeEmail, sendMonthlyCouponEmail, sendSubscriptionInvoice } from '../services/emailService';
import { generateProSubscriptionCoupons } from '../services/subscriptionPaymentService';
import PaymentRecord from '../models/PaymentRecord';
import Product from '../models/Product';
import User from '../models/User';
import Subscription from '../models/Subscription';
import {
  getActivityLogs,
  getDailySummary,
  getUserActivityLogs,
} from '../controllers/activityLogController';
import { triggerDailyReportManually } from '../jobs/dailyActivityReportJob';
import {
  getAllSubscriptions,
  getSubscriptionById,
  getAllPayments,
  getPaymentById,
  getPaymentStats,
  activateUserSubscription,
  cancelSubscription,
  deactivateUserSubscription,
  adjustListingLimit,
  adjustAgencyListingLimit,
  activateAgencySubscription,
  deactivateAgencySubscription,
  getAgencySubscriptionHistory,
} from '../controllers/adminSubscriptionController';
import {
  getAllContent,
  createContent,
  updateContent,
  deleteContent,
  uploadVideo,
} from '../controllers/siteContentController';
import {
  getSiteSettings,
  updateSiteSettings,
  resetSiteSettings,
} from '../controllers/siteSettingsController';
import {
  getAllEmailConfigs,
  getEmailConfigByKey,
  updateEmailConfig,
  toggleEmailStatus,
  resetEmailConfig,
  resetAllEmailConfigs,
  syncMissingEmailConfigs,
  sendTestEmail,
  previewEmail,
  previewMinimalisticTemplate,
  getEmailCategories,
  createEmailConfig,
  deleteEmailConfig,
  duplicateEmailConfig,
} from '../controllers/emailConfigController';
import multer from 'multer';

const router = express.Router();

// All admin routes require: authentication + admin role
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
router.get('/agencies/:agencyId/subscription', logAdminAction('VIEW_AGENCY_SUBSCRIPTION'), getAgencySubscriptionHistory);
router.post('/agencies/:agencyId/subscription/activate', logAdminAction('ACTIVATE_AGENCY_SUBSCRIPTION'), activateAgencySubscription);
router.post('/agencies/:agencyId/subscription/deactivate', logAdminAction('DEACTIVATE_AGENCY_SUBSCRIPTION'), deactivateAgencySubscription);
router.patch('/agencies/:agencyId/listing-limit', logAdminAction('ADJUST_AGENCY_LISTING_LIMIT'), adjustAgencyListingLimit);
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
router.post('/sync-property-schema', logAdminAction('SYNC_PROPERTY_SCHEMA'), syncPropertySchema);

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

// ===== Subscription & Payment Management =====
router.get('/subscriptions', logAdminAction('VIEW_SUBSCRIPTIONS'), getAllSubscriptions);
router.get('/subscriptions/:id', logAdminAction('VIEW_SUBSCRIPTION'), getSubscriptionById);
router.post('/subscriptions/activate', logAdminAction('ACTIVATE_SUBSCRIPTION'), activateUserSubscription);
router.post('/subscriptions/:id/cancel', logAdminAction('CANCEL_SUBSCRIPTION'), cancelSubscription);
router.post('/subscriptions/:id/deactivate', logAdminAction('DEACTIVATE_SUBSCRIPTION'), deactivateUserSubscription);
router.patch('/subscriptions/listing-limit/:userId', logAdminAction('ADJUST_LISTING_LIMIT'), adjustListingLimit);
router.get('/payments/stats', logAdminAction('VIEW_PAYMENT_STATS'), getPaymentStats);
router.get('/payments', logAdminAction('VIEW_PAYMENTS'), getAllPayments);
router.get('/payments/:id', logAdminAction('VIEW_PAYMENT'), getPaymentById);

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

// Resend Pro subscription welcome + coupons email (with generated codes) + invoice to a user
router.post('/test-emails/resend-pro-welcome', logAdminAction('RESEND_PRO_WELCOME_EMAIL'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'email is required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: `No user found with email: ${email}` });
      return;
    }

    const subscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ['active', 'trial', 'grace', 'pending_cancellation'] },
    }).sort({ expirationDate: -1 });

    if (!subscription) {
      res.status(404).json({ message: `No active subscription found for ${email}` });
      return;
    }

    const product = await Product.findOne({ productId: subscription.productId });
    if (!product) {
      res.status(404).json({ message: `Product not found: ${subscription.productId}` });
      return;
    }

    const billingPeriod = product.billingPeriod === 'yearly' ? 'yearly' : 'monthly';
    const totalCoupons = product.promotionCoupons ?? 0;
    const highlightedCoupons = product.highlightedCoupons ?? 0;
    const premiumCoupons = product.premiumCoupons ?? 0;
    const featuredCoupons = product.featuredCoupons ?? 0;

    // Generate actual PromotionCoupon codes
    const generatedCodes = await generateProSubscriptionCoupons(
      String(user._id),
      highlightedCoupons,
      premiumCoupons,
      featuredCoupons,
      subscription.expirationDate,
    );

    await sendProSubscriptionWelcomeEmail({
      email: user.email,
      userName: user.name || user.email.split('@')[0],
      planName: product.name,
      listingsLimit: product.listingsLimit ?? 0,
      promotionCoupons: {
        total: totalCoupons,
        highlighted: highlightedCoupons,
        premium: premiumCoupons,
        featured: featuredCoupons,
      },
      aiInsightsLimit: product.aiInsightsLimit ?? 0,
      aiMessagesLimit: product.aiMessagesLimit ?? -1,
      savedSearchesLimit: product.savedSearchesLimit ?? -1,
      billingPeriod,
      expiresAt: subscription.expirationDate,
      couponCodes: generatedCodes,
    });

    await sendMonthlyCouponEmail({
      email: user.email,
      userName: user.name || user.email.split('@')[0],
      planName: product.name,
      totalCoupons,
      newCoupons: totalCoupons,
      rolledOver: 0,
      breakdown: { highlighted: highlightedCoupons, premium: premiumCoupons, featured: featuredCoupons },
      couponCodes: generatedCodes,
    });

    // Also send the invoice
    const paymentRecord = await PaymentRecord.findOne({ userId: user._id })
      .sort({ createdAt: -1 });

    if (paymentRecord) {
      await sendSubscriptionInvoice(user.email, user.name || 'Customer', {
        planName: product.name,
        amount: paymentRecord.amount,
        currency: paymentRecord.currency || 'EUR',
        billingPeriod,
        orderId: String(paymentRecord._id),
        subscriptionStartDate: subscription.startDate,
        nextBillingDate: subscription.expirationDate,
        autoRenewing: subscription.autoRenewing ?? true,
      });
    }

    res.json({
      success: true,
      message: `Welcome + coupons + invoice resent to ${email} (${product.name}). Generated ${generatedCodes.length} coupon codes.`,
      couponCodes: generatedCodes,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend emails', error: String(error) });
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

// ===== Site Settings Management =====
router.get('/site-settings', logAdminAction('VIEW_SITE_SETTINGS'), getSiteSettings);
router.patch('/site-settings', logAdminAction('UPDATE_SITE_SETTINGS'), updateSiteSettings);
router.post('/site-settings/reset', logAdminAction('RESET_SITE_SETTINGS'), resetSiteSettings);

// ===== Email Configuration Management =====
router.get('/email-configs', logAdminAction('VIEW_EMAIL_CONFIGS'), getAllEmailConfigs);
router.get('/email-configs/categories', logAdminAction('VIEW_EMAIL_CATEGORIES'), getEmailCategories);
router.post('/email-configs', logAdminAction('CREATE_EMAIL_CONFIG'), createEmailConfig);
router.post('/email-configs/reset-all', logAdminAction('RESET_ALL_EMAIL_CONFIGS'), resetAllEmailConfigs);
router.post('/email-configs/sync-missing', logAdminAction('SYNC_MISSING_EMAIL_CONFIGS'), syncMissingEmailConfigs);
router.get('/email-configs/:key', logAdminAction('VIEW_EMAIL_CONFIG'), getEmailConfigByKey);
router.patch('/email-configs/:key', logAdminAction('UPDATE_EMAIL_CONFIG'), updateEmailConfig);
router.delete('/email-configs/:key', logAdminAction('DELETE_EMAIL_CONFIG'), deleteEmailConfig);
router.post('/email-configs/:key/toggle', logAdminAction('TOGGLE_EMAIL_STATUS'), toggleEmailStatus);
router.post('/email-configs/:key/reset', logAdminAction('RESET_EMAIL_CONFIG'), resetEmailConfig);
router.post('/email-configs/:key/duplicate', logAdminAction('DUPLICATE_EMAIL_CONFIG'), duplicateEmailConfig);
router.post('/email-configs/:key/test', logAdminAction('SEND_TEST_EMAIL'), sendTestEmail);
router.post('/email-configs/:key/preview', logAdminAction('PREVIEW_EMAIL'), previewEmail);

// New minimalistic email templates with 3D house graphics
router.get('/email-templates/preview/:templateType', logAdminAction('PREVIEW_TEMPLATE'), previewMinimalisticTemplate);
router.post('/email-templates/preview/:templateType', logAdminAction('PREVIEW_TEMPLATE'), previewMinimalisticTemplate);

export default router;
