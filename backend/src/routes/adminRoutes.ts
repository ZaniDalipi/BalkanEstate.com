import express, { Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { checkAdminRole, logAdminAction } from '../middleware/adminAuth';
import { invalidateCache } from '../middleware/cache';
import { getObjectIdParam } from '../utils/validateParams';
import { escapeRegex } from '../utils/escapeRegex';
import { adminLogger } from '../utils/logger';
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
  getPendingLicenses,
  approveLicense,
  rejectLicense,
  getVillaApprovals,
  approveVilla,
  rejectVilla,
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
import emailService, { sendProSubscriptionWelcomeEmail, sendMonthlyCouponEmail, sendSubscriptionInvoice } from '../services/emailService';
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
  manageUserSubscription,
  getCarryoverStats,
  triggerSubscriptionRenewal,
  updateCarryoverFields,
  getProductConfig,
  getAllProducts,
  updateUserListingCounter,
} from '../controllers/adminSubscriptionController';
import {
  getAllBusinessListingsAdmin,
  adminDeleteBusinessListing,
} from '../controllers/businessListingController';
import {
  getAllContent,
  createContent,
  updateContent,
  deleteContent,
  uploadVideo,
} from '../controllers/siteContentController';
import {
  getAllAdBanners,
  createAdBanner,
  updateAdBanner,
  deleteAdBanner,
  uploadAdBannerImage,
} from '../controllers/adBannerController';
import {
  getSiteSettings,
  updateSiteSettings,
  resetSiteSettings,
  uploadSiteLogo,
  uploadEmailLogo,
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
import {
  getSystemSettings,
  updateSystemSettings,
  resetSystemSettings,
} from '../controllers/systemSettingsController';
import multer from 'multer';
import { isAllowedPhotoUrl, allowedPhotoHostsHint } from '../config/imageHosts';
import Article from '../models/Article';

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

// ===== Business Listing Management =====
router.get('/business-listings', logAdminAction('VIEW_BUSINESS_LISTINGS'), getAllBusinessListingsAdmin);
router.delete('/business-listings/:id', logAdminAction('DELETE_BUSINESS_LISTING'), adminDeleteBusinessListing);

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
router.patch('/users/:userId/listing-counter', logAdminAction('UPDATE_LISTING_COUNTER'), updateUserListingCounter);
router.patch('/subscriptions/manage/:userId', logAdminAction('MANAGE_USER_SUBSCRIPTION'), manageUserSubscription);
router.get('/payments/stats', logAdminAction('VIEW_PAYMENT_STATS'), getPaymentStats);
router.get('/payments', logAdminAction('VIEW_PAYMENTS'), getAllPayments);
router.get('/payments/:id', logAdminAction('VIEW_PAYMENT'), getPaymentById);

// ===== Carryover Testing & Debugging =====
router.get('/subscriptions/products', logAdminAction('VIEW_PRODUCTS'), getAllProducts);
router.get('/subscriptions/product-config/:productId', logAdminAction('VIEW_PRODUCT_CONFIG'), getProductConfig);
router.get('/subscriptions/carryover/:userId', logAdminAction('VIEW_CARRYOVER_STATS'), getCarryoverStats);
router.post('/subscriptions/trigger-renewal/:userId', logAdminAction('TRIGGER_RENEWAL'), triggerSubscriptionRenewal);
router.patch('/subscriptions/carryover/:userId', logAdminAction('UPDATE_CARRYOVER_FIELDS'), updateCarryoverFields);

// ===== Test Email Endpoints =====
// Send test monthly coupon email (Pro user)
router.post('/test-emails/monthly-coupon', logAdminAction('TEST_EMAIL_MONTHLY_COUPON'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!emailService.isConfigured) {
      res.status(503).json({ message: 'No email provider configured. Set RESEND_API_KEY or SMTP credentials.' });
      return;
    }

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
    if (!emailService.isConfigured) {
      res.status(503).json({ message: 'No email provider configured. Set RESEND_API_KEY or SMTP credentials.' });
      return;
    }

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
    if (!emailService.isConfigured) {
      res.status(503).json({ message: 'No email provider configured. Set RESEND_API_KEY or SMTP credentials.' });
      return;
    }

    await runMonthlyCouponRefreshManually();
    res.json({ success: true, message: 'Monthly coupon refresh completed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to run monthly refresh', error: String(error) });
  }
});

// Resend Pro subscription welcome + coupons email (with generated codes) + invoice to a user
router.post('/test-emails/resend-pro-welcome', logAdminAction('RESEND_PRO_WELCOME_EMAIL'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!emailService.isConfigured) {
      res.status(503).json({ message: 'No email provider configured. Set RESEND_API_KEY or SMTP credentials.' });
      return;
    }

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
    if (!emailService.isConfigured) {
      res.status(503).json({ message: 'No email provider configured. Set RESEND_API_KEY or SMTP credentials.' });
      return;
    }

    await triggerDailyReportManually();
    res.json({ success: true, message: 'Daily activity report sent' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send daily report', error: String(error) });
  }
});

// ===== License Verification Management =====
router.get('/pending-licenses', logAdminAction('VIEW_PENDING_LICENSES'), getPendingLicenses);
router.post('/approve-license/:userId', logAdminAction('APPROVE_LICENSE'), approveLicense);
router.post('/reject-license/:userId', logAdminAction('REJECT_LICENSE'), rejectLicense);

// Luxury villa approval queue
router.get('/villa-approvals', logAdminAction('VIEW_VILLA_APPROVALS'), getVillaApprovals);
router.post('/villa-approvals/:id/approve', logAdminAction('APPROVE_VILLA'), approveVilla);
router.post('/villa-approvals/:id/reject', logAdminAction('REJECT_VILLA'), rejectVilla);

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

// Site Settings Logo Uploads
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});
router.post('/site-settings/upload-logo', logAdminAction('UPLOAD_SITE_LOGO'), logoUpload.single('logo'), uploadSiteLogo);
router.post('/site-settings/upload-email-logo', logAdminAction('UPLOAD_EMAIL_LOGO'), logoUpload.single('logo'), uploadEmailLogo);

// ===== Ad Banner Management (advertising placements) =====
const adBannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    // Block SVG to prevent stored XSS
    if (file.mimetype === 'image/svg+xml') {
      cb(new Error('SVG files are not allowed'));
      return;
    }
    cb(null, true);
  },
});
// Banner management, under a neutral path so an ad blocker cannot break the
// admin screens. The old /ad-banners paths stay mounted for compatibility.
for (const base of ['/promo-slots', '/ad-banners']) {
  router.get(base, logAdminAction('VIEW_AD_BANNERS'), getAllAdBanners);
  router.post(base, logAdminAction('CREATE_AD_BANNER'), createAdBanner);
  router.patch(`${base}/:id`, logAdminAction('UPDATE_AD_BANNER'), updateAdBanner);
  router.delete(`${base}/:id`, logAdminAction('DELETE_AD_BANNER'), deleteAdBanner);
  router.post(`${base}/upload-image`, logAdminAction('UPLOAD_AD_BANNER_IMAGE'), adBannerUpload.single('image'), uploadAdBannerImage);
}

// ===== System Settings Management =====
router.get('/system-settings', logAdminAction('VIEW_SYSTEM_SETTINGS'), getSystemSettings);
router.patch('/system-settings', logAdminAction('UPDATE_SYSTEM_SETTINGS'), updateSystemSettings);
router.post('/system-settings/reset', logAdminAction('RESET_SYSTEM_SETTINGS'), resetSystemSettings);

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

// ===== Testimonial Admin Routes =====
import Testimonial from '../models/Testimonial';

// GET /api/admin/testimonials - List all testimonials (any status)
router.get('/testimonials', logAdminAction('VIEW_TESTIMONIALS'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [testimonials, total] = await Promise.all([
      Testimonial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Testimonial.countDocuments(filter),
    ]);

    res.json({ testimonials, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
});

// PATCH /api/admin/testimonials/:id - Approve or reject
router.patch('/testimonials/:id', logAdminAction('UPDATE_TESTIMONIAL'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: Record<string, any> = {};
    if (status) update.status = status;
    if (adminNotes !== undefined) update.adminNotes = adminNotes;

    const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!testimonial) {
      res.status(404).json({ message: 'Testimonial not found' });
      return;
    }

    res.json({ testimonial });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update testimonial' });
  }
});

// DELETE /api/admin/testimonials/:id
router.delete('/testimonials/:id', logAdminAction('DELETE_TESTIMONIAL'), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await Testimonial.findByIdAndDelete(req.params.id);
    if (!result) {
      res.status(404).json({ message: 'Testimonial not found' });
      return;
    }
    res.json({ message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete testimonial' });
  }
});

// ===== News Admin Routes =====
import News from '../models/News';
import { fetchAndStoreNews, cleanupOldNews } from '../services/newsService';

// GET /api/admin/news - List all news with admin controls
router.get('/news', logAdminAction('VIEW_NEWS'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', country } = req.query;
    const filter: Record<string, any> = {};
    if (country) filter.country = country;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      News.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limitNum).lean(),
      News.countDocuments(filter),
    ]);

    res.json({ articles, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// POST /api/admin/news/fetch - Manually trigger news fetch
router.post('/news/fetch', logAdminAction('TRIGGER_NEWS_FETCH'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = await fetchAndStoreNews();
    res.json({ message: `Fetched ${count} new articles` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

// POST /api/admin/news/cleanup - Manually trigger old news cleanup
router.post('/news/cleanup', logAdminAction('TRIGGER_NEWS_CLEANUP'), async (req: Request, res: Response): Promise<void> => {
  try {
    const months = parseInt(req.body.months, 10) || 3;
    const count = await cleanupOldNews(months);
    res.json({ message: `Cleaned up ${count} old articles` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cleanup news' });
  }
});

// DELETE /api/admin/news/:id
router.delete('/news/:id', logAdminAction('DELETE_NEWS'), async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      res.status(404).json({ message: 'News article not found' });
      return;
    }
    // Cleanup the stored cover image
    if (article.coverImagePublicId) {
      try {
        const { deleteObject } = await import('../services/bunnyStorageService');
        await deleteObject(article.coverImagePublicId);
      } catch { /* ignore cleanup errors */ }
    }
    await article.deleteOne();
    res.json({ message: 'News article deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete news article' });
  }
});

// ===== Article Management (Blog) =====

// GET /api/admin/articles - List all articles
router.get('/articles', logAdminAction('VIEW_ARTICLES'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .populate('author', 'name email')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Article.countDocuments(filter),
    ]);

    res.json({ articles, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch articles' });
  }
});

// POST /api/admin/articles - Create article
router.post('/articles', logAdminAction('CREATE_ARTICLE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, excerpt, category, tags, country, countryCode, coverImageUrl, coverImageFit, status, isFeatured } = req.body;

    if (!title || !content || !excerpt) {
      res.status(400).json({ message: `Missing required fields: ${[!title && 'title', !content && 'content', !excerpt && 'excerpt'].filter(Boolean).join(', ')}` });
      return;
    }

    const VALID_CATS = new Set(['market', 'investment', 'regulation', 'development', 'tourism', 'guide', 'lifestyle']);
    const VALID_STATUS = new Set(['draft', 'published']);
    const VALID_FIT = new Set(['cover', 'contain', 'fill']);

    const article = new Article({
      title: String(title).trim(),
      content,
      excerpt: String(excerpt).trim(),
      category: VALID_CATS.has(category) ? category : 'guide',
      tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : [],
      country: country ? String(country).trim().substring(0, 100) : undefined,
      countryCode: countryCode ? String(countryCode).trim().toUpperCase().substring(0, 2) : undefined,
      coverImageUrl: coverImageUrl ? String(coverImageUrl).trim() : undefined,
      coverImageFit: coverImageFit && typeof coverImageFit === 'string' && VALID_FIT.has(coverImageFit) ? coverImageFit : 'cover',
      status: VALID_STATUS.has(status) ? status : 'draft',
      author: (req as any).user._id,
      isFeatured: isFeatured === true,
    });

    if (article.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    await article.save();
    res.status(201).json({ article });
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const fields = Object.values(err.errors || {}).map((e: any) => e.message).join(', ');
      res.status(400).json({ message: fields || 'Validation failed', code: 'VALIDATION_ERROR' });
      return;
    }
    if (err?.code === 11000) {
      res.status(409).json({ message: 'An article with this slug already exists', code: 'DUPLICATE_SLUG' });
      return;
    }
    res.status(500).json({ message: 'Failed to create article' });
  }
});

// PATCH /api/admin/articles/:id - Update article
router.patch('/articles/:id', logAdminAction('UPDATE_ARTICLE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content, excerpt, category, tags, country, countryCode, coverImageUrl, coverImagePublicId, coverImageFit, status, isFeatured } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    const VALID_CATS = new Set(['market', 'investment', 'regulation', 'development', 'tourism', 'guide', 'lifestyle']);
    const VALID_STATUS = new Set(['draft', 'published']);
    const VALID_FIT = new Set(['cover', 'contain', 'fill']);

    if (title && typeof title === 'string') article.title = title.trim();
    if (content) article.content = content;
    if (excerpt && typeof excerpt === 'string') article.excerpt = excerpt.trim();
    if (category && VALID_CATS.has(category)) article.category = category;
    if (Array.isArray(tags)) article.tags = tags.filter((t: unknown) => typeof t === 'string').slice(0, 20);
    article.country = country ? String(country).trim().substring(0, 100) : undefined;
    article.countryCode = countryCode ? String(countryCode).trim().toUpperCase().substring(0, 2) : undefined;
    if (coverImageUrl !== undefined) article.coverImageUrl = coverImageUrl ? String(coverImageUrl).trim() : undefined;
    if (coverImagePublicId !== undefined) article.coverImagePublicId = coverImagePublicId || undefined;
    if (coverImageFit && typeof coverImageFit === 'string' && VALID_FIT.has(coverImageFit)) {
      article.coverImageFit = coverImageFit as 'cover' | 'contain' | 'fill';
    }
    if (isFeatured !== undefined) article.isFeatured = isFeatured === true;

    if (status && VALID_STATUS.has(status) && status !== article.status) {
      article.status = status;
      if (status === 'published' && !article.publishedAt) {
        article.publishedAt = new Date();
      }
    }

    await article.save();
    res.json({ article });
  } catch (err: any) {
    if (err?.name === 'ValidationError') {
      const fields = Object.values(err.errors || {}).map((e: any) => e.message).join(', ');
      res.status(400).json({ message: fields || 'Validation failed', code: 'VALIDATION_ERROR' });
      return;
    }
    res.status(500).json({ message: 'Failed to update article' });
  }
});

// PATCH /api/admin/articles/:id/publish - Toggle publish/unpublish
router.patch('/articles/:id/publish', logAdminAction('TOGGLE_ARTICLE_STATUS'), async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    if (article.status === 'published') {
      article.status = 'draft';
    } else {
      article.status = 'published';
      if (!article.publishedAt) {
        article.publishedAt = new Date();
      }
    }

    await article.save();
    res.json({ article });
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle article status', error: String(err) });
  }
});

// DELETE /api/admin/articles/:id - Delete article
router.delete('/articles/:id', logAdminAction('DELETE_ARTICLE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }

    // Cleanup the stored cover image if it exists
    if (article.coverImagePublicId) {
      try {
        const { deleteObject } = await import('../services/bunnyStorageService');
        await deleteObject(article.coverImagePublicId);
      } catch { /* ignore cleanup errors */ }
    }

    await article.deleteOne();
    res.json({ message: 'Article deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete article', error: String(err) });
  }
});

// GET /api/admin/articles/:id - Get single article by ID for editing
router.get('/articles/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'name email')
      .lean();
    if (!article) {
      res.status(404).json({ message: 'Article not found' });
      return;
    }
    res.json({ article });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch article', error: String(err) });
  }
});

// Article image upload multer config
const articleImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/admin/articles/upload-image - Upload image for article content or cover
router.post('/articles/upload-image', logAdminAction('UPLOAD_ARTICLE_IMAGE'), articleImageUpload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const { uploadImage } = await import('../services/imageStorageService');
    const result = await uploadImage(req.file.buffer, {
      userId: (req as any).user._id.toString(),
      type: 'listing' as any,
      maxWidth: 1920,
      maxHeight: 1080,
    });

    res.json({ url: result.url, publicId: result.publicId });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload image', error: String(err) });
  }
});

// ============================================================================
// Villa destinations — the places showcased in the home-page corridor
// ============================================================================

const destinationImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/**
 * Validates and normalises a destination payload.
 *
 * Coordinates are the reason this exists: they drive a map fly-to on the
 * public site, so a typo must be rejected here rather than sending a visitor
 * to the middle of the ocean.
 *
 * `base` is the existing document on an update. A PATCH is allowed to send
 * only the fields it means to change — the photo-upload flow saves just
 * `imageUrl`/`imagePublicId` — so anything omitted from `body` falls back to
 * `base` before validation runs, instead of validation seeing an empty name
 * on a partial payload and rejecting the whole request.
 */
function parseDestinationBody(
  body: any,
  base?: Record<string, unknown> | null
): { error?: string; value?: Record<string, unknown> } {
  const pick = (key: string) => (body?.[key] !== undefined ? body[key] : base?.[key]);

  const name = String(pick('name') ?? '').trim();
  const query = String(pick('query') ?? '').trim();
  const country = String(pick('country') ?? '').trim();
  if (!name) return { error: 'Name is required' };
  if (!query) return { error: 'Search term is required' };
  if (!country) return { error: 'Country is required' };
  if (name.length > 80 || query.length > 80 || country.length > 60) {
    return { error: 'Name, search term and country must be shorter' };
  }

  const lat = Number(pick('lat'));
  const lng = Number(pick('lng'));
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { error: 'Latitude must be between -90 and 90' };
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { error: 'Longitude must be between -180 and 180' };

  const zoomRaw = pick('zoom');
  const zoom = zoomRaw === undefined || zoomRaw === null || zoomRaw === '' ? 12 : Number(zoomRaw);
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 20) return { error: 'Zoom must be between 1 and 20' };

  const orderRaw = pick('displayOrder');
  const displayOrder = orderRaw === undefined || orderRaw === null || orderRaw === '' ? 0 : Number(orderRaw);
  if (!Number.isFinite(displayOrder)) return { error: 'Display order must be a number' };

  const imageUrl = pick('imageUrl');
  const imagePublicId = pick('imagePublicId');
  const imageCity = pick('imageCity');
  const imageCountry = pick('imageCountry');
  const isActive = pick('isActive');

  // The credit belongs to the photograph, so it is read from wherever the
  // photo is being read from. Letting it fall back to the stored value
  // independently would attribute a newly uploaded picture to whoever took the
  // one it replaced — the exact mistake the credit exists to prevent. Empty
  // rather than undefined so that clearing actually reaches the document;
  // Mongoose drops undefined from an update.
  const creditSource: Record<string, unknown> =
    body?.imageUrl !== undefined ? (body ?? {}) : (base ?? {});
  const imageCredit = String(creditSource.imageCredit ?? '').trim();
  const imageCreditUrl = String(creditSource.imageCreditUrl ?? '').trim();

  return {
    value: {
      name, query, country, lat, lng, zoom, displayOrder,
      imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
      imagePublicId: imagePublicId ? String(imagePublicId).trim() : undefined,
      imageCredit,
      imageCreditUrl,
      imageCity: imageCity ? String(imageCity).trim() : undefined,
      imageCountry: imageCountry ? String(imageCountry).trim() : undefined,
      isActive: isActive === undefined ? true : Boolean(isActive),
    },
  };
}

// GET /api/admin/villa-destinations — every destination, active or not
router.get('/villa-destinations', logAdminAction('VIEW_VILLA_DESTINATIONS'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const VillaDestination = (await import('../models/VillaDestination')).default;
    const destinations = await VillaDestination.find({}).sort({ displayOrder: 1, name: 1 }).lean();
    res.json({ destinations, count: destinations.length });
  } catch (err) {
    adminLogger.error('List villa destinations error:', err);
    res.status(500).json({ message: 'Failed to load villa destinations' });
  }
});

// POST /api/admin/villa-destinations
router.post('/villa-destinations', logAdminAction('CREATE_VILLA_DESTINATION'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = parseDestinationBody(req.body);
    if (error) { res.status(400).json({ message: error }); return; }

    const VillaDestination = (await import('../models/VillaDestination')).default;
    const destination = await VillaDestination.create(value!);
    void invalidateCache('/api/villa-destinations');
    res.status(201).json({ destination });
  } catch (err) {
    adminLogger.error('Create villa destination error:', err);
    res.status(500).json({ message: 'Failed to create villa destination' });
  }
});

// PATCH /api/admin/villa-destinations/:id
router.patch('/villa-destinations/:id', logAdminAction('UPDATE_VILLA_DESTINATION'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const VillaDestination = (await import('../models/VillaDestination')).default;
    const existing = await VillaDestination.findById(id).lean();
    if (!existing) { res.status(404).json({ message: 'Villa destination not found' }); return; }

    const { error, value } = parseDestinationBody(req.body, existing as Record<string, unknown>);
    if (error) { res.status(400).json({ message: error }); return; }

    const destination = await VillaDestination.findByIdAndUpdate(id, value!, { new: true, runValidators: true });
    if (!destination) { res.status(404).json({ message: 'Villa destination not found' }); return; }

    void invalidateCache('/api/villa-destinations');
    res.json({ destination });
  } catch (err) {
    adminLogger.error('Update villa destination error:', err);
    res.status(500).json({ message: 'Failed to update villa destination' });
  }
});

// DELETE /api/admin/villa-destinations/:id
router.delete('/villa-destinations/:id', logAdminAction('DELETE_VILLA_DESTINATION'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const VillaDestination = (await import('../models/VillaDestination')).default;
    const destination = await VillaDestination.findByIdAndDelete(id);
    if (!destination) { res.status(404).json({ message: 'Villa destination not found' }); return; }

    void invalidateCache('/api/villa-destinations');
    res.json({ message: 'Villa destination deleted', id: String(destination._id) });
  } catch (err) {
    adminLogger.error('Delete villa destination error:', err);
    res.status(500).json({ message: 'Failed to delete villa destination' });
  }
});

// POST /api/admin/villa-destinations/import-defaults
// Brings the built-in destinations into the database so they can be curated.
// Idempotent: matches on `query`, the field that drives the villa search, so
// re-running never duplicates a destination an admin has since renamed.
router.post('/villa-destinations/import-defaults', logAdminAction('IMPORT_VILLA_DESTINATIONS'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const VillaDestination = (await import('../models/VillaDestination')).default;
    const { DEFAULT_VILLA_DESTINATIONS } = await import('../data/defaultVillaDestinations');

    const existing = await VillaDestination.find({}, 'query').lean();
    const taken = new Set(existing.map(d => String(d.query)));

    const toInsert = DEFAULT_VILLA_DESTINATIONS
      .map((d, index) => ({ ...d, displayOrder: index, isActive: true }))
      .filter(d => !taken.has(d.query));

    if (toInsert.length > 0) await VillaDestination.insertMany(toInsert);
    void invalidateCache('/api/villa-destinations');

    res.json({
      message: 'Import complete',
      imported: toInsert.length,
      skipped: DEFAULT_VILLA_DESTINATIONS.length - toInsert.length,
    });
  } catch (err) {
    adminLogger.error('Import villa destinations error:', err);
    res.status(500).json({ message: 'Failed to import destinations' });
  }
});

// POST /api/admin/villa-destinations/upload-image
router.post(
  '/villa-destinations/upload-image',
  logAdminAction('UPLOAD_VILLA_DESTINATION_IMAGE'),
  destinationImageUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ message: 'No image file provided' }); return; }

      const { uploadImage } = await import('../services/imageStorageService');
      // Portrait: the corridor card is 18:25 and a card fills a large part of
      // the frame as it exits, so a small upload would visibly soften there.
      //
      // 1200px was the ceiling on everything downstream. Measured on the real
      // corridor, a mid-corridor card on a 390px phone at 3x already needs
      // about 1080 device pixels across and the larger ones need several
      // thousand, so the stored master was being upscaled before it ever
      // reached the screen. 2200 matches what the frontend will now ask for at
      // most, and `preserveQuality` stops the master being re-compressed on
      // the way in — it is compressed again on every delivery anyway.
      const result = await uploadImage(req.file.buffer, {
        userId: (req as any).user._id.toString(),
        type: 'listing' as any,
        maxWidth: 2200,
        maxHeight: 3056, // 2200 / (18/25), so a portrait upload is never squeezed
        preserveQuality: true,
      });

      void invalidateCache('/api/villa-destinations');
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err) {
      adminLogger.error('Upload villa destination image error:', err);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  }
);

// ============================================================================
// City showcase — the panels in the home-page elastic gallery
//
// This collection is the only source of truth for that gallery: nothing is
// hardcoded on the frontend and there is no seeded image library behind it.
// A panel therefore cannot exist without a photo, which is what makes
// `imageUrl` required below rather than optional as it is for villa
// destinations.
// ============================================================================

const cityShowcaseImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

/**
 * Validates and normalises a city-showcase payload.
 *
 * `base` is the existing document on an update. A PATCH may send only the
 * fields it means to change — the photo flow saves just `imageUrl` and
 * `imagePublicId`, the reorder flow just `displayOrder` — so anything omitted
 * falls back to `base` before validation runs. Without that, a partial payload
 * would be judged against an empty city name and rejected outright.
 */
function parseCityShowcaseBody(
  body: any,
  base?: Record<string, unknown> | null
): { error?: string; value?: Record<string, unknown> } {
  const pick = (key: string) => (body?.[key] !== undefined ? body[key] : base?.[key]);

  const city = String(pick('city') ?? '').trim();
  const country = String(pick('country') ?? '').trim();
  const searchQuery = String(pick('searchQuery') ?? '').trim();

  if (city.length < 2 || city.length > 80) return { error: 'City must be between 2 and 80 characters' };
  if (country.length < 2 || country.length > 60) return { error: 'Country must be between 2 and 60 characters' };
  if (searchQuery.length < 2 || searchQuery.length > 80) {
    return { error: 'Search term must be between 2 and 80 characters' };
  }

  // A panel is a full-bleed photo with a label on it. Without an image there
  // is nothing to render, and the gallery has no stand-in to borrow, so this
  // is rejected here rather than reaching the home page as an empty panel.
  const imageUrl = String(pick('imageUrl') ?? '').trim();
  if (!imageUrl) return { error: 'A photo is required' };
  if (!/^https:\/\//i.test(imageUrl)) return { error: 'Photo URL must be https' };
  if (imageUrl.length > 2048) return { error: 'Photo URL is too long' };

  const orderRaw = pick('displayOrder');
  const displayOrder = orderRaw === undefined || orderRaw === null || orderRaw === '' ? 0 : Number(orderRaw);
  if (!Number.isFinite(displayOrder)) return { error: 'Display order must be a number' };

  const imagePublicId = pick('imagePublicId');
  const isActive = pick('isActive');

  const imageCreditRaw = pick('imageCredit');
  const imageCredit = imageCreditRaw ? String(imageCreditRaw).trim() : '';
  if (imageCredit.length > 200) return { error: 'Photo credit is too long' };

  return {
    value: {
      city,
      country,
      searchQuery,
      imageUrl,
      imagePublicId: imagePublicId ? String(imagePublicId).trim() : undefined,
      imageCredit: imageCredit || undefined,
      displayOrder,
      isActive: isActive === undefined ? true : Boolean(isActive),
    },
  };
}

// GET /api/admin/city-showcase — every panel, active or not
router.get('/city-showcase', logAdminAction('VIEW_CITY_SHOWCASE'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const CityShowcase = (await import('../models/CityShowcase')).default;
    const cities = await CityShowcase.find({}).sort({ displayOrder: 1, city: 1 }).lean();
    res.json({ cities, count: cities.length });
  } catch (err) {
    adminLogger.error('List city showcase error:', err);
    res.status(500).json({ message: 'Failed to load city showcase' });
  }
});

// POST /api/admin/city-showcase
router.post('/city-showcase', logAdminAction('CREATE_CITY_SHOWCASE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { error, value } = parseCityShowcaseBody(req.body);
    if (error) { res.status(400).json({ message: error }); return; }

    const CityShowcase = (await import('../models/CityShowcase')).default;
    const city = await CityShowcase.create(value!);
    void invalidateCache('/api/city-showcase');
    res.status(201).json({ city });
  } catch (err) {
    adminLogger.error('Create city showcase error:', err);
    res.status(500).json({ message: 'Failed to create city panel' });
  }
});

// PATCH /api/admin/city-showcase/:id
router.patch('/city-showcase/:id', logAdminAction('UPDATE_CITY_SHOWCASE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const CityShowcase = (await import('../models/CityShowcase')).default;
    const existing = await CityShowcase.findById(id).lean();
    if (!existing) { res.status(404).json({ message: 'City panel not found' }); return; }

    const { error, value } = parseCityShowcaseBody(req.body, existing as Record<string, unknown>);
    if (error) { res.status(400).json({ message: error }); return; }

    const city = await CityShowcase.findByIdAndUpdate(id, value!, { new: true, runValidators: true });
    if (!city) { res.status(404).json({ message: 'City panel not found' }); return; }

    void invalidateCache('/api/city-showcase');
    res.json({ city });
  } catch (err) {
    adminLogger.error('Update city showcase error:', err);
    res.status(500).json({ message: 'Failed to update city panel' });
  }
});

// DELETE /api/admin/city-showcase/:id
router.delete('/city-showcase/:id', logAdminAction('DELETE_CITY_SHOWCASE'), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getObjectIdParam(req, res, 'id');
    if (!id) return;

    const CityShowcase = (await import('../models/CityShowcase')).default;
    const city = await CityShowcase.findByIdAndDelete(id);
    if (!city) { res.status(404).json({ message: 'City panel not found' }); return; }

    void invalidateCache('/api/city-showcase');
    res.json({ message: 'City panel deleted', id: String(city._id) });
  } catch (err) {
    adminLogger.error('Delete city showcase error:', err);
    res.status(500).json({ message: 'Failed to delete city panel' });
  }
});

// POST /api/admin/city-showcase/import-cities
//
// Copies the cities already in `CityMarketData` into the gallery. Idempotent:
// it matches on city + country, so re-running after the market data grows
// brings in only what is missing. Cities with no usable photo are reported
// back rather than imported — see the service for why.
router.post('/city-showcase/import-cities', logAdminAction('IMPORT_CITY_SHOWCASE'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const { importCitiesFromMarketData } = await import('../services/cityShowcaseImportService');
    const result = await importCitiesFromMarketData();

    void invalidateCache('/api/city-showcase');
    res.json({ message: 'Import complete', ...result });
  } catch (err) {
    adminLogger.error('Import city showcase error:', err);
    res.status(500).json({ message: 'Failed to import cities' });
  }
});

// POST /api/admin/city-showcase/upload-image
//
// Returns the stored URL only; the caller attaches it to a panel with POST or
// PATCH. That split is what lets the create form upload a photo before the
// row it belongs to exists — required, since a row without a photo is invalid.
router.post(
  '/city-showcase/upload-image',
  logAdminAction('UPLOAD_CITY_SHOWCASE_IMAGE'),
  cityShowcaseImageUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ message: 'No image file provided' }); return; }

      const { uploadImage } = await import('../services/imageStorageService');
      // Portrait master: the gallery panel is a tall column — roughly 4:5 when
      // expanded on a desktop and far narrower when collapsed — and it is
      // always `object-cover`, so a landscape master would lose its sides. The
      // ceiling covers an expanded panel on a high-DPI screen without storing
      // more than the largest delivery ever asks for.
      const result = await uploadImage(req.file.buffer, {
        userId: (req as any).user._id.toString(),
        type: 'listing' as any,
        maxWidth: 1600,
        maxHeight: 2000, // 4:5, so a portrait upload is never squeezed
        preserveQuality: true,
      });

      void invalidateCache('/api/city-showcase');
      res.json({ url: result.url, publicId: result.publicId });
    } catch (err) {
      adminLogger.error('Upload city showcase image error:', err);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  }
);

// ============================================================================
// City photos — the images Explore Cities shows
//
// One photo per city, but three collections can supply it (`CityMarketData`,
// `CityShowcase`, `VillaDestination`). `cityPhotoService` resolves them in a
// fixed order; these endpoints let an admin see what each city is currently
// using, where it came from, and override it.
// ============================================================================

/**
 * Every tracked city with its resolved photo and the alternatives available.
 *
 * The alternatives are what make "the same place is already curated over
 * there" visible: an admin can adopt the City Gallery or Villa Destination
 * photo in one click instead of re-uploading the same picture.
 */
router.get('/city-photos', logAdminAction('VIEW_CITY_PHOTOS'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const CityMarketData = (await import('../models/CityMarketData')).default;
    const { loadCityPhotoCandidates, pickCityPhoto, placeKey } = await import('../services/cityPhotoService');

    const cities = await CityMarketData
      .find({}, 'city country countryCode featured imageUpdatedAt')
      .sort({ country: 1, city: 1 })
      .lean();

    const candidates = await loadCityPhotoCandidates(
      cities.map(c => ({ city: c.city, country: c.country })),
    );

    res.json({
      cities: cities.map(c => {
        const entry = candidates.get(placeKey(c.city, c.country));
        const active = pickCityPhoto(entry);
        return {
          city: c.city,
          country: c.country,
          countryCode: c.countryCode,
          featured: Boolean(c.featured),
          imageUpdatedAt: c.imageUpdatedAt ?? null,
          active: active ?? null,
          candidates: {
            manual: entry?.manual ?? null,
            cityGallery: entry?.cityGallery ?? null,
            villaDestination: entry?.villaDestination ?? null,
            auto: entry?.auto ?? null,
          },
        };
      }),
    });
  } catch (err) {
    adminLogger.error('List city photos error:', err);
    res.status(500).json({ message: 'Failed to load city photos' });
  }
});

/**
 * Upload a photo for a city. Returns the stored URL only — the caller attaches
 * it with the PUT below, which is what lets the form preview an upload before
 * committing it.
 */
router.post(
  '/city-photos/upload',
  logAdminAction('UPLOAD_CITY_PHOTO'),
  cityShowcaseImageUpload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) { res.status(400).json({ message: 'No image file provided' }); return; }

      const { uploadImage } = await import('../services/imageStorageService');
      // Landscape master: these appear as a wide hero (1200x500) and as card
      // headers (800x400), always `object-cover`, so a portrait upload would
      // lose its top and bottom.
      const result = await uploadImage(req.file.buffer, {
        userId: (req as any).user._id.toString(),
        type: 'listing' as any,
        maxWidth: 2000,
        maxHeight: 1250, // 16:10, so a landscape upload is never squeezed
        preserveQuality: true,
      });

      res.json({ url: result.url, publicId: result.publicId });
    } catch (err) {
      adminLogger.error('Upload city photo error:', err);
      res.status(500).json({ message: 'Failed to upload image' });
    }
  }
);

/**
 * Set a city's photo. Marks it `manual`, which both wins over an inherited
 * photo and makes the Wikipedia auto-seeder leave it alone.
 */
router.put('/city-photos', logAdminAction('SET_CITY_PHOTO'), async (req: Request, res: Response): Promise<void> => {
  try {
    const city = String(req.body?.city ?? '').trim();
    const country = String(req.body?.country ?? '').trim();
    const imageUrl = String(req.body?.imageUrl ?? '').trim();
    const imageCredit = String(req.body?.imageCredit ?? '').trim();
    const imagePublicId = String(req.body?.imagePublicId ?? '').trim();

    if (!city || !country) { res.status(400).json({ message: 'City and country are required' }); return; }
    // Only https: a data: or javascript: URL would end up in an <img src>
    // served to every visitor.
    if (!/^https:\/\/[^\s]+$/i.test(imageUrl)) {
      res.status(400).json({ message: 'Image URL must be an https:// address' });
      return;
    }
    if (imageUrl.length > 2000) { res.status(400).json({ message: 'Image URL is too long' }); return; }
    // Refused here rather than saved and then blocked by the CSP: an image
    // from an unlisted host renders as a blank frame with nothing to explain
    // it, so the curator has to hear about it now. Uploading through the app
    // always satisfies this — those land on Cloudinary.
    if (!isAllowedPhotoUrl(imageUrl)) {
      res.status(400).json({
        message: `Photos can only be linked from: ${allowedPhotoHostsHint()}. Upload the file instead and it will be hosted for you.`,
      });
      return;
    }
    if (imageCredit.length > 200) { res.status(400).json({ message: 'Credit must be 200 characters or fewer' }); return; }

    const CityMarketData = (await import('../models/CityMarketData')).default;
    const updated = await CityMarketData.findOneAndUpdate(
      {
        city: new RegExp(`^${escapeRegex(city)}$`, 'i'),
        country: new RegExp(`^${escapeRegex(country)}$`, 'i'),
      },
      {
        // Explicit operators rather than bare paths: this update both sets and
        // clears fields, and mixing the two forms in one object leaves it to
        // the driver to guess which is which.
        $set: {
          imageUrl,
          imageSource: 'manual',
          imageUpdatedAt: new Date(),
          ...(imageCredit ? { imageCredit } : {}),
          ...(imagePublicId ? { imagePublicId } : {}),
        },
        ...(imageCredit ? {} : { $unset: { imageCredit: 1 } }),
      },
      { new: true },
    ).lean();

    if (!updated) { res.status(404).json({ message: `We don't track ${city}, ${country}` }); return; }

    void invalidateCache('/api/cities');
    res.json({
      city: { city: updated.city, country: updated.country },
      active: { imageUrl, source: 'manual', ...(imageCredit ? { credit: imageCredit } : {}) },
    });
  } catch (err) {
    adminLogger.error('Set city photo error:', err);
    res.status(500).json({ message: 'Failed to save the city photo' });
  }
});

/**
 * Clear a city's override, handing it back to the resolution chain (City
 * Gallery → Villa Destination → the Wikipedia seeder). The Cloudinary asset is
 * left in place: another city or a gallery panel may be using the same upload.
 */
router.delete('/city-photos', logAdminAction('CLEAR_CITY_PHOTO'), async (req: Request, res: Response): Promise<void> => {
  try {
    const city = String(req.query?.city ?? '').trim();
    const country = String(req.query?.country ?? '').trim();
    if (!city || !country) { res.status(400).json({ message: 'City and country are required' }); return; }

    const CityMarketData = (await import('../models/CityMarketData')).default;
    const updated = await CityMarketData.findOneAndUpdate(
      {
        city: new RegExp(`^${escapeRegex(city)}$`, 'i'),
        country: new RegExp(`^${escapeRegex(country)}$`, 'i'),
      },
      { $unset: { imageUrl: 1, imageCredit: 1, imagePublicId: 1 }, $set: { imageSource: 'auto' } },
      { new: true },
    ).lean();

    if (!updated) { res.status(404).json({ message: `We don't track ${city}, ${country}` }); return; }

    const { resolveCityPhoto } = await import('../services/cityPhotoService');
    const active = await resolveCityPhoto(updated.city, updated.country);

    void invalidateCache('/api/cities');
    res.json({ city: { city: updated.city, country: updated.country }, active });
  } catch (err) {
    adminLogger.error('Clear city photo error:', err);
    res.status(500).json({ message: 'Failed to clear the city photo' });
  }
});

// ============================================================================
// City directory — the (city, country) names the admin can pick from
//
// A separate concern from both collections it touches: it is not market
// analytics (CityMarketData's job) and not a gallery panel (CityShowcase's
// job), just a typo-proof list of names to choose from when creating either.
// ============================================================================

/**
 * Every distinct (city, country) pair already known to `CityMarketData`.
 *
 * A cheap projection, not `getCitiesByCountry`'s enriched version — this is
 * for populating a picker, not for rendering market data, and enriching every
 * row with live stats would make the form wait on work it never uses.
 */
router.get('/cities', logAdminAction('VIEW_CITY_DIRECTORY'), async (_req: Request, res: Response): Promise<void> => {
  try {
    const CityMarketData = (await import('../models/CityMarketData')).default;
    const cities = await CityMarketData.find({}, 'city country')
      .sort({ country: 1, city: 1 })
      .lean();
    res.json({ cities: cities.map(c => ({ city: c.city, country: c.country })) });
  } catch (err) {
    adminLogger.error('List city directory error:', err);
    res.status(500).json({ message: 'Failed to load the city directory' });
  }
});

/**
 * Ensures a (city, country) pair exists in `CityMarketData`, creating a
 * minimal stub if it doesn't.
 *
 * Called before every city-showcase save (see `CityShowcaseForm` /
 * `useCityShowcaseManager`) so a name typed for a gallery panel is never lost
 * to that panel alone — it also becomes a real, reusable entry other city
 * pickers and the "Import cities from database" action can find. The stub
 * carries none of the real market analytics that field is otherwise for
 * (average price, demand score, rental yield…): those stay at the neutral
 * zero this app already uses elsewhere for a city with no data yet — see
 * `STATIC_CITY_SEEDS` in `PopularCitiesSection.tsx` — and `featured: false`
 * so a bare stub never starts outranking cities with real numbers.
 *
 * Idempotent and case-insensitive on the pair, so calling it for a city that
 * already exists (overwhelmingly the common case) just returns that row.
 */
router.post('/cities', logAdminAction('ENSURE_CITY_DIRECTORY_ENTRY'), async (req: Request, res: Response): Promise<void> => {
  try {
    const city = String(req.body?.city ?? '').trim();
    const country = String(req.body?.country ?? '').trim();
    const countryCode = String(req.body?.countryCode ?? '').trim().toUpperCase();

    if (city.length < 2 || city.length > 80) { res.status(400).json({ message: 'City must be between 2 and 80 characters' }); return; }
    if (country.length < 2 || country.length > 60) { res.status(400).json({ message: 'Country must be between 2 and 60 characters' }); return; }
    if (!/^[A-Z]{2}$/.test(countryCode)) { res.status(400).json({ message: 'Country code must be a 2-letter ISO code' }); return; }

    const CityMarketData = (await import('../models/CityMarketData')).default;

    const existing = await CityMarketData.findOne({
      city: new RegExp(`^${escapeRegex(city)}$`, 'i'),
      country: new RegExp(`^${escapeRegex(country)}$`, 'i'),
    });
    if (existing) { res.json({ city: { city: existing.city, country: existing.country }, created: false }); return; }

    const created = await CityMarketData.create({
      city, country, countryCode,
      avgPricePerSqm: 0, medianPrice: 0, priceGrowthYoY: 0, priceGrowthMoM: 0,
      averageDaysOnMarket: 0, listingsCount: 0, soldLastMonth: 0,
      demandScore: 0, rentalYield: 0, investmentScore: 0,
      marketTrend: 'stable', dataSource: 'manual', featured: false,
      topNeighborhoods: [], highlights: [],
    });
    res.status(201).json({ city: { city: created.city, country: created.country }, created: true });
  } catch (err) {
    adminLogger.error('Ensure city directory entry error:', err);
    res.status(500).json({ message: 'Failed to save the city' });
  }
});

export default router;
