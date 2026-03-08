import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import connectDB from './config/database';
import { setupChatSocket } from './sockets/chatSocket';
import { setupPropertySocket } from './sockets/propertySocket';
import { setSocketInstance } from './utils/socketInstance';
import { serverLogger } from './utils/logger';

// Import and initialize Sentry for error monitoring (must be early)
import { initSentry, setupSentry, attachSentryErrorHandler } from './lib/sentry';

// Import security middleware
import {
  validateEnvironment,
  applySecurityMiddleware,
  getCorsConfig,
  generalRateLimiter,
  sensitiveRateLimiter,
  paymentRateLimiter,
  aiRateLimiter,
  xssSanitizer,
  getSocketCorsConfig,
} from './middleware/security';

// CSRF protection (double-submit cookie pattern)
import { csrfCookie, csrfValidation } from './middleware/csrf';

// Import cache middleware
import { apiCache } from './middleware/cache';

// Import Swagger configuration
import { setupSwagger } from './config/swagger';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : process.env.NODE_ENV === 'staging'
    ? '.env.staging'
    : '.env.development';

dotenv.config({ path: envFile });

// Fallback to .env if environment-specific file doesn't exist
dotenv.config();

serverLogger.info(`🚀 Server starting in ${process.env.NODE_ENV || 'development'} mode`);
serverLogger.info(`📁 Loading environment from: ${envFile}`);

// Initialize Sentry first (before anything else)
initSentry();

// Validate environment variables (warns in dev, throws in production)
validateEnvironment();

// Initialize RSA key pair for client-side payload encryption
import { initializeKeyPair } from './utils/payloadEncryption';
initializeKeyPair();

// Import routes
import authRoutes from './routes/authRoutes';
import propertyRoutes from './routes/propertyRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import savedAgentRoutes from './routes/savedAgentRoutes';
import savedSearchRoutes from './routes/savedSearchRoutes';
import conversationRoutes from './routes/conversationRoutes';
import paymentRoutes from './routes/paymentRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import webhookRoutes from './routes/webhookRoutes';
import productRoutes from './routes/productRoutes';
import bankExportRoutes from './routes/bankExportRoutes';
import promotionRoutes from './routes/promotionRoutes';
import couponRoutes from './routes/couponRoutes';
import agencyRoutes from './routes/agencyRoutes';
import agencyFavoriteRoutes from './routes/agencyFavoriteRoutes';
import agencyJoinRequestRoutes from './routes/agencyJoinRequestRoutes';
import agentRoutes from './routes/agentRoutes';
import agentRequestRoutes from './routes/agentRequestRoutes';
import geocodingRoutes from './routes/geocodingRoutes';
import neighborhoodInsightsRoutes from './routes/neighborhoodInsightsRoutes';
import salesHistoryRoutes from './routes/salesHistoryRoutes';
import discountCodeRoutes from './routes/discountCodeRoutes';
import agencyFeaturedSubscriptionRoutes from './routes/agencyFeaturedSubscriptionRoutes';
import adminRoutes from './routes/adminRoutes';
import cityMarketDataRoutes from './routes/cityMarketDataRoutes';
import licenseRoutes from './routes/licenseRoutes';
import credentialRoutes from './routes/credentialRoutes';
import sitemapRoutes from './routes/sitemapRoutes';
import viewStatsRoutes from './routes/viewStatsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import propertyValuationRoutes from './routes/propertyValuationRoutes';
import inquiryRoutes from './routes/inquiryRoutes';
import viewingRoutes from './routes/viewingRoutes';
import measurementRoutes from './routes/measurementRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import siteContentRoutes from './routes/siteContentRoutes';
import achievementRoutes from './routes/achievementRoutes';
import promotionPlanRoutes from './routes/promotionPlanRoutes';
import videoRoutes from './routes/videoRoutes';
import aiRoutes from './routes/aiRoutes';
import cadastreRoutes from './routes/cadastreRoutes';
import agencyDashboardRoutes from './routes/agencyDashboardRoutes';
import fileRoutes from './routes/fileRoutes';
import mapProxyRoutes from './routes/mapProxyRoutes';
import newsRoutes from './routes/newsRoutes';
import testimonialRoutes from './routes/testimonialRoutes';

// Import services
import { initializeGooglePlayService } from './services/googlePlayService';
import { startCronJobs } from './cron';
import { initializeAppStoreService } from './services/appStoreService';
import { scheduleReconciliation } from './workers/reconciliationWorker';
import { scheduleExpirationWorker } from './workers/subscriptionExpirationWorker';
import { startPromotionRefreshWorker } from './workers/promotionRefreshWorker';
import { startTrialManagementJob } from './jobs/trialManagementJob';
import { startCityMarketDataUpdateJob } from './jobs/updateCityMarketData';
import { startMonthlyCouponJob } from './jobs/monthlyCouponJob';

// Create Express app
const app: Application = express();

// Trust reverse proxy (required in production behind nginx/load balancer)
app.set('trust proxy', 1);

// CORS must be the absolute first middleware so preflight OPTIONS requests
// always get proper headers before any other middleware can interfere
app.use(getCorsConfig());

// Setup Sentry request handlers
setupSentry(app);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with secure CORS configuration
const io = new Server(httpServer, {
  cors: getSocketCorsConfig(),
});

// Store Socket.IO instance for use in controllers
setSocketInstance(io);

// Setup chat socket handlers
setupChatSocket(io);

// Setup property socket for real-time listing updates
setupPropertySocket(io);

// Connect to database
connectDB();

// Initialize store services (if credentials are provided)
if (process.env.GOOGLE_PLAY_CLIENT_EMAIL && process.env.GOOGLE_PLAY_PRIVATE_KEY) {
  try {
    initializeGooglePlayService({
      clientEmail: process.env.GOOGLE_PLAY_CLIENT_EMAIL,
      privateKey: process.env.GOOGLE_PLAY_PRIVATE_KEY.replace(/\\n/g, '\n'),
      packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.balkanestate.app',
    });
    serverLogger.info('✅ Google Play Service initialized');
  } catch (error) {
    serverLogger.warn('⚠️  Google Play Service not initialized:', error);
  }
}

if (process.env.APP_STORE_ISSUER_ID && process.env.APP_STORE_KEY_ID && process.env.APP_STORE_PRIVATE_KEY) {
  try {
    initializeAppStoreService({
      issuerId: process.env.APP_STORE_ISSUER_ID,
      keyId: process.env.APP_STORE_KEY_ID,
      privateKey: process.env.APP_STORE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      bundleId: process.env.APP_STORE_BUNDLE_ID || 'com.balkanestate.app',
      environment: (process.env.APP_STORE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    });
    serverLogger.info('✅ App Store Service initialized');
  } catch (error) {
    serverLogger.warn('⚠️  App Store Service not initialized:', error);
  }
}

// Start reconciliation worker (if enabled)
if (process.env.ENABLE_RECONCILIATION === 'true') {
  scheduleReconciliation();
  serverLogger.info('✅ Reconciliation worker started');
}

// Start subscription expiration worker (always enabled for security)
scheduleExpirationWorker();
serverLogger.info('✅ Subscription expiration worker started');

// Start promotion refresh worker (for Highlight tier auto-refresh and expired promotion cleanup)
startPromotionRefreshWorker();
serverLogger.info('✅ Promotion refresh worker started');

// Start trial management job (for agent trial reminders and expirations)
startTrialManagementJob();
serverLogger.info('✅ Trial management job started');

// Start city market data update job (biweekly updates on 1st and 15th)
startCityMarketDataUpdateJob();
serverLogger.info('✅ City market data update job started (biweekly)');

// Start monthly coupon refresh job (1st of each month)
startMonthlyCouponJob();
serverLogger.info('✅ Monthly coupon refresh job started (1st of each month)');

// ============================================================================
// SECURITY MIDDLEWARE - Apply comprehensive security headers and CORS
// ============================================================================
applySecurityMiddleware(app);

// Stripe webhook needs raw body BEFORE json parser (for signature verification)
import { handleWebhook as handleStripeWebhook } from './controllers/paymentController';
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Body parser & cookie parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging (in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression
app.use(compression());

// Response encryption (activates only when client sends X-Response-Key header)
import { encryptResponse } from './middleware/encryptResponse';
app.use(encryptResponse);

// Setup Swagger API documentation (development only — never in production)
// API docs expose endpoint schemas and could aid attackers
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// Health check route (non-API, for Docker/infrastructure probes)
const healthHandler = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
app.get('/health', healthHandler);

// SEO routes (sitemap.xml, robots.txt) - at root level, not under /api
app.use('/', sitemapRoutes);

// ============================================================================
// API ROUTES with Rate Limiting & CSRF Protection
// ============================================================================

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimiter);

// CSRF protection: set token cookie on every response, validate on mutations
// This prevents cross-origin forged requests (e.g., malicious sites tricking
// users into making API calls). Combined with JWT auth, provides defense-in-depth.
// IMPORTANT: csrfCookie must run BEFORE any /api route handlers (including
// /api/health) so that the frontend CSRF bootstrap via GET /api/health actually
// receives the Set-Cookie header.
app.use('/api', csrfCookie);
app.use('/api', csrfValidation);

// /api/health — for the frontend CSRF bootstrap (ensureCsrfToken).
// Registered AFTER csrfCookie so the response includes Set-Cookie: __csrf=...
// GET is a safe method, so csrfValidation skips it.
app.get('/api/health', healthHandler);

// Apply XSS sanitization to all API routes
app.use('/api', xssSanitizer);

// Apply API caching for GET requests (public data only)
app.use('/api', apiCache);

// Sensitive routes with stricter rate limiting (auth, password reset, etc.)
app.use('/api/auth', sensitiveRateLimiter, authRoutes);

// Payment routes with payment-specific rate limiting
app.use('/api/payments', paymentRateLimiter, paymentRoutes);
app.use('/api/subscriptions', paymentRateLimiter, subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks from payment provider - no rate limit needed

// Standard API routes
app.use('/api/properties', propertyRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/saved-agents', savedAgentRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bank-exports', bankExportRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api', agencyFeaturedSubscriptionRoutes); // Register BEFORE agencyRoutes to prevent conflicts
app.use('/api/agencies', agencyRoutes);
app.use('/api/agency-dashboard', agencyDashboardRoutes);
app.use('/api/agency-favorites', agencyFavoriteRoutes);
app.use('/api/agency-join-requests', agencyJoinRequestRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent-requests', agentRequestRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/neighborhood-insights', aiRateLimiter, neighborhoodInsightsRoutes); // AI-powered - rate limited
app.use('/api/ai', aiRateLimiter, aiRoutes); // AI-powered endpoints (description, distances, chat, search names)
app.use('/api/sales-history', salesHistoryRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/cities', cityMarketDataRoutes); // City market data and recommendations
app.use('/api/admin', sensitiveRateLimiter, adminRoutes); // Admin panel routes (VPN + admin role required)
app.use('/api/license', licenseRoutes); // Agent license verification
app.use('/api/credentials', credentialRoutes); // Agent credentials management
app.use('/api/view-stats', viewStatsRoutes); // View statistics tracking
app.use('/api/notifications', notificationRoutes); // User notifications
app.use('/api/valuations', aiRateLimiter, propertyValuationRoutes); // AI-powered - rate limited
app.use('/api/inquiries', inquiryRoutes); // Buyer-to-agent inquiries (rate limited)
app.use('/api/viewings', viewingRoutes); // Property viewing scheduling (rate limited)
app.use('/api/measurements', measurementRoutes); // User land measurements
app.use('/api/analytics', analyticsRoutes); // Analytics and activity tracking
app.use('/api/site-content', siteContentRoutes); // Public site content (how it works videos)
app.use('/api/achievements', achievementRoutes); // User and agency achievements
app.use('/api/promotion-plans', promotionPlanRoutes); // Listing promotion and agency feature plans
app.use('/api/videos', videoRoutes); // Property video generation (FFmpeg-based)
app.use('/api/cadastre', cadastreRoutes); // Cadastre WMS proxy (GetFeatureInfo)
app.use('/api/map', mapProxyRoutes); // Weather tile & FIRMS WMS proxy (API keys server-side)
app.use('/api/files', fileRoutes); // File access with storage access policy (ownership-based)
app.use('/api/news', newsRoutes); // Public real estate news
app.use('/api/testimonials', testimonialRoutes); // User testimonials (submit + public list)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Sentry error handler (must be before other error handlers)
attachSentryErrorHandler(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  serverLogger.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;

  // SECURITY: In production, never expose raw error messages — they may contain
  // MongoDB details, file paths, or other internal info. Only show them in development.
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev ? (err.message || 'Internal server error') : 'Internal server error';

  res.status(statusCode).json({
    message,
    ...(isDev && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  const isProd = process.env.NODE_ENV === 'production';
  serverLogger.info('');
  serverLogger.info('🚀 ============================================');
  serverLogger.info(`🚀 Server running on port ${PORT}`);
  serverLogger.info(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  serverLogger.info('🚀 ============================================');
  serverLogger.info('');
  serverLogger.info('🔒 Security Features:');
  serverLogger.info('   - Helmet security headers: Enabled');
  serverLogger.info('   - CORS: ' + (isProd ? 'Production whitelist' : 'Development (permissive)'));
  serverLogger.info('   - CSRF protection: Enabled (double-submit cookie)');
  serverLogger.info('   - Rate limiting: Enabled (general + sensitive + payment)');
  serverLogger.info('   - XSS protection: Enabled');
  serverLogger.info('   - HPP protection: Enabled');
  serverLogger.info('   - NoSQL injection protection: Enabled');
  serverLogger.info('');
  serverLogger.info('📍 Health check: http://localhost:' + PORT + '/health');
  serverLogger.info('📍 API base URL: http://localhost:' + PORT + '/api');
  serverLogger.info('📍 WebSocket URL: ws://localhost:' + PORT);
  serverLogger.info('');

  // Start subscription cron jobs
  startCronJobs();
});

export default app;
