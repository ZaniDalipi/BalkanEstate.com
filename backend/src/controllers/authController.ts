import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Agent from '../models/Agent';
import Agency from '../models/Agency';
import { generateToken } from '../utils/jwt';
import { IUser } from '../models/User';
import crypto from 'crypto';
import cloudinary from '../config/cloudinary';
import { Readable } from 'stream';
import { validatePassword, passwordContainsUserInfo } from '../utils/passwordValidator';
import { sendVerificationEmail } from '../services/emailVerificationService';
import { startAgentTrial } from '../services/trialManagementService';
import { generateTokenPair } from '../services/refreshTokenService';
import { loginRateLimiterAccount, resetLoginRateLimit } from '../middleware/rateLimiter';

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, phone, role, licenseNumber, agencyInvitationCode, languages } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      res.status(400).json({ message: 'Email, password, and name are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
      });
      return;
    }

    // Check if password contains user info (email, name)
    const userInfo = [email.split('@')[0], name];
    if (passwordContainsUserInfo(password, userInfo)) {
      res.status(400).json({
        message: 'Password should not contain your email or name',
      });
      return;
    }

    // Check if user already exists (case-insensitive)
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    let agencyName = undefined;
    let agencyId = undefined;
    let generatedAgentId = undefined;

    // If signing up as agent, validate and set up agent data
    if (role === 'agent' && licenseNumber) {
      // Validate license number format (adjust regex as needed)
      const licenseRegex = /^[A-Z0-9-]+$/i;
      if (!licenseRegex.test(licenseNumber)) {
        res.status(400).json({ message: 'Invalid license number format' });
        return;
      }

      let agency = null;
      agencyName = 'Independent Agent'; // Default for independent agents

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
        agencyId = agency._id as unknown as mongoose.Types.ObjectId;
      }

      // Generate agent ID
      generatedAgentId = `AG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    // Determine listing limit based on role
    let activeListingsLimit = 3; // Default for buyers and private sellers
    if (role === 'agent') {
      activeListingsLimit = 10; // Trial agents get 10 listings
    }

    // Create user with initialized stats
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      name,
      phone,
      role: role || 'buyer',
      licenseNumber: generatedAgentId ? licenseNumber : undefined,
      agencyName: agencyName,
      agencyId: agencyId,
      agentId: generatedAgentId,
      isEmailVerified: false, // Require email verification
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

    // If agent, create Agent record, add to agency, and start trial
    if (role === 'agent' && licenseNumber) {
      // Use provided languages or default to English
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
      if (agencyId) {
        const agency = await Agency.findById(agencyId);
        if (agency) {
          const userObjectId = user._id as unknown as mongoose.Types.ObjectId;
          if (!agency.agents.some(agentId => agentId.toString() === userObjectId.toString())) {
            agency.agents.push(userObjectId);
            agency.totalAgents = agency.agents.length;

            // Auto-sync agent languages to agency (merge unique languages)
            const existingLanguages = agency.languages || [];
            const mergedLanguages = [...new Set([...existingLanguages, ...agentLanguages])];
            agency.languages = mergedLanguages;

            await agency.save();
          }
        }
      }

      // Start 7-day trial period for agent
      await startAgentTrial(user);
    }

    // Send email verification
    try {
      await sendVerificationEmail(user);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't block signup if email fails
    }

    // Generate token pair (access + refresh)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    res.status(201).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
        isEmailVerified: user.isEmailVerified,
        trialActive: role === 'agent' ? user.isTrialActive() : false,
        trialEndDate: role === 'agent' ? user.trialEndDate : undefined,
        activeListingsLimit: user.getActiveListingsLimit(),
      },
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
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

    // Check if account is locked
    if (user.isAccountLocked()) {
      const lockTime = user.lockUntil!.getTime() - Date.now();
      const minutesRemaining = Math.ceil(lockTime / (60 * 1000));

      res.status(423).json({
        message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes.`,
        lockedUntil: user.lockUntil,
      });
      return;
    }

    // Check if user has a password (local auth)
    if (!user.password) {
      res.status(401).json({
        message: 'This account uses social login. Please login with your social provider.'
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

      // Increment failed login attempts
      await user.incrementLoginAttempts();

      res.status(401).json({ message: invalidCredentialsMsg });
      return;
    }

    // Password is correct - reset login attempts
    await user.resetLoginAttempts();

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

    // Reset account-level rate limit on successful login
    resetLoginRateLimit(user.email, clientIp);

    // Generate token pair (access + refresh)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: clientIp,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
        isEmailVerified: user.isEmailVerified,
        trialActive: user.role === 'agent' ? user.isTrialActive() : false,
        trialEndDate: user.role === 'agent' ? user.trialEndDate : undefined,
        trialExpiring: user.role === 'agent' ? user.isTrialExpiring() : false,
        activeListingsLimit: user.getActiveListingsLimit(),
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
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

    // **AUTO-MIGRATION & SYNC**: Initialize or sync subscription object
    const Property = (await import('../models/Property')).default;
    const Subscription = (await import('../models/Subscription')).default;

    // Check if user has an active Pro subscription (legacy or new system)
    let tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer' = 'free';
    let listingsLimit = 3;
    let promotionCoupons = { monthly: 0, available: 0, used: 0, rollover: 0, lastRefresh: new Date() };
    let savedSearchesLimit = 1;
    let subscriptionExpiresAt: Date | undefined;

    // PRIORITY 1: Check Subscriptions collection for active subscription (coupon-based, Stripe, etc.)
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: { $in: ['active', 'trial'] },
      expirationDate: { $gt: new Date() },
    });

    if (activeSubscription) {
      const productId = activeSubscription.productId;
      // Check if it's a Pro subscription
      if (productId?.includes('pro') || productId === 'pro_monthly' || productId === 'pro_yearly') {
        tier = 'pro';
        listingsLimit = 25;
        promotionCoupons = { monthly: 3, available: 3, used: 0, rollover: 0, lastRefresh: new Date() };
        savedSearchesLimit = 10;
        subscriptionExpiresAt = activeSubscription.expirationDate;
        console.log(`🎫 [getMe] Found active subscription in Subscriptions collection for ${user.email}: ${productId}, expires: ${subscriptionExpiresAt}`);
      }
    }

    // PRIORITY 2: Sync from proSubscription (legacy system) - only if not already Pro from Subscriptions
    if (tier === 'free' && user.proSubscription?.isActive) {
      tier = 'pro';
      listingsLimit = user.proSubscription.totalListingsLimit || 25;
      if (user.proSubscription.promotionCoupons) {
        promotionCoupons = {
          monthly: user.proSubscription.promotionCoupons.monthly || 3,
          available: user.proSubscription.promotionCoupons.available || 3,
          used: user.proSubscription.promotionCoupons.used || 0,
          rollover: 0,
          lastRefresh: new Date(),
        };
      }
      savedSearchesLimit = 10;
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

    console.log(`📊 [getMe] Syncing counters for ${user.email}: ${activeListingsCount} total (${privateSellerCount} private, ${agentCount} agent)`);

    if (!user.subscription) {
      // Initialize new subscription
      console.log(`🔄 [getMe] Initializing subscription for ${user.email}: ${listingsLimit} listings, tier: ${tier}`);
      user.subscription = {
        tier,
        status: 'active',
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
      console.log(`✅ [getMe] Subscription initialized for ${user.email}: ${tier} tier with ${listingsLimit} listings (${activeListingsCount}/${listingsLimit} used)`);
    } else {
      // Sync existing subscription counters from database
      user.subscription.activeListingsCount = activeListingsCount;
      user.subscription.privateSellerCount = privateSellerCount;
      user.subscription.agentCount = agentCount;

      // CRITICAL: If user should be Pro (from Subscriptions collection) but is showing as Free, fix it
      if (tier === 'pro' && user.subscription.tier !== 'pro') {
        console.log(`🔧 [getMe] Upgrading ${user.email} from ${user.subscription.tier} to pro tier`);
        user.subscription.tier = 'pro';
        user.subscription.listingsLimit = 25;
        user.subscription.expiresAt = subscriptionExpiresAt;
      }

      // Ensure listingsLimit is correct for Pro users
      if (user.subscription.tier === 'pro' && user.subscription.listingsLimit !== 25) {
        console.log(`🔧 [getMe] Fixed listingsLimit for ${user.email}: ${user.subscription.listingsLimit} -> 25`);
        user.subscription.listingsLimit = 25;
      }

      console.log(`✅ [getMe] Subscription synced for ${user.email}: ${user.subscription.tier} tier, ${activeListingsCount}/${user.subscription.listingsLimit} listings used`);
    }

    await user.save();

    res.json({
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
        subscriptionPlan: user.subscriptionPlan,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        proSubscription: user.proSubscription,
        freeSubscription: user.freeSubscription,
        subscription: user.subscription, // NEW: Return subscription object
      },
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
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

    const { name, phone, city, country, avatarUrl } = req.body;

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
    if (avatarUrl) user.avatarUrl = avatarUrl;

    await user.save();

    console.log('Profile updated for user:', user._id);
    console.log('Updated fields:', { name, phone, city, country });

    res.json({
      user: {
        id: user._id,
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
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
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
      publicKey: user.publicKey,
    });
  } catch (error: any) {
    console.error('Set public key error:', error);
    res.status(500).json({ message: 'Error setting public key', error: error.message });
  }
};

// @desc    OAuth callback handler
// @route   GET /api/auth/:provider/callback
// @access  Public
export const oauthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as IUser;

    if (!user) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
      return;
    }

    // Generate token
    const token = generateToken(String(user._id));

    // Redirect to frontend with token and user data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const userData = encodeURIComponent(JSON.stringify({
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
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
    }));

    res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${userData}`);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?error=server_error`);
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

    const { role, licenseNumber, agencyInvitationCode, agentId, languages } = req.body;

    // Validate role
    const validRoles = ['buyer', 'private_seller', 'agent'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const currentUser = req.user as IUser;
    const user = await User.findById(String(currentUser._id));

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
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

      // New agent or updating license
      if (!licenseNumber) {
        res.status(400).json({
          message: 'License number is required to become an agent'
        });
        return;
      }
      // Validate license format (basic validation - you can enhance this)
      if (licenseNumber.length < 5) {
        res.status(400).json({
          message: 'License number must be at least 5 characters'
        });
        return;
      }

      // Check if license number is already in use by another agent
      const existingAgent = await Agent.findOne({
        licenseNumber,
        userId: { $ne: user._id },
      });

      if (existingAgent) {
        res.status(400).json({
          message: 'This license number is already registered to another agent'
        });
        return;
      }

      let agency = null;
      let agencyName = 'Independent Agent'; // Default for independent agents

      // If agency invitation code is provided, verify it
      if (agencyInvitationCode) {
        console.log(`🔍 Looking for agency with invitation code: ${agencyInvitationCode.toUpperCase()}`);
        agency = await Agency.findOne({ invitationCode: agencyInvitationCode.toUpperCase() });

        if (!agency) {
          console.log(`❌ Agency not found with code: ${agencyInvitationCode.toUpperCase()}`);
          res.status(404).json({
            message: 'Invalid agency invitation code. Please check the code and try again.'
          });
          return;
        }

        console.log(`✅ Found agency: ${agency.name} (ID: ${agency._id})`);
        agencyName = agency.name; // Use verified agency name
      }

      // Generate agent ID if not provided (improved format with random component)
      const generatedAgentId = agentId || `AG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Start a MongoDB session for atomic operations
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Update agent-specific fields in User model
        user.licenseNumber = licenseNumber;
        user.agencyName = agencyName;
        user.agentId = generatedAgentId;
        user.licenseVerified = true;
        user.licenseVerificationDate = new Date();

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
          existingAgentRecord.licenseNumber = licenseNumber;
          existingAgentRecord.licenseVerified = true;
          existingAgentRecord.licenseVerificationDate = new Date();
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
            licenseNumber,
            licenseVerified: true,
            licenseVerificationDate: new Date(),
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

    console.log(`✅ Role switch successful for user ${user._id}: ${user.role} ${user.agencyId ? `(Agency: ${user.agencyName})` : ''}`);

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
    console.error('Switch role error:', error);
    res.status(500).json({ message: 'Error switching role', error: error.message });
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
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await user.save();

    // Send password reset email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      const emailService = await import('../services/emailService');
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Balkan Estate',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi ${user.name},</p>
                <p>You requested to reset your password for your Balkan Estate account.</p>
                <p>Click the button below to reset your password:</p>
                <p style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p><strong>This link will expire in 1 hour.</strong></p>
                <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
                <div class="footer">
                  <p>This is an automated message from Balkan Estate. Please do not reply to this email.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Hi ${user.name},\n\nYou requested to reset your password for your Balkan Estate account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this password reset, please ignore this email.`,
      });
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success message to prevent account enumeration
    }

    res.json({
      message: successMessage,
      // ONLY FOR DEVELOPMENT - Remove in production
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    res.status(500).json({ message: 'Error processing request', error: error.message });
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

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

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
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    // Generate new token pair (access + refresh)
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    res.json({
      message: 'Password reset successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
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
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
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

    console.log('=== Cloudinary Configuration Check ===');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? `Set (${process.env.CLOUDINARY_CLOUD_NAME})` : 'NOT SET');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Set (hidden)' : 'NOT SET');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Set (hidden)' : 'NOT SET');

    if (!cloudinaryConfigured) {
      console.error('❌ Cloudinary is not fully configured');
      res.status(500).json({
        message: 'Image upload service not configured. Please add your Cloudinary credentials to the .env file.',
        missingFields: {
          cloudName: !process.env.CLOUDINARY_CLOUD_NAME,
          apiKey: !process.env.CLOUDINARY_API_KEY,
          apiSecret: !process.env.CLOUDINARY_API_SECRET
        }
      });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('✓ Starting avatar upload for user:', userId);
    console.log('File size:', req.file.size, 'bytes');
    console.log('File type:', req.file.mimetype);

    // Delete old avatar from Cloudinary if exists
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (deleteError) {
        console.log('Could not delete old avatar:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload to Cloudinary with better organization
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        // Organized folder structure: balkan-estate/avatars/users/{userId}
        folder: `balkan-estate/avatars/users/${userId}`,
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          { quality: 'auto:good', fetch_format: 'auto' } // Cost-optimized
        ],
        // Add context for better organization
        context: {
          type: 'user_avatar',
          user_id: userId,
        },
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          if (!res.headersSent) {
            res.status(500).json({ message: 'Error uploading avatar', error: error.message });
          }
          return;
        }

        if (result) {
          try {
            // Update user with new avatar URL and publicId
            user.avatarUrl = result.secure_url;
            user.avatarPublicId = result.public_id;
            await user.save();

            console.log('Avatar uploaded successfully:', result.secure_url);

            if (!res.headersSent) {
              res.json({
                avatarUrl: result.secure_url,
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
                  isSubscribed: user.isSubscribed,
                }
              });
            }
          } catch (saveError: any) {
            console.error('Error saving user:', saveError);
            if (!res.headersSent) {
              res.status(500).json({ message: 'Error saving avatar URL', error: saveError.message });
            }
          }
        }
      }
    );

    const bufferStream = Readable.from(req.file.buffer);
    bufferStream.pipe(uploadStream);
  } catch (error: any) {
    console.error('Upload avatar error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error uploading avatar', error: error.message });
    }
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

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
      res.status(401).json({ message: result.error || 'Invalid refresh token' });
      return;
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error: any) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Error refreshing token', error: error.message });
  }
};

// @desc    Verify email with token
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Verification token is required' });
      return;
    }

    const { verifyEmailToken, sendWelcomeEmail } = await import('../services/emailVerificationService');
    const result = await verifyEmailToken(token);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    // Send welcome email
    if (result.user) {
      try {
        await sendWelcomeEmail(result.user);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't block verification if email fails
      }
    }

    res.json({
      message: result.message,
      user: result.user ? {
        id: String(result.user._id),
        email: result.user.email,
        name: result.user.name,
        isEmailVerified: result.user.isEmailVerified,
      } : undefined,
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email', error: error.message });
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
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error resending verification email', error: error.message });
  }
};

// @desc    Logout user (revoke refresh token)
// @route   POST /api/auth/logout
// @access  Private
export const enhancedLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

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

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
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

    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error: any) {
    console.error('Logout all devices error:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
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
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Error fetching sessions', error: error.message });
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

    res.json({
      loginHistory: sortedHistory,
      total: sortedHistory.length,
    });
  } catch (error: any) {
    console.error('Get login history error:', error);
    res.status(500).json({ message: 'Error fetching login history', error: error.message });
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

    // Check if user has a password (local auth only)
    if (!user.password || user.provider !== 'local') {
      res.status(400).json({
        message: 'This account uses social login. Password change is not available.'
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
      console.error('Failed to revoke refresh tokens:', error);
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
                  <p>If you didn't change your password, please contact our support team immediately at support@balkanestate.com</p>
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
      console.error('Failed to send password change confirmation email:', emailError);
      // Don't block the response if email fails
    }

    res.json({
      message: 'Password changed successfully. You have been logged out of all devices for security.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
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
        proSubscription: user.proSubscription,
        freeSubscription: user.freeSubscription,
      },
    });
  } catch (error: any) {
    console.error('Set active role error:', error);
    res.status(500).json({ message: 'Error setting active role', error: error.message });
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

    const { newRole, licenseNumber, agencyName } = req.body;

    if (!newRole) {
      res.status(400).json({ message: 'New role is required' });
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

    // Validate agent role requirements
    if (newRole === 'agent') {
      if (!licenseNumber) {
        res.status(400).json({ message: 'License number is required for agent role' });
        return;
      }

      // Set agent fields
      user.licenseNumber = licenseNumber;
      user.agencyName = agencyName;

      // Agents require Pro subscription - no free trial
      // agentSubscription will remain undefined until they subscribe
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
        proSubscription: user.proSubscription,
        freeSubscription: user.freeSubscription,
      },
    });
  } catch (error: any) {
    console.error('Add role error:', error);
    res.status(500).json({ message: 'Error adding role', error: error.message });
  }
};