import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './config/database';
import { setupChatSocket } from './sockets/chatSocket';
import { setSocketInstance } from './utils/socketInstance';

// Import and initialize Sentry for error monitoring (must be early)
import { initSentry, setupSentry, attachSentryErrorHandler } from './lib/sentry';

// Import security middleware
import {
  validateEnvironment,
  applySecurityMiddleware,
  generalRateLimiter,
  sensitiveRateLimiter,
  paymentRateLimiter,
  xssSanitizer,
  getSocketCorsConfig,
} from './middleware/security';

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

console.log(`🚀 Server starting in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`📁 Loading environment from: ${envFile}`);

// Initialize Sentry first (before anything else)
initSentry();

// Validate environment variables (warns in dev, throws in production)
validateEnvironment();

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
import measurementRoutes from './routes/measurementRoutes';

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

// Setup Sentry request handlers (must be first middleware)
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
    console.log('✅ Google Play Service initialized');
  } catch (error) {
    console.warn('⚠️  Google Play Service not initialized:', error);
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
    console.log('✅ App Store Service initialized');
  } catch (error) {
    console.warn('⚠️  App Store Service not initialized:', error);
  }
}

// Start reconciliation worker (if enabled)
if (process.env.ENABLE_RECONCILIATION === 'true') {
  scheduleReconciliation();
  console.log('✅ Reconciliation worker started');
}

// Start subscription expiration worker (always enabled for security)
scheduleExpirationWorker();
console.log('✅ Subscription expiration worker started');

// Start promotion refresh worker (for Highlight tier auto-refresh and expired promotion cleanup)
startPromotionRefreshWorker();
console.log('✅ Promotion refresh worker started');

// Start trial management job (for agent trial reminders and expirations)
startTrialManagementJob();
console.log('✅ Trial management job started');

// Start city market data update job (biweekly updates on 1st and 15th)
startCityMarketDataUpdateJob();
console.log('✅ City market data update job started (biweekly)');

// Start monthly coupon refresh job (1st of each month)
startMonthlyCouponJob();
console.log('✅ Monthly coupon refresh job started (1st of each month)');

// ============================================================================
// SECURITY MIDDLEWARE - Apply comprehensive security headers and CORS
// ============================================================================
applySecurityMiddleware(app);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression
app.use(compression());

// Setup Swagger API documentation (only in development or if explicitly enabled)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
}

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5001,
    cors: 'enabled'
  });
});

// SEO routes (sitemap.xml, robots.txt) - at root level, not under /api
app.use('/', sitemapRoutes);

// ============================================================================
// API ROUTES with Rate Limiting
// ============================================================================

// Apply general rate limiting to all API routes
app.use('/api', generalRateLimiter);

// Apply XSS sanitization to all API routes
app.use('/api', xssSanitizer);

// Apply API caching for GET requests (public data only)
app.use('/api', apiCache);

// Sensitive routes with stricter rate limiting (auth, password reset, etc.)
app.use('/api/auth', sensitiveRateLimiter, authRoutes);

// Payment routes with payment-specific rate limiting
app.use('/api/payments', paymentRateLimiter, paymentRoutes);
app.use('/api/subscriptions', paymentRateLimiter, subscriptionRoutes);
app.use('/api/webhooks', webhookRoutes); // Webhooks from Stripe - no rate limit needed

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
app.use('/api/agency-join-requests', agencyJoinRequestRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent-requests', agentRequestRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/neighborhood-insights', neighborhoodInsightsRoutes);
app.use('/api/sales-history', salesHistoryRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/cities', cityMarketDataRoutes); // City market data and recommendations
app.use('/api/admin', sensitiveRateLimiter, adminRoutes); // Admin panel routes (VPN + admin role required)
app.use('/api/license', licenseRoutes); // Agent license verification
app.use('/api/credentials', credentialRoutes); // Agent credentials management
app.use('/api/view-stats', viewStatsRoutes); // View statistics tracking
app.use('/api/notifications', notificationRoutes); // User notifications
app.use('/api/valuations', propertyValuationRoutes); // AI property valuation
app.use('/api/inquiries', inquiryRoutes); // Buyer-to-agent inquiries (rate limited)
app.use('/api/measurements', measurementRoutes); // User land measurements

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Sentry error handler (must be before other error handlers)
attachSentryErrorHandler(app);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5001;

httpServer.listen(PORT, () => {
  const isProd = process.env.NODE_ENV === 'production';
  console.log('');
  console.log('🚀 ============================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 ============================================');
  console.log('');
  console.log('🔒 Security Features:');
  console.log('   - Helmet security headers: Enabled');
  console.log('   - CORS: ' + (isProd ? 'Production whitelist' : 'Development (permissive)'));
  console.log('   - Rate limiting: Enabled (general + sensitive + payment)');
  console.log('   - XSS protection: Enabled');
  console.log('   - HPP protection: Enabled');
  console.log('   - NoSQL injection protection: Enabled');
  console.log('');
  console.log('📍 Health check: http://localhost:' + PORT + '/health');
  console.log('📍 API base URL: http://localhost:' + PORT + '/api');
  console.log('📍 WebSocket URL: ws://localhost:' + PORT);
  console.log('');

  // Start subscription cron jobs
  startCronJobs();
});

export default app;
