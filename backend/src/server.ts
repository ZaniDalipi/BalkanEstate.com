import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './config/database';
import { setupChatSocket } from './sockets/chatSocket';
import { setSocketInstance } from './utils/socketInstance';


// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/authRoutes';
import propertyRoutes from './routes/propertyRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
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

// Import services
import { initializeGooglePlayService } from './services/googlePlayService';
import { startCronJobs } from './cron';
import { initializeAppStoreService } from './services/appStoreService';
import { scheduleReconciliation } from './workers/reconciliationWorker';
import { scheduleExpirationWorker } from './workers/subscriptionExpirationWorker';
import { startPromotionRefreshWorker } from './workers/promotionRefreshWorker';
import { startTrialManagementJob } from './jobs/trialManagementJob';
import { startCityMarketDataUpdateJob } from './jobs/updateCityMarketData';

// Create Express app
const app: Application = express();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST'],
    credentials: true,
  },
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

// ============================================================================
// MANUAL CORS MIDDLEWARE - Handle ALL CORS manually for maximum control
// ============================================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  // Allow any origin in development
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    console.log(`✅ CORS Preflight: ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    res.status(204).end();
    return;
  }

  // Log all other requests
  console.log(`📥 Request: ${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging (in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Compression
app.use(compression());

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5001,
    cors: 'enabled'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/webhooks', webhookRoutes);
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
app.use('/api/admin', adminRoutes); // Admin panel routes (VPN + admin role required)
app.use('/api/license', licenseRoutes); // Agent license verification

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

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
  console.log('');
  console.log('🚀 ============================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 CORS: Enabled for all origins');
  console.log('🚀 WebSocket: Enabled for real-time chat');
  console.log('🚀 ============================================');
  console.log('');
  console.log('📍 Health check: http://localhost:' + PORT + '/health');
  console.log('📍 API base URL: http://localhost:' + PORT + '/api');
  console.log('📍 WebSocket URL: ws://localhost:' + PORT);
  console.log('');

  // Start subscription cron jobs
  startCronJobs();
});

export default app;
