// Phone Authentication Controller
// Handles phone-based login and registration

import { Request, Response } from 'express';
import User from '../models/User';
import { generateTokenPair } from '../services/refreshTokenService';
import otpService from '../services/otpService';

// @desc    Send OTP to phone number
// @route   POST /api/auth/phone/send-code
// @access  Public
export const sendPhoneCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      res.status(400).json({ message: 'Phone number is required' });
      return;
    }

    // Basic phone validation (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      res.status(400).json({ message: 'Invalid phone number format' });
      return;
    }

    // Create and send OTP
    const result = await otpService.createOTP(phone);

    if (!result.success) {
      res.status(429).json({ message: result.message });
      return;
    }

    // In production, integrate with SMS provider here
    // For now, in development mode, the OTP is logged to console
    // TODO: Add SMS provider integration (Twilio, etc.)

    res.json({
      message: 'Verification code sent successfully',
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Send phone code error:', error);
    res.status(500).json({ message: 'Error sending verification code', error: error.message });
  }
};

// @desc    Verify OTP and login/register user
// @route   POST /api/auth/phone/verify-code
// @access  Public
export const verifyPhoneCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      res.status(400).json({ message: 'Phone number and verification code are required' });
      return;
    }

    // Verify the OTP
    const normalizedPhone = otpService.normalizePhone(phone);
    const result = await otpService.verifyOTP(phone, code);

    if (!result.success) {
      res.status(400).json({ message: result.message });
      return;
    }

    // Check if user exists with this phone number
    const existingUser = await User.findOne({ phone: normalizedPhone });

    if (existingUser) {
      // User exists - log them in
      const deviceInfo = {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.socket.remoteAddress,
      };
      const tokens = await generateTokenPair(existingUser, deviceInfo);

      // Log successful login
      if (!existingUser.loginHistory) existingUser.loginHistory = [];
      existingUser.loginHistory.push({
        timestamp: new Date(),
        success: true,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        deviceInfo: 'Phone login',
      });

      // Keep only last 100 entries
      if (existingUser.loginHistory.length > 100) {
        existingUser.loginHistory = existingUser.loginHistory.slice(-100);
      }

      await existingUser.save();

      res.json({
        isNew: false,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: String(existingUser._id),
          email: existingUser.email,
          name: existingUser.name,
          phone: existingUser.phone,
          role: existingUser.role,
          avatarUrl: existingUser.avatarUrl,
          city: existingUser.city,
          country: existingUser.country,
          agencyName: existingUser.agencyName,
          agentId: existingUser.agentId,
          licenseNumber: existingUser.licenseNumber,
          isSubscribed: existingUser.isSubscribed,
          availableRoles: existingUser.availableRoles,
          activeRole: existingUser.activeRole,
        },
      });
    } else {
      // New user - need to complete signup
      res.json({
        isNew: true,
        phone: normalizedPhone,
        message: 'Phone verified. Please complete your profile.',
      });
    }
  } catch (error: any) {
    console.error('Verify phone code error:', error);
    res.status(500).json({ message: 'Error verifying code', error: error.message });
  }
};

// @desc    Complete phone signup for new users
// @route   POST /api/auth/phone/complete-signup
// @access  Public
export const completePhoneSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, name, email } = req.body;

    if (!phone || !name || !email) {
      res.status(400).json({ message: 'Phone, name, and email are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const normalizedPhone = otpService.normalizePhone(phone);

    // Verify that this phone was recently verified
    const isVerified = await otpService.isPhoneVerified(phone);
    if (!isVerified) {
      res.status(400).json({
        message: 'Phone number not verified or verification expired. Please request a new code.'
      });
      return;
    }

    // Check if email already exists
    const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
    if (existingEmailUser) {
      res.status(400).json({ message: 'An account with this email already exists' });
      return;
    }

    // Check if phone already exists (double check)
    const existingPhoneUser = await User.findOne({ phone: normalizedPhone });
    if (existingPhoneUser) {
      res.status(400).json({ message: 'An account with this phone number already exists' });
      return;
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase(),
      name,
      phone: normalizedPhone,
      provider: 'local',
      role: 'buyer',
      isEmailVerified: false, // Email still needs verification
      stats: {
        totalViews: 0,
        totalSaves: 0,
        totalInquiries: 0,
        propertiesSold: 0,
        totalSalesValue: 0,
        lastUpdated: new Date(),
      },
    });

    // Generate tokens
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
    const tokens = await generateTokenPair(user, deviceInfo);

    // Send email verification (non-blocking)
    try {
      const { sendVerificationEmail } = await import('../services/emailVerificationService');
      await sendVerificationEmail(user);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

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
        isSubscribed: user.isSubscribed,
        isEmailVerified: user.isEmailVerified,
        availableRoles: user.availableRoles,
        activeRole: user.activeRole,
      },
    });
  } catch (error: any) {
    console.error('Complete phone signup error:', error);

    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        res.status(400).json({ message: 'An account with this email already exists' });
        return;
      }
    }

    res.status(500).json({ message: 'Error completing signup', error: error.message });
  }
};
