import express from 'express';
import multer from 'multer';
import {
  signup,
  login,
  getMe,
  updateProfile,
  setPublicKey,
  oauthCallback,
  switchRole,
  requestPasswordReset,
  resetPassword,
  uploadAvatar,
  saveAvatarOptions,
  refreshToken,
  verifyEmail,
  resendVerificationEmail,
  enhancedLogout,
  logoutAllDevices,
  getActiveSessions,
  getLoginHistory,
  changePassword,
  setPassword,
  deleteAccount,
  setActiveRole,
  addRole,
  getEmailPreferences,
  updateEmailPreferences,
  unsubscribeFromEmails,
} from '../controllers/authController';
import { getUserStats, getAllAgents, syncStats, syncAllSubscriptionCounters } from '../controllers/userController';
import { protect } from '../middleware/auth';
import passport, { oauthStrategies } from '../config/passport';
import {
  loginRateLimiterIP,
  signupRateLimiterIP,
  passwordResetRateLimiterIP,
  refreshTokenRateLimiterIP,
} from '../middleware/rateLimiter';
import { decryptPayload } from '../middleware/decryptPayload';
import { getPublicKeyBase64 } from '../utils/payloadEncryption';

// Configure multer for avatar uploads
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


const router = express.Router();

// Public key endpoint for client-side encryption
router.get('/encryption-key', (_req, res) => {
  res.json({ publicKey: getPublicKeyBase64() });
});

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid input or email already exists
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/signup', signupRateLimiterIP, decryptPayload, signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/login', loginRateLimiterIP, decryptPayload, login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', protect, enhancedLogout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout-all', protect, logoutAllDevices);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/set-public-key', protect, setPublicKey);
router.post('/switch-role', protect, switchRole);
router.get('/my-stats', protect, getUserStats);
router.post('/sync-stats', protect, syncStats);
router.post('/sync-all-subscriptions', protect, syncAllSubscriptionCounters);
router.get('/agents', getAllAgents);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/save-avatar-options', protect, saveAvatarOptions);

// Token management
router.post('/refresh-token', refreshTokenRateLimiterIP, refreshToken);
router.get('/sessions', protect, getActiveSessions);
router.get('/login-history', protect, getLoginHistory);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password reset routes with rate limiting
router.post('/forgot-password', passwordResetRateLimiterIP, decryptPayload, requestPasswordReset);
router.post('/reset-password', decryptPayload, resetPassword);
router.post('/change-password', protect, decryptPayload, changePassword);
router.post('/set-password', protect, decryptPayload, setPassword);
router.post('/delete-account', protect, decryptPayload, deleteAccount);

// Role management routes
router.post('/set-active-role', protect, setActiveRole);
router.post('/add-role', protect, addRole);

// Email preferences & unsubscribe routes
router.get('/email-preferences', protect, getEmailPreferences);
router.put('/email-preferences', protect, updateEmailPreferences);
router.get('/unsubscribe', unsubscribeFromEmails); // Public route - no auth needed

// OAuth providers endpoint - returns which providers are available
router.get('/oauth/providers', (req, res) => {
  res.json({
    providers: {
      google: !!oauthStrategies.google,
      apple: !!oauthStrategies.apple,
    }
  });
});

// Google OAuth routes - only register if Google strategy is configured
if (oauthStrategies.google) {
  router.get(
    '/google',
    passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
  );
  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=google_auth_failed` }),
    oauthCallback
  );
}

// Apple OAuth routes - only register if Apple strategy is configured
if (oauthStrategies.apple) {
  router.get(
    '/apple',
    passport.authenticate('apple', { session: false })
  );
  router.get(
    '/apple/callback',
    passport.authenticate('apple', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=apple_auth_failed` }),
    oauthCallback
  );
}

export default router;
