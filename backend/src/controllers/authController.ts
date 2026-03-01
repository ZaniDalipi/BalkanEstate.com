import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
// generateToken moved to refreshTokenService - using generateTokenPair instead
import { IUser } from '../models/User';
import crypto from 'crypto';
import { uploadImage, deleteImage } from '../services/cloudinaryService';
import { validatePassword, passwordContainsUserInfo } from '../utils/passwordValidator';
import { sendVerificationEmail } from '../services/emailVerificationService';
import { generateTokenPair } from '../services/refreshTokenService';
import { loginRateLimiterAccount, resetLoginRateLimit } from '../middleware/rateLimiter';
import { activityLogger } from '../services/activityLogger';
import { authLogger } from '../utils/logger';
import { generateSecureAgentId } from '../utils/secureRandom';
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenFromRequest } from '../utils/cookieUtils';
import { FREE_TIER_LIMITS, PRO_TIER_LIMITS, ENTERPRISE_TIER_LIMITS } from '../config/subscriptionConstants';
import { buildFrontendRedirectUrl } from '../utils/redirectValidation';
import { validateLicenseNumber } from '../utils/licenseValidation';

/**
 * Build a sanitized user response object for public-facing auth endpoints (login/signup).
 * Only includes fields the frontend needs; strips internal/sensitive details.
 * All MongoDB ObjectIds are obfuscated so raw IDs never reach the client.
 */
const buildSafeUserResponse = (user: IUser) => ({
  id: encodeId(String(user._id)),
  email: user.email,
  name: user.name,
  phone: user.phone,
  role: user.role,
  provider: user.provider || 'local',
  hasPassword: !!user.password,
  avatarUrl: user.avatarUrl ?? null,
  avatarOptions: user.avatarOptions ?? null,
  gender: user.gender,
  city: user.city,
  country: user.country,
  isSubscribed: user.isSubscribed,
  isEmailVerified: user.isEmailVerified,
  activeListingsLimit: user.getActiveListingsLimit(),
  // Only include agent/agency fields if user is an agent
  ...(user.role === 'agent' ? {
    agencyId: user.agencyId ? encodeId(String(user.agencyId)) : undefined,
    agencyName: user.agencyName,
    agentId: user.agentId,
    licenseNumber: user.licenseNumber,
    trialActive: user.isTrialActive(),
    trialEndDate: user.trialEndDate,
    trialExpiring: user.isTrialExpiring(),
  } : {}),
  // Only return minimal subscription info, not the full internal object
  subscription: user.subscription ? {
    tier: user.subscription.tier,
    status: user.subscription.status,
    listingsLimit: user.subscription.listingsLimit,
    activeListingsCount: user.subscription.activeListingsCount,
    promotionCoupons: user.subscription.promotionCoupons,
    savedSearchesLimit: user.subscription.savedSearchesLimit,
  } : undefined,
});

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, confirmPassword, name, phone, role, licenseNumber, agencyInvitationCode, languages } = req.body;

    // ============================================
    // STEP 0: Enforce allowed registration roles
    // CRITICAL: Never allow self-registration as admin/super_admin
    // ============================================
    const ALLOWED_SIGNUP_ROLES = ['buyer', 'private_seller', 'agent'];
    const sanitizedRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'buyer';

    // ============================================
    // STEP 1: Validate ALL inputs BEFORE any database writes
    // ============================================

    // Validate required fields
    if (!email || !password || !name) {
      res.status(400).json({
        message: 'Email, password, and name are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    // Validate phone number (required for all signups)
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      res.status(400).json({
        message: 'Phone number is required',
        code: 'PHONE_REQUIRED'
      });
      return;
    }

    // Phone must start with + and a valid country code, followed by 6-12 digits
    const phoneRegex = /^\+\d{1,4}\d{6,12}$/;
    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      res.status(400).json({
        message: 'Invalid phone number format. Must include country code (e.g., +383 44 123 456)',
        code: 'INVALID_PHONE_FORMAT'
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        message: 'Invalid email format',
        code: 'INVALID_EMAIL_FORMAT'
      });
      return;
    }

    // Validate password confirmation if provided
    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet security requirements',
        code: 'WEAK_PASSWORD',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check if password contains user info (email, name)
    const userInfo = [email.split('@')[0], name];
    if (passwordContainsUserInfo(password, userInfo)) {
      res.status(400).json({
        message: 'Password should not contain your email or name',
        code: 'PASSWORD_CONTAINS_USER_INFO'
      });
      return;
    }

    // Check if user already exists (case-insensitive)
    // Return a generic message to prevent email enumeration attacks.
    // An attacker should not be able to discover which emails are registered.
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      res.status(400).json({
        message: 'Unable to create account. Please check your information and try again.',
        code: 'SIGNUP_FAILED'
      });
      return;
    }

    // ============================================
    // STEP 2: Validate agent-specific fields BEFORE creating user
    // ============================================

    let agencyName: string | undefined = undefined;
    let agencyId: mongoose.Types.ObjectId | undefined = undefined;
    let generatedAgentId: string | undefined = undefined;
    let verifiedAgency: any = null;

    if (sanitizedRole === 'agent') {
      // License number is required for agents
      if (!licenseNumber) {
        res.status(400).json({
          message: 'License number is required for agent registration',
          code: 'LICENSE_REQUIRED'
        });
        return;
      }

      // Validate license number format
      const licenseRegex = /^[A-Z0-9-]+$/i;
      if (!licenseRegex.test(licenseNumber)) {
        res.status(400).json({
          message: 'Invalid license number format. Only letters, numbers, and hyphens are allowed.',
          code: 'INVALID_LICENSE_FORMAT'
        });
        return;
      }

      // Validate license number length
      if (licenseNumber.length < 5 || licenseNumber.length > 30) {
        res.status(400).json({
          message: 'License number must be between 5 and 30 characters',
          code: 'INVALID_LICENSE_LENGTH'
        });
        return;
      }

      // Check if license number already exists in User or Agent collection
      // Use a generic error message to prevent license enumeration
      const existingUserWithLicense = await User.findOne({ licenseNumber: licenseNumber });
      const existingAgentWithLicense = await Agent.findOne({ licenseNumber: licenseNumber });
      if (existingUserWithLicense || existingAgentWithLicense) {
        res.status(400).json({
          message: 'Unable to create account. Please check your information and try again.',
          code: 'SIGNUP_FAILED'
        });
        return;
      }

      agencyName = 'Independent Agent'; // Default for independent agents

      // If agency invitation code is provided, verify it
      if (agencyInvitationCode) {
        verifiedAgency = await Agency.findOne({ invitationCode: agencyInvitationCode.toUpperCase() });

        if (!verifiedAgency) {
          res.status(400).json({
            message: 'Invalid agency invitation code. Please check the code and try again.',
            code: 'INVALID_AGENCY_CODE'
          });
          return;
        }

        agencyName = verifiedAgency.name;
        agencyId = verifiedAgency._id as unknown as mongoose.Types.ObjectId;
      }

      // Generate agent ID using secure random
      generatedAgentId = generateSecureAgentId();
    }

    // ============================================
    // STEP 3: All validations passed - NOW create records
    // ============================================

    // Determine listing limit based on role
    let activeListingsLimit = FREE_TIER_LIMITS.LISTINGS; // Default for buyers and private sellers
    if (sanitizedRole === 'agent') {
      activeListingsLimit = 0; // Agents need Pro subscription to post
    }

    // Create user with initialized stats
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name,
      phone: cleanPhone,
      role: sanitizedRole,
      licenseNumber: sanitizedRole === 'agent' ? licenseNumber : undefined,
      agencyName: agencyName,
      agencyId: agencyId,
      agentId: generatedAgentId,
      isEmailVerified: false,
      activeListingsLimit,
      stats: {
        totalViews: 0,
        totalSaves: 0,
        totalInquiries: 0,
        propertiesSold: 0,
        totalSalesValue: 0,
        lastUpdated: new Date()
      }
    });

    // If agent, create Agent record and add to agency
    if (sanitizedRole === 'agent' && licenseNumber) {
      try {
        const agentLanguages = languages && languages.length > 0 ? languages : ['English'];

        await Agent.create({
          userId: user._id,
          agencyName: agencyName!,
          agencyId: agencyId || undefined,
          agentId: generatedAgentId!,
          licenseNumber,
          licenseVerified: true,
          licenseVerificationDate: new Date(),
          languages: agentLanguages,
          isActive: true,
        });

        // Add agent to agency's agents array if agency was provided
        if (agencyId && verifiedAgency) {
          const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
          if (!verifiedAgency.agents.some((aid: any) => aid.toString() === userObjectId.toString())) {
            verifiedAgency.agents.push(userObjectId);
            verifiedAgency.totalAgents = verifiedAgency.agents.length;

            const existingLanguages = verifiedAgency.languages || [];
            const mergedLanguages = [...new Set([...existingLanguages, ...agentLanguages])];
            verifiedAgency.languages = mergedLanguages;

            await verifiedAgency.save();
          }
        }

        // Initialize dual-role system for agents
        user.availableRoles = ['agent', 'private_seller'];
        user.activeRole = 'agent';
        user.primaryRole = 'agent';

        // Initialize subscription as free tier - agents need Pro subscription to post
        user.subscription = {
          tier: 'free',
          status: 'active',
          listingsLimit: 0, // Agents start with 0, need Pro to post
          activeListingsCount: 0,
          privateSellerCount: 0,
          agentCount: 0,
          promotionCoupons: {
            monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS,
            available: FREE_TIER_LIMITS.PROMOTION_COUPONS,
            used: 0,
            rollover: 0,
            lastRefresh: new Date(),
          },
          savedSearchesLimit: FREE_TIER_LIMITS.SAVED_SEARCHES,
          totalPaid: 0,
        };

        user.subscriptionStatus = 'active';
        user.activeListingsLimit = 0;

        await user.save();

      } catch (agentError: any) {
        // If agent creation fails, delete the user to maintain consistency
        await User.findByIdAndDelete(user._id);
        res.status(500).json({
          message: 'Failed to create agent profile. Please try again.',
          code: 'AGENT_CREATION_FAILED'
        });
        return;
      }
    }

    // Send email verification (non-blocking)
    try {
      await sendVerificationEmail(user);
    } catch (emailError) {
      // Don't block signup if email fails
    }

    // Generate token pair
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    // Log successful signup
    activityLogger.logSignup(String(user._id), user.email, sanitizedRole, req);

    // Set refresh token as httpOnly cookie (not accessible to JS)
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.status(201).json({
      accessToken: tokens.accessToken,
      // refreshToken is set as httpOnly cookie only - never exposed in response body
      user: {
        ...buildSafeUserResponse(user),
        availableRoles: user.availableRoles,
        activeRole: user.activeRole,
        requiresSubscription: sanitizedRole === 'agent' && !user.isSubscribed,
      },
    });
  } catch (error: any) {

    // Handle MongoDB duplicate key errors with generic messages
    // to prevent enumeration of existing emails/licenses
    if (error.code === 11000) {
      res.status(400).json({
        message: 'Unable to create account. Please check your information and try again.',
        code: 'SIGNUP_FAILED'
      });
      return;
    }

    res.status(500).json({
      message: 'An error occurred during signup. Please try again.',
      code: 'SIGNUP_ERROR'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, password } = req.body;

    // Check if either email or phone is provided
    if (!email && !phone) {
      res.status(400).json({ message: 'Email or phone number is required' });
      return;
    }

    if (!password) {
      res.status(400).json({ message: 'Password is required' });
      return;
    }

    // Find user by email or phone
    let user;
    const identifier = email ? email.toLowerCase() : phone?.trim();

    if (email) {
      user = await User.findOne({ email: identifier });
    } else if (phone) {
      user = await User.findOne({ phone: identifier });
    }

    // Generic error message to prevent account enumeration
    const invalidCredentialsMsg = 'Invalid credentials';

    if (!user) {
      // Use timing-safe comparison to prevent timing attacks
      // Perform fake password comparison to maintain consistent response time
      await User.findOne({ email: 'nonexistent@example.com' });
      res.status(401).json({ message: invalidCredentialsMsg });
      return;
    }

    // Check account-level rate limiting
    const rateLimitResult = loginRateLimiterAccount(user.email);
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        message: 'Too many failed login attempts for this account. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      });
      return;
    }

    // Check if account is locked (production only — skip in dev to allow free testing)
    if (process.env.NODE_ENV === 'production' && user.isAccountLocked()) {
      const lockTime = user.lockUntil!.getTime() - Date.now();
      const minutesRemaining = Math.ceil(lockTime / (60 * 1000));

      res.status(423).json({
        message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        lockedUntil: user.lockUntil,
      });
      return;
    }

    // Check if user has a password (local auth)
    // Use generic message to avoid revealing that the account exists or uses social login
    if (!user.password) {
      res.status(401).json({
        message: invalidCredentialsMsg,
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    // Get client info for logging
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!isMatch) {
      // Log failed login attempt
      if (!user.loginHistory) user.loginHistory = [];
      user.loginHistory.push({
        timestamp: new Date(),
        success: false,
        ipAddress: clientIp,
        userAgent: userAgent,
        deviceInfo: userAgent,
        failureReason: 'Invalid password',
      });

      // Keep only last 100 login history entries to prevent unbounded growth
      if (user.loginHistory.length > 100) {
        user.loginHistory = user.loginHistory.slice(-100);
      }

      // Increment failed login attempts (production only)
      if (process.env.NODE_ENV === 'production') {
        await user.incrementLoginAttempts();
      }

      // Log failed login attempt
      activityLogger.logLoginFailed(email, 'Invalid password', req);

      res.status(401).json({ message: invalidCredentialsMsg });
      return;
    }

    // Password is correct - reset login attempts
    await user.resetLoginAttempts();

    // Log successful login
    activityLogger.logLogin(String(user._id), user.email, req);

    // Log successful login
    if (!user.loginHistory) user.loginHistory = [];
    user.loginHistory.push({
      timestamp: new Date(),
      success: true,
      ipAddress: clientIp,
      userAgent: userAgent,
      deviceInfo: userAgent,
    });

    // Keep only last 100 login history entries
    if (user.loginHistory.length > 100) {
      user.loginHistory = user.loginHistory.slice(-100);
    }

    await user.save();

    // Reset rate limits on successful login
    // Admins also get their IP limit cleared so they can switch accounts freely
    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
    resetLoginRateLimit(user.email, clientIp, isAdminUser);

    // Generate token pair (access + refresh)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: clientIp,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    // Set refresh token as httpOnly cookie (not accessible to JS)
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      accessToken: tokens.accessToken,
      // refreshToken is set as httpOnly cookie only - never exposed in response body
      user: buildSafeUserResponse(user),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'An error occurred during login' });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const currentUser = req.user as IUser;

    // CRITICAL: Fetch full user from database to get ALL fields including proSubscription
    // req.user from middleware only has basic JWT payload data
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // **AUTO-SYNC AGENCY DATA**: Comprehensive sync for users in agencies
    // This fixes users who joined via coupon before the sync fix was implemented
    const Agency = (await import('../models/Agency')).default;
    const Agent = (await import('../models/Agent')).default;
    let memberAgency: any = null;

    // Method 1: Check if user has agency.agencyId reference
    if (user.agency?.agencyId) {
      memberAgency = await Agency.findById(user.agency.agencyId);
    }

    // Method 2: Check if user is in an agency's agents array
    if (!memberAgency) {
      memberAgency = await Agency.findOne({ agents: user._id });
    }

    // If user is in an agency, sync ALL relevant fields
    if (memberAgency) {
      let needsSync = false;

      // Sync top-level agencyId
      if (!user.agencyId || String(user.agencyId) !== String(memberAgency._id)) {
        user.agencyId = memberAgency._id as any;
        needsSync = true;
      }

      // Sync agencyName (fix "Independent Agent" or missing)
      if (!user.agencyName || user.agencyName === 'Independent Agent') {
        user.agencyName = memberAgency.name;
        needsSync = true;
      }

      // Sync agency object
      if (!user.agency) {
        user.agency = { role: 'agent' };
        needsSync = true;
      }
      if (!user.agency.agencyId || String(user.agency.agencyId) !== String(memberAgency._id)) {
        user.agency.agencyId = memberAgency._id as any;
        user.agency.role = 'agent';
        needsSync = true;
      }

      // Sync subscription for agency agents (should be agency_agent tier, not free)
      if (!user.subscription || user.subscription.tier === 'free') {
        // Get expiration from agency or use 1 year from now
        const expiresAt = memberAgency.subscription?.expiresAt ||
                          memberAgency.featuredSubscription?.expiresAt ||
                          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        // Get agent listings limit from DB product (configurable in admin)
        const Product = (await import('../models/Product')).default;
        const agentProduct = await Product.findOne({ productId: 'agency_agent_yearly' }).lean();
        const agentListingsLimit = agentProduct?.listingsLimit ?? 25;

        user.subscription = {
          tier: 'agency_agent',
          status: 'active',
          listingsLimit: agentListingsLimit,
          activeListingsCount: user.subscription?.activeListingsCount || 0,
          privateSellerCount: user.subscription?.privateSellerCount || 0,
          agentCount: user.subscription?.agentCount || 0,
          promotionCoupons: { monthly: 0, available: 0, used: 0, rollover: 0, lastRefresh: new Date() },
          savedSearchesLimit: -1,
          totalPaid: user.subscription?.totalPaid || 0,
          expiresAt: expiresAt,
        };
        needsSync = true;
      }

      // Sync Agent record
      const agentRecord = await Agent.findOne({ userId: user._id });
      if (agentRecord && (!agentRecord.agencyId || agentRecord.agencyName === 'Independent Agent')) {
        agentRecord.agencyId = memberAgency._id as any;
        agentRecord.agencyName = memberAgency.name;
        await agentRecord.save();
        authLogger.info(`🔄 Auto-synced Agent record for user ${user._id}: ${memberAgency.name}`);
      }

      // **AUTO-CREATE SUBSCRIPTION DOCUMENT**: Ensure agency agents have a Subscription document
      // This is needed because getCurrentSubscription checks the Subscription collection first
      const Subscription = (await import('../models/Subscription')).default;

      try {
        const existingAgentSubscription = await Subscription.findOne({ userId: user._id });
        // Include userId so multiple agents sharing the same coupon code don't
        // collide on the (store, transactionId) compound unique index
        const agentCouponId = user.agency?.couponCode
          ? `${user.agency.couponCode}_${user._id}`
          : `agent_${user._id}`;

        if (!existingAgentSubscription && user.subscription?.tier === 'agency_agent') {
          const subExpiresAt = user.subscription.expiresAt ||
                              memberAgency.subscription?.expiresAt ||
                              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          await Subscription.create({
            userId: user._id,
            productId: 'agency_agent_yearly',
            store: 'agency_coupon',
            purchaseToken: agentCouponId,
            transactionId: agentCouponId,
            status: 'active',
            startDate: user.agency?.joinedAt || new Date(),
            renewalDate: subExpiresAt,
            expirationDate: subExpiresAt,
            autoRenewing: true,
            price: 0,
            currency: 'EUR',
            isAcknowledged: true,
          });
          authLogger.info(`✅ Auto-created Subscription document for agency agent ${user._id}`);
        } else if (existingAgentSubscription &&
                   user.subscription?.tier === 'agency_agent' &&
                   existingAgentSubscription.productId !== 'agency_agent_yearly') {
          existingAgentSubscription.productId = 'agency_agent_yearly';
          existingAgentSubscription.store = 'agency_coupon';
          existingAgentSubscription.purchaseToken = agentCouponId;
          existingAgentSubscription.transactionId = agentCouponId;
          existingAgentSubscription.status = 'active';
          existingAgentSubscription.price = 0;
          existingAgentSubscription.autoRenewing = true;
          const subExpiresAt = user.subscription.expiresAt ||
                              memberAgency.subscription?.expiresAt ||
                              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          existingAgentSubscription.expirationDate = subExpiresAt;
          existingAgentSubscription.renewalDate = subExpiresAt;
          existingAgentSubscription.expiryReminderSent = false;
          await existingAgentSubscription.save();
          authLogger.info(`✅ Auto-updated Subscription document for agency agent ${user._id}`);
        }
      } catch (subError: any) {
        // Don't let subscription sync errors break the /me endpoint —
        // the next request will retry automatically
        if (subError.code === 11000) {
          authLogger.warn(`Auto-sync: duplicate subscription key for agent ${user._id}, skipping`);
        } else {
          authLogger.error(`Auto-sync: subscription error for agent ${user._id}:`, subError);
        }
      }

      if (needsSync) {
        authLogger.info(`🔄 Auto-synced agency data for user ${user._id}: ${memberAgency.name}`);
      }
    }

    // **AUTO-MIGRATION & SYNC**: Initialize or sync subscription object
    const Property = (await import('../models/Property')).default;
    const Subscription = (await import('../models/Subscription')).default;
    const Product = (await import('../models/Product')).default;

    // Check if user has an active Pro subscription (legacy or new system)
    let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
    let listingsLimit = FREE_TIER_LIMITS.LISTINGS;
    let promotionCoupons = { monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS, available: FREE_TIER_LIMITS.PROMOTION_COUPONS, used: 0, rollover: 0, lastRefresh: new Date() };
    let savedSearchesLimit = FREE_TIER_LIMITS.SAVED_SEARCHES;
    let subscriptionExpiresAt: Date | undefined;
    let subscriptionStatus: string = 'active';

    // **CRITICAL: Check Subscriptions collection - this is the source of truth**
    // Handle both ObjectId and string userId formats for compatibility
    const userIdVariants = [user._id, String(user._id)];


    // PRIORITY 1: Check for active/trial subscriptions
    let dbSubscription = await Subscription.findOne({
      userId: { $in: userIdVariants },
      status: { $in: ['active', 'trial', 'grace'] },
      expirationDate: { $gt: new Date() },
    }).sort({ expirationDate: -1 });

    // PRIORITY 2: If no active, check for pending_cancellation or cancelled subscription that hasn't expired yet
    if (!dbSubscription) {
      dbSubscription = await Subscription.findOne({
        userId: { $in: userIdVariants },
        status: { $in: ['pending_cancellation', 'canceled'] },
        expirationDate: { $gt: new Date() },
      }).sort({ expirationDate: -1 });

    }

    // Debug: Log all subscriptions for this user if none found
    if (!dbSubscription) {
      const allUserSubs = await Subscription.find({
        userId: { $in: userIdVariants },
      }).sort({ createdAt: -1 }).limit(3);

      if (allUserSubs.length > 0) {
        allUserSubs.forEach(sub => {
        });
      } else {
      }
    }

    if (dbSubscription) {
      const productId = dbSubscription.productId;
      subscriptionStatus = dbSubscription.status;

      // Look up product limits from DB - single source of truth
      const dbProduct = productId ? await Product.findOne({ productId }).lean() : null;

      // Check if it's a Pro subscription
      if (productId?.includes('pro') || productId === 'pro_monthly' || productId === 'pro_yearly') {
        tier = 'pro';
        // Use DB product listingsLimit if available, fallback to constants
        if (productId === 'pro_monthly' || productId === 'seller_pro_monthly') {
          listingsLimit = dbProduct?.listingsLimit ?? PRO_TIER_LIMITS.MONTHLY.LISTINGS;
        } else if (productId === 'pro_yearly' || productId === 'seller_pro_yearly') {
          listingsLimit = dbProduct?.listingsLimit ?? PRO_TIER_LIMITS.YEARLY.LISTINGS;
        } else {
          listingsLimit = dbProduct?.listingsLimit ?? PRO_TIER_LIMITS.YEARLY.LISTINGS;
        }
        const proMonthlyCoupons = dbProduct?.promotionCoupons ?? PRO_TIER_LIMITS.YEARLY.PROMOTION_COUPONS;
        promotionCoupons = { monthly: proMonthlyCoupons, available: proMonthlyCoupons, used: 0, rollover: 0, lastRefresh: new Date() };
        savedSearchesLimit = dbProduct?.savedSearchesLimit ?? PRO_TIER_LIMITS.YEARLY.SAVED_SEARCHES;
        subscriptionExpiresAt = dbSubscription.expirationDate;
      } else if (productId?.includes('enterprise') || productId?.includes('agency')) {
        tier = 'agency_owner';
        listingsLimit = dbProduct?.listingsLimit ?? ENTERPRISE_TIER_LIMITS.LISTINGS;
        const agencyMonthlyCoupons = dbProduct?.promotionCoupons ?? ENTERPRISE_TIER_LIMITS.PROMOTION_COUPONS;
        promotionCoupons = { monthly: agencyMonthlyCoupons, available: agencyMonthlyCoupons, used: 0, rollover: 0, lastRefresh: new Date() };
        savedSearchesLimit = dbProduct?.savedSearchesLimit ?? ENTERPRISE_TIER_LIMITS.SAVED_SEARCHES;
        subscriptionExpiresAt = dbSubscription.expirationDate;
      }
    } else {
      // **NO VALID SUBSCRIPTION FOUND** - check if user.subscription thinks they have Pro and downgrade
      if (user.subscription && user.subscription.tier !== 'free' && user.subscription.tier !== 'buyer') {
        subscriptionStatus = 'expired';
      }
    }

    // PRIORITY 2: Sync from proSubscription (legacy system) - only if not already Pro from Subscriptions
    if (tier === 'free' && user.proSubscription?.isActive) {
      tier = 'pro';
      // Legacy proSubscription - default to yearly limits
      listingsLimit = user.proSubscription.totalListingsLimit || PRO_TIER_LIMITS.YEARLY.LISTINGS;
      if (user.proSubscription.promotionCoupons) {
        promotionCoupons = {
          monthly: user.proSubscription.promotionCoupons.monthly || 3,
          available: user.proSubscription.promotionCoupons.available || 3,
          used: user.proSubscription.promotionCoupons.used || 0,
          rollover: 0,
          lastRefresh: new Date(),
        };
      }
      savedSearchesLimit = -1; // Unlimited for Pro
      subscriptionExpiresAt = user.proSubscription.expiresAt;
    }

    // **ALWAYS COUNT** existing active properties from database (single source of truth)
    const existingProperties = await Property.find({
      sellerId: user._id,
      status: { $in: ['active', 'pending', 'draft'] }
    });

    const activeListingsCount = existingProperties.length;
    const privateSellerCount = existingProperties.filter((p: any) => p.createdAsRole === 'private_seller').length;
    const agentCount = existingProperties.filter((p: any) => p.createdAsRole === 'agent').length;


    if (!user.subscription) {
      // Initialize new subscription
      user.subscription = {
        tier,
        status: subscriptionStatus as 'active' | 'trial' | 'grace' | 'canceled' | 'expired' | 'pending_cancellation',
        listingsLimit,
        activeListingsCount,
        privateSellerCount,
        agentCount,
        promotionCoupons,
        savedSearchesLimit,
        totalPaid: 0,
        startDate: user.proSubscription?.startedAt || new Date(),
        expiresAt: subscriptionExpiresAt || user.proSubscription?.expiresAt,
      };
    } else {
      // Sync existing subscription counters from database
      user.subscription.activeListingsCount = activeListingsCount;
      user.subscription.privateSellerCount = privateSellerCount;
      user.subscription.agentCount = agentCount;

      // **CRITICAL: Always sync tier and status from database truth**
      // If DB shows Pro (from active or cancelled-but-valid subscription), update to Pro
      if (tier === 'pro' && user.subscription.tier !== 'pro') {
        user.subscription.tier = 'pro';
        user.subscription.listingsLimit = listingsLimit; // Use plan-specific limit (20 or 250)
        user.subscription.expiresAt = subscriptionExpiresAt;
      } else if (tier === 'agency_owner' && user.subscription.tier !== 'agency_owner') {
        user.subscription.tier = 'agency_owner';
        user.subscription.listingsLimit = ENTERPRISE_TIER_LIMITS.LISTINGS; // Enterprise
        user.subscription.expiresAt = subscriptionExpiresAt;
      }

      // **AUTO-DOWNGRADE: If NO valid subscription in DB, downgrade to free**
      if (subscriptionStatus === 'expired' && user.subscription.tier !== 'free' && user.subscription.tier !== 'buyer') {
        user.subscription.tier = 'free';
        user.subscription.status = 'expired';
        user.subscription.listingsLimit = FREE_TIER_LIMITS.LISTINGS;
        user.subscription.promotionCoupons = { monthly: FREE_TIER_LIMITS.PROMOTION_COUPONS, available: FREE_TIER_LIMITS.PROMOTION_COUPONS, used: 0, rollover: 0, lastRefresh: new Date() };
        user.subscription.savedSearchesLimit = FREE_TIER_LIMITS.SAVED_SEARCHES;
        user.subscription.expiresAt = undefined;
      } else {
        // Sync status from DB
        user.subscription.status = subscriptionStatus as 'active' | 'trial' | 'grace' | 'canceled' | 'expired' | 'pending_cancellation';
        if (subscriptionExpiresAt) {
          user.subscription.expiresAt = subscriptionExpiresAt;
        }
      }

      // Sync listingsLimit for Pro users based on their actual plan
      if (user.subscription.tier === 'pro' && listingsLimit > 0 && user.subscription.listingsLimit !== listingsLimit) {
        user.subscription.listingsLimit = listingsLimit;
      }

    }

    await user.save();

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        provider: user.provider || 'local',
        hasPassword: !!user.password,
        isEmailVerified: user.isEmailVerified,
        availableRoles: user.availableRoles,
        activeRole: user.activeRole,
        primaryRole: user.primaryRole,
        avatarUrl: user.avatarUrl ?? null,
        avatarOptions: user.avatarOptions ?? null,
        gender: user.gender,
        city: user.city,
        country: user.country,
        agencyId: user.agencyId ? String(user.agencyId) : undefined,
        agencyName: user.agencyName,
        agency: user.agency,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        licenseVerified: user.licenseVerified,
        isSubscribed: user.isSubscribed,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        // SECURITY: Only expose sanitized subscription info, not raw internal objects
        subscription: user.subscription ? {
          tier: user.subscription.tier,
          status: user.subscription.status,
          listingsLimit: user.subscription.listingsLimit,
          activeListingsCount: user.subscription.activeListingsCount,
          privateSellerCount: user.subscription.privateSellerCount,
          agentCount: user.subscription.agentCount,
          promotionCoupons: user.subscription.promotionCoupons,
          savedSearchesLimit: user.subscription.savedSearchesLimit,
          expiresAt: user.subscription.expiresAt,
        } : undefined,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching user' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { name, phone, city, country, address, avatarUrl, gender } = req.body;

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update only allowed fields
    // Note: agencyName, agencyId, agentId, and licenseNumber can only be set through:
    // - Signup with invitation code
    // - switchRole (becoming an agent)
    // - joinAgencyByInvitationCode (joining an agency)
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (city) user.city = city;
    if (country) user.country = country;
    if (address !== undefined) user.address = address;
    if (avatarUrl) user.avatarUrl = avatarUrl;

    // When gender changes, adapt saved avatarOptions for the new gender
    if (gender && gender !== user.gender) {
      user.gender = gender;
      if (user.avatarOptions) {
        try {
          const opts = JSON.parse(user.avatarOptions);
          const isFemale = gender === 'female';
          const MALE_HAIRS = ['shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'theCaesar', 'theCaesarAndSidePart', 'sides', 'dreads01', 'frizzle'];
          const FEMALE_HAIRS = ['longButNotTooLong', 'straight01', 'straight02', 'bob', 'bun', 'curly', 'curvy', 'bigHair', 'miaWallace', 'straightAndStrand', 'fro'];
          const validHairs = isFemale ? FEMALE_HAIRS : MALE_HAIRS;
          if (!validHairs.includes(opts.top)) {
            opts.top = isFemale ? 'longButNotTooLong' : 'shortFlat';
          }
          if (isFemale) {
            opts.facialHair = '';
          }
          user.avatarOptions = JSON.stringify(opts);
        } catch {
          // If avatarOptions is invalid, leave it as-is
        }
      }
    } else if (gender) {
      user.gender = gender;
    }

    await user.save();


    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        avatarOptions: user.avatarOptions ?? null,
        gender: user.gender,
        city: user.city,
        country: user.country,
        address: user.address,
        agencyName: user.agencyName,
        agencyId: user.agencyId,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        licenseVerified: user.licenseVerified,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Logged out successfully' });
};

// @desc    Set user's public key for E2E encryption
// @route   POST /api/auth/set-public-key
// @access  Private
export const setPublicKey = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { publicKey } = req.body;

    if (!publicKey) {
      res.status(400).json({ message: 'Public key is required' });
      return;
    }

    // Validate that it's a valid JWK format (basic check)
    try {
      JSON.parse(publicKey);
    } catch (error) {
      res.status(400).json({ message: 'Invalid public key format' });
      return;
    }

    // Update user's public key
    const user = await User.findByIdAndUpdate(
      (req.user as IUser)._id,
      { publicKey },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      message: 'Public key set successfully',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error setting public key' });
  }
};

// @desc    OAuth callback handler
// @route   GET /api/auth/:provider/callback
// @access  Public
export const oauthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;

    if (!user) {
      // Redirect to frontend with error using validated URL
      const redirectUrl = buildFrontendRedirectUrl('/auth/callback', { error: 'authentication_failed' });
      res.redirect(redirectUrl);
      return;
    }

    // Generate tokens using the refresh token service (same as normal login)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    const token = tokens.accessToken;

    // Set refresh token as httpOnly cookie (same as login/signup)
    setRefreshTokenCookie(res, tokens.refreshToken);

    // SECURITY: Only pass access token in URL, NOT refresh token or user data
    // The refresh token is in the httpOnly cookie (not visible to JS or URL logs).
    // User data will be fetched securely via /api/auth/me endpoint.
    const redirectUrl = buildFrontendRedirectUrl('/auth/callback', { token });
    res.redirect(redirectUrl);
  } catch (error: any) {
    const redirectUrl = buildFrontendRedirectUrl('/auth/callback', { error: 'server_error' });
    res.redirect(redirectUrl);
  }
};

// @desc    Switch user role (with license validation for agent)
// @route   POST /api/auth/switch-role
// @access  Private
export const switchRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { role, licenseNumber, licenseCountry, agencyInvitationCode, agentId, languages, phone } = req.body;

    // Validate role
    const validRoles = ['buyer', 'private_seller', 'agent'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const currentUser = req.user as IUser;

    // Prevent admin/super_admin from switching profiles
    const adminRoles = ['admin', 'super_admin'];
    if (adminRoles.includes(currentUser.role)) {
      res.status(403).json({ message: 'Admin users cannot switch profiles' });
      return;
    }

    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Phone number is required for agent and private_seller roles.
    // Accept it from the request body OR check if the user already has one on file.
    if (role === 'agent' || role === 'private_seller') {
      const hasPhone = phone?.trim() || user.phone;
      if (!hasPhone) {
        res.status(400).json({
          message: 'Phone number is required to become an agent or seller',
          code: 'PHONE_REQUIRED',
        });
        return;
      }

      // If a new phone was provided, validate format and persist it
      if (phone?.trim()) {
        const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
        const phoneRegex = /^\+?[0-9]{7,15}$/;
        if (!phoneRegex.test(cleaned)) {
          res.status(400).json({
            message: 'Invalid phone number format. Use 7-15 digits, optionally starting with +',
            code: 'INVALID_PHONE',
          });
          return;
        }
        user.phone = phone.trim();
      }
    }

    // If switching to agent role
    if (role === 'agent') {
      // Check if user was previously an agent (switching back from private_seller)
      const existingAgentRecord = await Agent.findOne({ userId: user._id });

      if (existingAgentRecord && !licenseNumber) {
        // Reactivate existing agent profile
        user.role = 'agent';
        user.agencyName = existingAgentRecord.agencyName;
        user.agentId = existingAgentRecord.agentId;
        user.licenseNumber = existingAgentRecord.licenseNumber;
        user.agencyId = existingAgentRecord.agencyId;
        existingAgentRecord.isActive = true;
        await existingAgentRecord.save();
        await user.save();

        res.json({
          message: 'Switched back to agent role successfully',
          user: {
            id: String(user._id),
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            avatarUrl: user.avatarUrl,
            city: user.city,
            country: user.country,
            agencyName: user.agencyName,
            agencyId: user.agencyId,
            agentId: user.agentId,
            licenseNumber: user.licenseNumber,
            licenseVerified: user.licenseVerified,
            listingsCount: user.listingsCount,
            totalListingsCreated: user.totalListingsCreated,
            isSubscribed: user.isSubscribed,
          },
        });
        return;
      }

      // License is optional — validate format if provided
      let licenseValid = false;
      if (licenseNumber) {
        if (!licenseCountry) {
          res.status(400).json({
            message: 'Country is required when providing a license number',
            code: 'LICENSE_COUNTRY_REQUIRED',
          });
          return;
        }

        const validation = validateLicenseNumber(licenseNumber, licenseCountry);
        if (!validation.valid) {
          res.status(400).json({
            message: 'Invalid license number format for the selected country',
            code: 'INVALID_LICENSE_FORMAT',
            formatHint: validation.formatHint,
          });
          return;
        }
        licenseValid = true;

        // Check if license number is already in use by another agent
        const existingAgent = await Agent.findOne({
          licenseNumber,
          userId: { $ne: user._id },
        });

        if (existingAgent) {
          res.status(400).json({
            message: 'This license number is already registered to another agent',
          });
          return;
        }
      }

      let agency = null;
      let agencyName = 'Independent Agent'; // Default for independent agents

      // If agency invitation code is provided, verify it
      if (agencyInvitationCode) {
        agency = await Agency.findOne({ invitationCode: agencyInvitationCode.toUpperCase() });

        if (!agency) {
          res.status(404).json({
            message: 'Invalid agency invitation code. Please check the code and try again.'
          });
          return;
        }

        agencyName = agency.name; // Use verified agency name
      }

      // Generate agent ID if not provided using secure random
      const generatedAgentId = agentId || generateSecureAgentId();

      // Start a MongoDB session for atomic operations
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update agent-specific fields in User model
        user.licenseNumber = licenseNumber || undefined;
        user.agencyName = agencyName;
        user.agentId = generatedAgentId;
        // License is pending admin review if provided, otherwise unverified
        user.licenseVerified = false;
        user.licenseVerificationDate = undefined;

        // Link to agency if one was provided
        if (agency) {
          user.agencyId = agency._id as unknown as mongoose.Types.ObjectId;
        }

        // Update role
        user.role = role;
        await user.save({ session });

        // Create or update Agent record in separate table
        const existingAgentRecord = await Agent.findOne({ userId: user._id }).session(session);

        // Use provided languages or default to English
        const agentLanguages = languages && languages.length > 0 ? languages : ['English'];

        if (existingAgentRecord) {
          // Update existing agent record
          existingAgentRecord.agencyName = agencyName;
          existingAgentRecord.agencyId = agency ? (agency._id as mongoose.Types.ObjectId) : undefined;
          existingAgentRecord.agentId = generatedAgentId;
          existingAgentRecord.licenseNumber = licenseNumber || undefined;
          existingAgentRecord.licenseCountry = licenseCountry || undefined;
          existingAgentRecord.licenseVerified = false;
          existingAgentRecord.licenseVerificationDate = undefined;
          existingAgentRecord.licenseStatus = licenseValid ? 'pending' : 'none';
          existingAgentRecord.languages = agentLanguages;
          existingAgentRecord.isActive = true;
          await existingAgentRecord.save({ session });
        } else {
          // Create new agent record
          await Agent.create([{
            userId: user._id,
            agencyName: agencyName,
            agencyId: agency ? agency._id : undefined,
            agentId: generatedAgentId,
            licenseNumber: licenseNumber || undefined,
            licenseCountry: licenseCountry || undefined,
            licenseVerified: false,
            licenseStatus: licenseValid ? 'pending' : 'none',
            languages: agentLanguages,
            isActive: true,
          }], { session });
        }

        // Add agent to agency's agents array if agency was provided
        if (agency) {
          const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
          if (!agency.agents.some(agentId => agentId.toString() === userObjectId.toString())) {
            agency.agents.push(userObjectId);
            agency.totalAgents = agency.agents.length;

            // Auto-sync agent languages to agency (merge unique languages)
            const existingLanguages = agency.languages || [];
            const mergedLanguages = [...new Set([...existingLanguages, ...agentLanguages])];
            agency.languages = mergedLanguages;

            // Add to agentDetails for tracking join order
            if (!agency.agentDetails) {
              agency.agentDetails = [];
            }
            agency.agentDetails.push({
              userId: userObjectId,
              joinedAt: new Date(),
              isActive: true,
            } as any);

            await agency.save({ session });
          }
        }

        // Commit the transaction
        await session.commitTransaction();
      } catch (txError) {
        // Abort transaction on error
        await session.abortTransaction();
        throw txError;
      } finally {
        session.endSession();
      }
    } else {
      // For non-agent role switches
      // If switching from agent to private_seller, deactivate agent profile but keep data
      if (user.role === 'agent' && role === 'private_seller') {
        const agentProfile = await Agent.findOne({ userId: user._id });
        if (agentProfile) {
          agentProfile.isActive = false;
          await agentProfile.save();
        }
      }

      // Update the role
      user.role = role;
      await user.save();
    }


    res.json({
      message: 'Role updated successfully',
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agencyId: user.agencyId ? String(user.agencyId) : undefined,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        licenseVerified: user.licenseVerified,
        listingsCount: user.listingsCount,
        totalListingsCreated: user.totalListingsCreated,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error switching role' });
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return same success message to prevent account enumeration
    const successMessage = 'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
      // Don't reveal if user exists or not for security
      res.json({ message: successMessage });
      return;
    }

    // Check if user is a local auth user (has password)
    if (user.provider !== 'local' || !user.password) {
      // Don't reveal account type - return same message
      res.json({ message: successMessage });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiration (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 1800000); // 30 minutes from now

    await user.save();

    // Send password reset email using the new method with noreply@ address
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      const { sendPasswordResetEmail } = await import('../services/emailService');
      await sendPasswordResetEmail({
        email: user.email,
        userName: user.name,
        resetUrl,
      });
    } catch (emailError) {
      // Still return success message to prevent account enumeration
    }

    res.json({
      message: successMessage,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing request' });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // SECURITY: Atomically find AND claim the reset token to prevent race conditions.
    // Without this, two concurrent requests with the same token could both pass
    // the findOne check and reset the password.
    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      },
      {
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
      },
      { new: true }
    );

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired reset token' });
      return;
    }

    // Validate password strength using production-grade validation
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check if password contains user info (email, name)
    const userInfo = [user.email.split('@')[0], user.name];
    if (passwordContainsUserInfo(newPassword, userInfo)) {
      res.status(400).json({
        message: 'Password should not contain your email or name',
      });
      return;
    }

    // Set new password (will be hashed by pre-save hook)
    // Token was already cleared atomically above to prevent race conditions
    user.password = newPassword;

    await user.save();

    // SECURITY: Revoke all existing refresh tokens so old sessions can't
    // access the account after a password reset. This is critical because
    // the reset may have been triggered due to a compromised account.
    try {
      const { revokeAllRefreshTokens } = await import('../services/refreshTokenService');
      await revokeAllRefreshTokens(String(user._id));
    } catch {
      // Continue even if revocation fails — new tokens still work
    }

    // Generate new token pair (access + refresh)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    // Set refresh token as httpOnly cookie
    setRefreshTokenCookie(res, tokens.refreshToken);

    res.json({
      message: 'Password reset successful',
      accessToken: tokens.accessToken,
      // refreshToken is set as httpOnly cookie only - never exposed in response body
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

// @desc    Upload user avatar
// @route   POST /api/auth/upload-avatar
// @access  Private
export const uploadAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    // Check if Cloudinary is configured
    const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                                   process.env.CLOUDINARY_API_KEY &&
                                   process.env.CLOUDINARY_API_SECRET;

    if (!cloudinaryConfigured) {
      res.status(500).json({
        message: 'Image upload service is currently unavailable.',
      });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }


    // Delete old avatar from Cloudinary if exists
    if (user.avatarPublicId) {
      try {
        await deleteImage(user.avatarPublicId);
      } catch (deleteError) {
        // Continue with upload even if deletion fails
      }
    }

    // Upload avatar using centralized cloudinaryService
    // Path: balkan-estate/users/{userId}/avatar/
    const uploadResult = await uploadImage(req.file.buffer, {
      userId,
      type: 'avatar',
      maxWidth: 400,  // Avatars don't need to be large
      maxHeight: 400,
    });

    // Update user with new avatar URL and publicId, clear generated avatar options
    user.avatarUrl = uploadResult.url;
    user.avatarPublicId = uploadResult.publicId;
    user.avatarOptions = undefined;
    await user.save();


    res.json({
      avatarUrl: uploadResult.url,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        avatarOptions: null,
        gender: user.gender,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agencyId: user.agencyId,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        licenseVerified: user.licenseVerified,
        isSubscribed: user.isSubscribed,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error uploading avatar' });
  }
};

// @desc    Save generated avatar options (DiceBear customization)
// @route   POST /api/auth/save-avatar-options
// @access  Private
export const saveAvatarOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    let { avatarOptions } = req.body;
    if (!avatarOptions) {
      res.status(400).json({ message: 'avatarOptions is required' });
      return;
    }

    // Accept both object and string formats for flexibility
    if (typeof avatarOptions === 'object') {
      avatarOptions = JSON.stringify(avatarOptions);
    } else if (typeof avatarOptions === 'string') {
      // Validate that the string is valid JSON
      try {
        JSON.parse(avatarOptions);
      } catch {
        res.status(400).json({ message: 'avatarOptions must be valid JSON' });
        return;
      }
    } else {
      res.status(400).json({ message: 'avatarOptions must be a JSON string or object' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Save avatar options and clear uploaded photo (user chose generated avatar)
    user.avatarOptions = avatarOptions;
    user.avatarUrl = undefined;
    if (user.avatarPublicId) {
      try {
        const { deleteImage } = require('../services/cloudinaryService');
        await deleteImage(user.avatarPublicId);
      } catch {
        // Non-blocking: continue even if cloudinary deletion fails
      }
      user.avatarPublicId = undefined;
    }
    await user.save();

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        avatarUrl: null,
        avatarOptions: user.avatarOptions,
        gender: user.gender,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agencyId: user.agencyId,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        licenseVerified: user.licenseVerified,
        isSubscribed: user.isSubscribed,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error saving avatar options' });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refresh token from httpOnly cookie first, fall back to body
    const token = getRefreshTokenFromRequest(req);

    if (!token) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };

    const { refreshAccessToken } = await import('../services/refreshTokenService');
    const result = await refreshAccessToken(token, deviceInfo);

    if (!result.success) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: result.error || 'Invalid refresh token' });
      return;
    }

    // Set new refresh token as httpOnly cookie
    if (result.refreshToken) {
      setRefreshTokenCookie(res, result.refreshToken);
    }

    res.json({
      accessToken: result.accessToken,
      // refreshToken is set as httpOnly cookie only - never exposed in response body
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error refreshing token' });
  }
};

// @desc    Verify email with token
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ success: false, message: 'Verification token is required' });
      return;
    }

    const { verifyEmailToken, sendWelcomeEmail } = await import('../services/emailVerificationService');
    const result = await verifyEmailToken(token);

    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    // Send welcome email
    if (result.user) {
      try {
        await sendWelcomeEmail(result.user);
      } catch (emailError) {
        // Don't block verification if email fails
      }
    }

    res.json({
      success: true,
      message: result.message,
      user: result.user ? {
        id: String(result.user._id),
        email: result.user.email,
        name: result.user.name,
        isEmailVerified: result.user.isEmailVerified,
      } : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error verifying email' });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const { resendVerificationEmail: resendEmail } = await import('../services/emailVerificationService');
    const result = await resendEmail(email);

    // Always return success to prevent account enumeration
    res.json({ message: result.message });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resending verification email' });
  }
};

// @desc    Logout user (revoke refresh token)
// @route   POST /api/auth/logout
// @access  Private
export const enhancedLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refresh token from httpOnly cookie first, fall back to body
    const token = getRefreshTokenFromRequest(req);

    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    if (token) {
      // Revoke specific refresh token
      const { revokeRefreshToken } = await import('../services/refreshTokenService');
      await revokeRefreshToken(userId, token);
    }

    // Clear the httpOnly refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error logging out' });
  }
};

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAllDevices = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const { revokeAllRefreshTokens } = await import('../services/refreshTokenService');
    await revokeAllRefreshTokens(userId);

    // Clear the httpOnly refresh token cookie
    clearRefreshTokenCookie(res);

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error logging out' });
  }
};

// @desc    Get active sessions
// @route   GET /api/auth/sessions
// @access  Private
export const getActiveSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const { getActiveSessions: getSessions } = await import('../services/refreshTokenService');
    const sessions = await getSessions(userId);

    res.json({ sessions });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
};

// @desc    Get login history
// @route   GET /api/auth/login-history
// @access  Private
export const getLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById((req.user as IUser)._id).select('loginHistory');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Return login history sorted by most recent first
    const history = user.loginHistory || [];
    const sortedHistory = history.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // SECURITY: Mask IP addresses - show only first segments for user identification
    // e.g. "192.168.1.42" -> "192.168.***"
    const maskIP = (ip?: string): string => {
      if (!ip) return 'unknown';
      const parts = ip.replace('::ffff:', '').split('.');
      if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
      // IPv6: show first 2 groups
      const v6parts = ip.split(':');
      if (v6parts.length > 2) return `${v6parts[0]}:${v6parts[1]}:***`;
      return '***';
    };

    const sanitizedHistory = sortedHistory.map((entry: any) => ({
      timestamp: entry.timestamp,
      success: entry.success,
      ipAddress: maskIP(entry.ipAddress),
      deviceInfo: entry.deviceInfo,
      failureReason: entry.failureReason,
    }));

    res.json({
      loginHistory: sanitizedHistory,
      total: sanitizedHistory.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching login history' });
  }
};

// @desc    Change password for logged-in user
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current password and new password are required' });
      return;
    }

    const user = await User.findById((req.user as IUser)._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has a password to change
    if (!user.password) {
      res.status(400).json({
        message: 'You don\'t have a password set. Use the set password option first.'
      });
      return;
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ message: 'Current password is incorrect' });
      return;
    }

    // Check if new password is same as current
    const isSameAsCurrent = await user.comparePassword(newPassword);
    if (isSameAsCurrent) {
      res.status(400).json({
        message: 'New password must be different from current password'
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check if password contains user info (email, name)
    const userInfo = [user.email.split('@')[0], user.name];
    if (passwordContainsUserInfo(newPassword, userInfo)) {
      res.status(400).json({
        message: 'Password should not contain your email or name',
      });
      return;
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Optionally, revoke all refresh tokens to force re-login on all devices
    // This is a security best practice when password changes
    try {
      const { revokeAllRefreshTokens } = await import('../services/refreshTokenService');
      await revokeAllRefreshTokens(String(user._id));
    } catch (error) {
      // Continue even if this fails
    }

    // Send confirmation email
    try {
      const emailService = await import('../services/emailService');
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully - Balkan Estate',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
              .warning { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Changed Successfully</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name},</p>
                <p>Your password for your Balkan Estate account has been changed successfully.</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                <div class="warning">
                  <p><strong>⚠️ Didn't make this change?</strong></p>
                  <p>If you didn't change your password, please contact our support team immediately at support@balkanestateai.com</p>
                </div>
                <p>For your security, you have been logged out of all devices. Please log in again with your new password.</p>
                <div class="footer">
                  <p>This is an automated message from Balkan Estate. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${user.name},\n\nYour password for your Balkan Estate account has been changed successfully on ${new Date().toLocaleString()}.\n\nIf you didn't make this change, please contact our support team immediately.\n\nFor your security, you have been logged out of all devices.`,
      });
    } catch (emailError) {
      // Don't block the response if email fails
    }

    res.json({
      message: 'Password changed successfully. You have been logged out of all devices for security.',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error changing password' });
  }
};

// @desc    Set password for social login users (who don't have a password yet)
// @route   POST /api/auth/set-password
// @access  Private
export const setPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      res.status(400).json({ message: 'New password is required' });
      return;
    }

    const user = await User.findById((req.user as IUser)._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Only allow setting a password if user doesn't have one yet
    if (user.password) {
      res.status(400).json({
        message: 'You already have a password. Use change password instead.',
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check if password contains user info (email, name)
    const userInfo = [user.email.split('@')[0], user.name];
    if (passwordContainsUserInfo(newPassword, userInfo)) {
      res.status(400).json({
        message: 'Password should not contain your email or name',
      });
      return;
    }

    // Set the password (keep original provider — user remains a social account)
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password set successfully. You can now log in with your email and password.',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error setting password' });
  }
};

// @desc    Delete user account permanently
// @route   POST /api/auth/delete-account
// @access  Private
export const deleteAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { password } = req.body;
    const userId = String((req.user as IUser)._id);
    const user = await User.findById(userId).select('+password');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // For users with a password, require password confirmation
    if (user.password) {
      if (!password) {
        res.status(400).json({ message: 'Password is required to delete your account' });
        return;
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: 'Incorrect password' });
        return;
      }
    }

    // If user owns an agency, prevent deletion (must delete agency first)
    if (user.agencyId) {
      const agency = await Agency.findById(user.agencyId);
      if (agency && String(agency.ownerId) === userId) {
        res.status(400).json({
          message: 'You must delete your agency before deleting your account. Please contact an administrator to delete your agency first.',
        });
        return;
      }
    }

    // Clean up related data
    const { revokeAllRefreshTokens } = await import('../services/refreshTokenService');
    const Property = (await import('../models/Property')).default;
    const Subscription = (await import('../models/Subscription')).default;
    const PromotionCoupon = (await import('../models/PromotionCoupon')).default;

    // Revoke all refresh tokens
    await revokeAllRefreshTokens(userId);

    // Cancel active subscriptions
    await Subscription.updateMany(
      { userId: user._id, status: { $in: ['active', 'trial'] } },
      { $set: { status: 'cancelled', cancelledAt: new Date() } }
    );

    // Expire user's promotion coupons
    await PromotionCoupon.updateMany(
      { generatedForUserId: user._id, status: 'active' },
      { $set: { status: 'expired' } }
    );

    // Remove user from any agency they're a member of (not owner - blocked above)
    if (user.agencyId) {
      await Agency.updateOne(
        { _id: user.agencyId },
        { $pull: { agents: user._id, members: user._id } }
      );
    }

    // Delete agent profile if exists
    if (user.agentId) {
      await Agent.findOneAndDelete({ agentId: user.agentId });
    }

    // Unlist user's properties (don't delete - keep data but mark as inactive)
    await Property.updateMany(
      { userId: user._id },
      { $set: { status: 'inactive', isActive: false } }
    );

    // Delete the user
    await User.findByIdAndDelete(userId);

    authLogger.info(`🗑️ Account deleted: ${user.email} (${userId})`);

    res.json({ message: 'Your account has been permanently deleted.' });
  } catch (error: any) {
    authLogger.error('Error deleting account:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
};

// @desc    Set active role (switch context)
// @route   POST /api/auth/set-active-role
// @access  Private
export const setActiveRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { activeRole } = req.body;

    if (!activeRole) {
      res.status(400).json({ message: 'Active role is required' });
      return;
    }

    const user = await User.findById((req.user as IUser)._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has access to this role
    if (!user.availableRoles || !user.availableRoles.includes(activeRole)) {
      res.status(403).json({
        message: 'You do not have access to this role',
        availableRoles: user.availableRoles
      });
      return;
    }

    // Update active role
    user.activeRole = activeRole;
    await user.save();

    res.json({
      message: 'Active role updated successfully',
      activeRole: user.activeRole,
      availableRoles: user.availableRoles,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        availableRoles: user.availableRoles,
        activeRole: user.activeRole,
        primaryRole: user.primaryRole,
        avatarUrl: user.avatarUrl,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error setting active role' });
  }
};

// @desc    Add role to user (e.g., become an agent)
// @route   POST /api/auth/add-role
// @access  Private
export const addRole = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { newRole, licenseNumber, licenseCountry, agencyName } = req.body;

    if (!newRole) {
      res.status(400).json({ message: 'New role is required' });
      return;
    }

    // Whitelist allowed roles to prevent privilege escalation
    const ALLOWED_ROLES = ['buyer', 'agent', 'private_seller'];
    if (!ALLOWED_ROLES.includes(newRole)) {
      res.status(400).json({ message: 'Invalid role specified' });
      return;
    }

    const user = await User.findById((req.user as IUser)._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user already has this role
    if (user.availableRoles && user.availableRoles.includes(newRole)) {
      res.status(400).json({ message: 'You already have this role' });
      return;
    }

    // Validate agent role requirements (license is optional)
    if (newRole === 'agent') {
      if (licenseNumber) {
        if (!licenseCountry) {
          res.status(400).json({
            message: 'Country is required when providing a license number',
            code: 'LICENSE_COUNTRY_REQUIRED',
          });
          return;
        }
        const validation = validateLicenseNumber(licenseNumber, licenseCountry);
        if (!validation.valid) {
          res.status(400).json({
            message: 'Invalid license number format for the selected country',
            code: 'INVALID_LICENSE_FORMAT',
            formatHint: validation.formatHint,
          });
          return;
        }
        user.licenseNumber = licenseNumber;
        user.licenseVerified = false; // Pending admin review
      }
      user.agencyName = agencyName;
    }

    // Add role to availableRoles
    if (!user.availableRoles) {
      user.availableRoles = [user.role || 'buyer'];
    }
    user.availableRoles.push(newRole);

    // Set as active role
    user.activeRole = newRole;

    await user.save();

    res.json({
      message: `Successfully added ${newRole} role`,
      availableRoles: user.availableRoles,
      activeRole: user.activeRole,
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        availableRoles: user.availableRoles,
        activeRole: user.activeRole,
        primaryRole: user.primaryRole,
        avatarUrl: user.avatarUrl,
        city: user.city,
        country: user.country,
        agencyName: user.agencyName,
        agentId: user.agentId,
        licenseNumber: user.licenseNumber,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error adding role' });
  }
};

// @desc    Get email preferences
// @route   GET /api/auth/email-preferences
// @access  Private
export const getEmailPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user._id).select('emailPreferences');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Return default preferences if not set
    const preferences = user.emailPreferences || {
      weeklyStats: true,
      propertyAlerts: true,
      priceDrops: true,
      messages: true,
      marketing: true,
      transactional: true,
    };

    res.json({ emailPreferences: preferences });
  } catch (error: any) {
    res.status(500).json({ message: 'Error getting email preferences' });
  }
};

// @desc    Update email preferences
// @route   PUT /api/auth/email-preferences
// @access  Private
export const updateEmailPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { weeklyStats, propertyAlerts, priceDrops, messages, marketing } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update only the preferences that are provided
    if (!user.emailPreferences) {
      user.emailPreferences = {
        weeklyStats: true,
        propertyAlerts: true,
        priceDrops: true,
        messages: true,
        marketing: true,
        transactional: true,
      };
    }

    if (typeof weeklyStats === 'boolean') user.emailPreferences.weeklyStats = weeklyStats;
    if (typeof propertyAlerts === 'boolean') user.emailPreferences.propertyAlerts = propertyAlerts;
    if (typeof priceDrops === 'boolean') user.emailPreferences.priceDrops = priceDrops;
    if (typeof messages === 'boolean') user.emailPreferences.messages = messages;
    if (typeof marketing === 'boolean') user.emailPreferences.marketing = marketing;
    // transactional is always true and cannot be changed

    await user.save();

    res.json({
      message: 'Email preferences updated successfully',
      emailPreferences: user.emailPreferences,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating email preferences' });
  }
};

// @desc    Unsubscribe from emails via token (no auth required)
// @route   GET /api/auth/unsubscribe
// @access  Public
export const unsubscribeFromEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, type } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ message: 'Invalid unsubscribe token' });
      return;
    }

    const user = await User.findOne({ unsubscribeToken: token });

    if (!user) {
      res.status(404).json({ message: 'Invalid or expired unsubscribe link' });
      return;
    }

    // Initialize email preferences if not set
    if (!user.emailPreferences) {
      user.emailPreferences = {
        weeklyStats: true,
        propertyAlerts: true,
        priceDrops: true,
        messages: true,
        marketing: true,
        transactional: true,
      };
    }

    // Handle different unsubscribe types
    const validTypes = ['weeklyStats', 'propertyAlerts', 'priceDrops', 'messages', 'marketing', 'all'];
    const unsubscribeType = typeof type === 'string' && validTypes.includes(type) ? type : 'all';

    if (unsubscribeType === 'all') {
      // Unsubscribe from all non-transactional emails
      user.emailPreferences.weeklyStats = false;
      user.emailPreferences.propertyAlerts = false;
      user.emailPreferences.priceDrops = false;
      user.emailPreferences.messages = false;
      user.emailPreferences.marketing = false;
    } else if (unsubscribeType !== 'transactional') {
      // Unsubscribe from specific type
      (user.emailPreferences as any)[unsubscribeType] = false;
    }

    await user.save();

    // Return a nice HTML page for browser access
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed - BalkanEstate</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          h1 { color: #22c55e; font-size: 24px; margin: 0 0 16px 0; }
          p { color: #6b7280; line-height: 1.6; margin: 0 0 24px 0; }
          a {
            display: inline-block;
            background: #0252CD;
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
          }
          a:hover { background: #0369a1; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✓ Successfully Unsubscribed</h1>
          <p>You've been unsubscribed from ${unsubscribeType === 'all' ? 'all promotional emails' : unsubscribeType + ' emails'}. You can update your email preferences anytime in your account settings.</p>
          <a href="${frontendUrl}/settings/notifications">Manage Preferences</a>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).json({ message: 'Error processing unsubscribe request' });
  }
};