import crypto from 'crypto';
import User, { IUser } from '../models/User';
import {
  sendEmailVerification,
  sendWelcomeEmail as sendWelcomeEmailService,
} from './emailService';

/**
 * Email Verification Service
 *
 * Security Design:
 * - Cryptographically secure random tokens
 * - Tokens are hashed before storage (prevents token stealing if DB compromised)
 * - Time-limited tokens (24 hours)
 * - Single-use tokens (deleted after verification)
 * - Rate limiting applied at endpoint level
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate and send email verification token
 */
export const sendVerificationEmail = async (user: IUser): Promise<void> => {
  // Generate cryptographically secure random token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing (security best practice)
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set token and expiration
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  );

  await user.save();

  // Send email with unhashed token (user needs this)
  // Using the new sendEmailVerification method which uses noreply@ address
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  await sendEmailVerification({
    email: user.email,
    userName: user.name,
    verificationUrl,
  });
};

/**
 * Verify email with token
 */
export const verifyEmailToken = async (token: string): Promise<{ success: boolean; message: string; user?: IUser }> => {
  // Hash the received token to match against stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Find user with matching token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) {
    return {
      success: false,
      message: 'Invalid or expired verification token',
    };
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  return {
    success: true,
    message: 'Email verified successfully',
    user,
  };
};

/**
 * Resend verification email (with rate limiting at endpoint level)
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Generic message to avoid account enumeration
    return {
      success: true,
      message: 'If an account exists with this email, a verification link has been sent.',
    };
  }

  if (user.isEmailVerified) {
    return {
      success: false,
      message: 'Email is already verified',
    };
  }

  // Check if recent verification email was sent (prevent spam)
  if (user.emailVerificationExpires) {
    const timeSinceLastEmail = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000 -
      (user.emailVerificationExpires.getTime() - Date.now());
    const minutesSinceLastEmail = timeSinceLastEmail / (60 * 1000);

    if (minutesSinceLastEmail < 5) {
      return {
        success: false,
        message: 'Please wait a few minutes before requesting another verification email',
      };
    }
  }

  await sendVerificationEmail(user);

  return {
    success: true,
    message: 'Verification email sent successfully',
  };
};

/**
 * Check if email verification is required for operation
 */
export const requireEmailVerification = (user: IUser): boolean => {
  // OAuth users are auto-verified
  if (user.provider !== 'local') {
    return false;
  }

  // Check if email is verified
  return !user.isEmailVerified;
};

/**
 * Send welcome email after verification (optional)
 * Uses support@ address since this is a welcome/promotional email
 */
export const sendWelcomeEmail = async (user: IUser): Promise<void> => {
  await sendWelcomeEmailService({
    email: user.email,
    userName: user.name,
  });
};
