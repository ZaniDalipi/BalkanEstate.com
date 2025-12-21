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
  refreshToken,
  verifyEmail,
  resendVerificationEmail,
  enhancedLogout,
  logoutAllDevices,
  getActiveSessions,
  getLoginHistory,
  changePassword,
  setActiveRole,
  addRole,
} from '../controllers/authController';
import { getUserStats, getAllAgents, syncStats, syncAllSubscriptionCounters } from '../controllers/userController';
import { protect } from '../middleware/auth';
import passport, { oauthStrategies } from '../config/passport';
import {
  loginRateLimiterIP,
  signupRateLimiterIP,
  passwordResetRateLimiterIP,
} from '../middleware/rateLimiter';

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

// Traditional auth routes with rate limiting
router.post('/signup', signupRateLimiterIP, signup);
router.post('/login', loginRateLimiterIP, login);
router.post('/logout', protect, enhancedLogout);
router.post('/logout-all', protect, logoutAllDevices);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/set-public-key', protect, setPublicKey);
router.post('/switch-role', protect, switchRole);
router.get('/my-stats', protect, getUserStats);
router.post('/sync-stats', protect, syncStats);
router.post('/sync-all-subscriptions', protect, syncAllSubscriptionCounters);
router.get('/agents', getAllAgents);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

// Token management
router.post('/refresh-token', refreshToken);
router.get('/sessions', protect, getActiveSessions);
router.get('/login-history', protect, getLoginHistory);

// Email verification routes
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Password reset routes with rate limiting
router.post('/forgot-password', passwordResetRateLimiterIP, requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

// Role management routes
router.post('/set-active-role', protect, setActiveRole);
router.post('/add-role', protect, addRole);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=google_auth_failed` }),
  oauthCallback
);

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

// Facebook OAuth routes - only register if Facebook strategy is configured
if (oauthStrategies.facebook) {
  router.get(
    '/facebook',
    passport.authenticate('facebook', { session: false, scope: ['email'] })
  );
  router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=facebook_auth_failed` }),
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
