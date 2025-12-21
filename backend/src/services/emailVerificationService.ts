import crypto from 'crypto';
import User, { IUser } from '../models/User';
import { sendEmail } from './emailService';

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
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
        .warning {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 10px;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏠 Balkan Estate</h1>
      </div>
      <div class="content">
        <h2>Welcome, ${user.name}!</h2>
        <p>Thank you for signing up with Balkan Estate. To complete your registration and start using your account, please verify your email address.</p>

        <div style="text-align: center;">
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
          ${verificationUrl}
        </p>

        <div class="warning">
          <strong>⚠️ Important:</strong> This link will expire in ${TOKEN_EXPIRY_HOURS} hours. If you didn't create an account with Balkan Estate, please ignore this email.
        </div>

        <p>Need help? Contact us at support@balkanestate.com</p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Balkan Estate. All rights reserved.</p>
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address - Balkan Estate',
    html: emailHtml,
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
 */
export const sendWelcomeEmail = async (user: IUser): Promise<void> => {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          color: white;
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 10px 10px;
        }
        .feature {
          background: white;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          border-left: 4px solid #667eea;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Welcome to Balkan Estate!</h1>
      </div>
      <div class="content">
        <h2>Hello ${user.name},</h2>
        <p>Your email has been verified successfully! You now have full access to all Balkan Estate features.</p>

        <h3>What you can do now:</h3>

        <div class="feature">
          <strong>🔍 Search Properties</strong><br>
          Browse thousands of properties across the Balkans
        </div>

        <div class="feature">
          <strong>💾 Save Favorites</strong><br>
          Create collections of properties you love
        </div>

        <div class="feature">
          <strong>💬 Contact Agents</strong><br>
          Connect directly with property agents
        </div>

        ${user.role === 'agent' && user.isTrialActive() ? `
        <div class="feature" style="border-left-color: #28a745;">
          <strong>🎁 7-Day Agent Trial Active</strong><br>
          You have full access to all agent features for 7 days. List up to 10 properties and showcase your expertise!
        </div>
        ` : ''}

        ${user.role === 'private_seller' ? `
        <div class="feature">
          <strong>📝 List Your Property</strong><br>
          You can list up to ${user.getActiveListingsLimit()} properties for free
        </div>
        ` : ''}

        <div style="text-align: center;">
          <a href="${FRONTEND_URL}" class="button">Start Exploring</a>
        </div>

        <p>If you have any questions, feel free to contact our support team.</p>

        <p>Happy house hunting!<br>The Balkan Estate Team</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Balkan Estate! 🎉',
    html: emailHtml,
  });
};
