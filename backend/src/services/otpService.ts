// OTP Service for Phone Authentication
// Handles OTP generation, storage, and verification

import PhoneVerification from '../models/PhoneVerification';
import crypto from 'crypto';

// Configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_MINUTES = 1; // Minimum time between OTP requests

// Development mode - set to true to use fixed OTP and log to console
const isDevelopment = process.env.NODE_ENV !== 'production';
const DEV_OTP = '123456'; // Fixed OTP for development/testing

export interface OTPResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface VerifyResult {
  success: boolean;
  message: string;
  verified?: boolean;
}

/**
 * Generate a random 6-digit OTP
 */
export const generateOTP = (): string => {
  if (isDevelopment) {
    return DEV_OTP;
  }

  // Generate cryptographically secure random number
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  const randomBytes = crypto.randomBytes(4);
  const randomNumber = randomBytes.readUInt32BE(0);
  const otp = min + (randomNumber % (max - min + 1));

  return otp.toString();
};

/**
 * Normalize phone number to a consistent format
 * Removes spaces, dashes, and ensures it starts with +
 */
export const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // Ensure it starts with +
  if (!normalized.startsWith('+')) {
    // Assume international format if not specified
    // You may want to add country code detection logic here
    normalized = '+' + normalized;
  }

  return normalized;
};

/**
 * Check if a new OTP can be sent (rate limiting)
 */
export const canSendOTP = async (phone: string): Promise<{ canSend: boolean; waitSeconds?: number }> => {
  const normalizedPhone = normalizePhone(phone);

  const recentVerification = await PhoneVerification.findOne({
    phone: normalizedPhone,
    verified: false,
    createdAt: { $gt: new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000) }
  }).sort({ createdAt: -1 });

  if (recentVerification) {
    const waitTime = Math.ceil(
      (RATE_LIMIT_MINUTES * 60 * 1000 - (Date.now() - recentVerification.createdAt.getTime())) / 1000
    );
    return { canSend: false, waitSeconds: waitTime };
  }

  return { canSend: true };
};

/**
 * Create and store a new OTP for a phone number
 */
export const createOTP = async (phone: string): Promise<OTPResult> => {
  const normalizedPhone = normalizePhone(phone);

  // Check rate limiting
  const { canSend, waitSeconds } = await canSendOTP(normalizedPhone);
  if (!canSend) {
    return {
      success: false,
      message: `Please wait ${waitSeconds} seconds before requesting a new code`,
    };
  }

  // Delete any existing unverified OTPs for this phone
  await PhoneVerification.deleteMany({
    phone: normalizedPhone,
    verified: false
  });

  // Generate new OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store the OTP (it will be hashed by the pre-save hook)
  const verification = new PhoneVerification({
    phone: normalizedPhone,
    code: otp,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  await verification.save();

  // In development, log the OTP for testing
  if (isDevelopment) {
    console.log(`[DEV] OTP for ${normalizedPhone}: ${otp}`);
  }

  return {
    success: true,
    message: 'Verification code sent successfully',
    expiresAt,
  };
};

/**
 * Verify an OTP for a phone number
 */
export const verifyOTP = async (phone: string, code: string): Promise<VerifyResult> => {
  const normalizedPhone = normalizePhone(phone);

  // Find the most recent unverified OTP for this phone
  const verification = await PhoneVerification.findOne({
    phone: normalizedPhone,
    verified: false,
  }).sort({ createdAt: -1 });

  if (!verification) {
    return {
      success: false,
      message: 'No verification code found. Please request a new code.',
    };
  }

  // Check if expired
  if (verification.isExpired()) {
    await PhoneVerification.deleteOne({ _id: verification._id });
    return {
      success: false,
      message: 'Verification code has expired. Please request a new code.',
    };
  }

  // Check if max attempts reached
  if (verification.isMaxAttemptsReached()) {
    await PhoneVerification.deleteOne({ _id: verification._id });
    return {
      success: false,
      message: 'Too many failed attempts. Please request a new code.',
    };
  }

  // Verify the code
  const isValid = await verification.verifyCode(code);

  if (!isValid) {
    await verification.incrementAttempts();
    const remainingAttempts = MAX_ATTEMPTS - verification.attempts;
    return {
      success: false,
      message: `Invalid code. ${remainingAttempts} attempts remaining.`,
    };
  }

  // Mark as verified
  verification.verified = true;
  await verification.save();

  return {
    success: true,
    message: 'Phone number verified successfully',
    verified: true,
  };
};

/**
 * Check if a phone number has been recently verified
 * Used for completing signup after phone verification
 */
export const isPhoneVerified = async (phone: string): Promise<boolean> => {
  const normalizedPhone = normalizePhone(phone);

  // Check for a verified record within the last 30 minutes
  const verification = await PhoneVerification.findOne({
    phone: normalizedPhone,
    verified: true,
    createdAt: { $gt: new Date(Date.now() - 30 * 60 * 1000) }
  });

  return !!verification;
};

/**
 * Clean up old verification records (for maintenance)
 */
export const cleanupExpiredOTPs = async (): Promise<number> => {
  const result = await PhoneVerification.deleteMany({
    expiresAt: { $lt: new Date() }
  });

  return result.deletedCount || 0;
};

export default {
  generateOTP,
  normalizePhone,
  canSendOTP,
  createOTP,
  verifyOTP,
  isPhoneVerified,
  cleanupExpiredOTPs,
};
