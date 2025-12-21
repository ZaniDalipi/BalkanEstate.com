import User, { IUser } from '../models/User';
import { sendEmail } from './emailService';

/**
 * Trial Management Service
 *
 * Requirements:
 * - 7-day free trial for new agents
 * - Trial starts when agent role is activated
 * - Reminder email 3 days before expiration
 * - Automatic downgrade to private_seller after expiration
 * - Downgraded users keep 3 active listings (free tier)
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const TRIAL_DURATION_DAYS = 7;
const REMINDER_DAYS_BEFORE = 3;

/**
 * Start trial period for new agent
 */
export const startAgentTrial = async (user: IUser): Promise<void> => {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  // Initialize dual-role system fields
  if (!user.availableRoles || user.availableRoles.length === 0) {
    user.availableRoles = [user.role || 'agent'];
  }
  if (!user.activeRole) {
    user.activeRole = user.role || 'agent';
  }
  if (!user.primaryRole) {
    user.primaryRole = user.role || 'agent';
  }

  // Initialize unified Pro subscription with trial period
  // Trial agents get 10 listings (vs 15 for paid Pro)
  user.proSubscription = {
    isActive: true,
    plan: 'pro_monthly', // Use monthly plan designation for trial
    expiresAt: trialEnd,
    startedAt: now,
    totalListingsLimit: 10, // Trial: 10 listings (paid Pro gets 15)
    activeListingsCount: 0,
    privateSellerCount: 0,
    agentCount: 0,
    promotionCoupons: {
      monthly: 3,
      available: 3,
      used: 0,
      highlightCoupons: 2, // Trial agents get 2 highlight coupons
      usedHighlightCoupons: 0,
    },
  };

  // Keep legacy fields for backwards compatibility and trial management
  user.trialStartDate = now;
  user.trialEndDate = trialEnd;
  user.trialReminderSent = false;
  user.trialExpired = false;
  user.subscriptionStatus = 'trial';
  user.activeListingsLimit = 10; // Trial agents get 10 active listings

  await user.save();

  // Send trial start email
  await sendTrialStartEmail(user);
};

/**
 * Send trial start email
 */
const sendTrialStartEmail = async (user: IUser): Promise<void> => {
  const trialEndDate = user.trialEndDate!.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
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
          border-left: 4px solid #28a745;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .info-box {
          background: #d1ecf1;
          border-left: 4px solid #0c5460;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Your 7-Day Agent Trial Starts Now!</h1>
      </div>
      <div class="content">
        <h2>Welcome, Agent ${user.name}!</h2>
        <p>Congratulations! Your 7-day free trial as an agent on Balkan Estate has begun. Experience all the powerful features designed for professional real estate agents.</p>

        <h3>What's Included in Your Trial:</h3>

        <div class="feature">
          <strong>📝 List Up to 10 Properties</strong><br>
          Showcase your best properties to thousands of potential buyers
        </div>

        <div class="feature">
          <strong>📊 Advanced Analytics</strong><br>
          Track views, saves, and inquiries on your listings
        </div>

        <div class="feature">
          <strong>⭐ Professional Profile</strong><br>
          Build your reputation with reviews and testimonials
        </div>

        <div class="feature">
          <strong>💬 Direct Client Communication</strong><br>
          Connect with potential buyers through our secure messaging
        </div>

        <div class="feature">
          <strong>🏆 Featured Listings</strong><br>
          Get your properties highlighted in search results
        </div>

        <div class="info-box">
          <strong>📅 Trial Period:</strong> ${TRIAL_DURATION_DAYS} days<br>
          <strong>🗓️ Ends On:</strong> ${trialEndDate}<br>
          <strong>📧 Reminder:</strong> We'll notify you 3 days before your trial ends
        </div>

        <h3>After Your Trial:</h3>
        <p>To continue enjoying these premium features, subscribe to our Agent Plan. If you choose not to subscribe, you'll be automatically switched to a Private Seller account with:</p>
        <ul>
          <li>3 active listings (free)</li>
          <li>Basic property management</li>
          <li>Standard messaging features</li>
        </ul>

        <div style="text-align: center;">
          <a href="${FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
        </div>

        <p>Make the most of your trial period! If you have any questions, our support team is here to help.</p>

        <p>Best regards,<br>The Balkan Estate Team</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: '🎉 Your 7-Day Agent Trial Has Started!',
    html: emailHtml,
  });
};

/**
 * Send trial expiration reminder (3 days before)
 */
export const sendTrialExpirationReminder = async (user: IUser): Promise<void> => {
  const trialEndDate = user.trialEndDate!.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
          background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
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
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #28a745;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .comparison {
          display: flex;
          gap: 20px;
          margin: 20px 0;
        }
        .plan {
          flex: 1;
          background: white;
          padding: 20px;
          border-radius: 5px;
          border: 2px solid #ddd;
        }
        .plan.premium {
          border-color: #28a745;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⏰ Your Trial is Ending Soon</h1>
      </div>
      <div class="content">
        <h2>Hi ${user.name},</h2>
        <p>Your 7-day agent trial is ending in <strong>3 days</strong> on ${trialEndDate}.</p>

        <div class="warning-box">
          <strong>⚠️ Important Notice:</strong><br>
          To continue using premium agent features, please subscribe before your trial ends. Otherwise, your account will be automatically downgraded to a Private Seller account.
        </div>

        <h3>What Happens Next?</h3>

        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0;">If You Subscribe (Agent Plan):</h4>
          <ul>
            <li>✅ List up to 50 properties</li>
            <li>✅ Advanced analytics and insights</li>
            <li>✅ Professional agent profile</li>
            <li>✅ Featured listings placement</li>
            <li>✅ Priority customer support</li>
          </ul>

          <h4>If You Don't Subscribe (Private Seller - Free):</h4>
          <ul>
            <li>📝 3 active listings (free)</li>
            <li>📊 Basic analytics</li>
            <li>💬 Standard messaging</li>
            <li>🔄 Option to pay per additional listing</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${FRONTEND_URL}/pricing" class="button">View Subscription Plans</a>
        </div>

        <p><strong>Monthly Plan Pricing:</strong></p>
        <ul>
          <li><strong>Agent Plan:</strong> Access to 50 active listings + premium features</li>
          <li><strong>Private Seller Plan:</strong> 20 active listings</li>
          <li><strong>Free Plan:</strong> 3 active listings</li>
        </ul>

        <p>Have questions? Our team is here to help you choose the right plan for your needs.</p>

        <p>Best regards,<br>The Balkan Estate Team</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: '⏰ Your Agent Trial Ends in 3 Days - Subscribe Now',
    html: emailHtml,
  });

  // Mark reminder as sent
  user.trialReminderSent = true;
  await user.save();
};

/**
 * Send trial expired notification
 */
const sendTrialExpiredEmail = async (user: IUser): Promise<void> => {
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
          background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
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
        .info-box {
          background: #d1ecf1;
          border-left: 4px solid #0c5460;
          padding: 15px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 15px 30px;
          background: #28a745;
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
        <h1>Your Trial Has Ended</h1>
      </div>
      <div class="content">
        <h2>Hi ${user.name},</h2>
        <p>Your 7-day agent trial has expired. Your account has been automatically converted to a <strong>Private Seller</strong> account.</p>

        <div class="info-box">
          <strong>Your Current Plan (Free):</strong><br>
          • 3 active listings<br>
          • Basic property management<br>
          • Standard messaging<br>
          • Option to purchase additional listings
        </div>

        <h3>Want More Features?</h3>
        <p>You can upgrade anytime to access premium features:</p>
        <ul>
          <li><strong>Private Seller Monthly Plan:</strong> 20 active listings</li>
          <li><strong>Agent Plan:</strong> 50 active listings + advanced features</li>
          <li><strong>Pay Per Listing:</strong> Need more? Pay for individual extra listings</li>
        </ul>

        <div style="text-align: center;">
          <a href="${FRONTEND_URL}/pricing" class="button">Upgrade Your Plan</a>
        </div>

        <p>Thank you for trying our agent trial! We hope you'll consider upgrading to unlock the full potential of Balkan Estate.</p>

        <p>Best regards,<br>The Balkan Estate Team</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Your Trial Has Ended - Upgrade to Continue',
    html: emailHtml,
  });
};

/**
 * Expire trial and downgrade user to private_seller
 */
export const expireTrialAndDowngrade = async (user: IUser): Promise<void> => {
  // Mark trial as expired
  user.trialExpired = true;
  user.subscriptionStatus = 'expired';

  // Deactivate Pro subscription
  if (user.proSubscription) {
    user.proSubscription.isActive = false;
  }

  // Downgrade to private_seller
  user.role = 'private_seller';
  user.activeListingsLimit = 3; // Free tier: 3 active listings
  user.isSubscribed = false;
  user.subscriptionPlan = undefined;
  user.subscriptionProductName = undefined;

  // Initialize free subscription for private seller
  if (!user.freeSubscription) {
    user.freeSubscription = {
      activeListingsCount: 0,
      listingsLimit: 3,
    };
  }

  await user.save();

  // Send notification email
  await sendTrialExpiredEmail(user);
};

/**
 * Find users whose trials are expiring soon and need reminders
 */
export const findTrialsNeedingReminder = async (): Promise<IUser[]> => {
  const now = new Date();
  const reminderDate = new Date(now.getTime() + REMINDER_DAYS_BEFORE * 24 * 60 * 60 * 1000);

  return User.find({
    role: 'agent',
    trialExpired: false,
    trialReminderSent: false,
    trialEndDate: {
      $gte: now,
      $lte: reminderDate,
    },
  });
};

/**
 * Find expired trials that need to be processed
 */
export const findExpiredTrials = async (): Promise<IUser[]> => {
  const now = new Date();

  return User.find({
    role: 'agent',
    trialExpired: false,
    trialEndDate: { $lte: now },
    // Only expire trials if user doesn't have active subscription
    $or: [
      { isSubscribed: false },
      { subscriptionStatus: { $ne: 'active' } },
    ],
  });
};

/**
 * Process all trial reminders and expirations (run daily via cron job)
 */
export const processTrialManagement = async (): Promise<{
  remindersSent: number;
  trialsExpired: number;
}> => {
  let remindersSent = 0;
  let trialsExpired = 0;

  // Send reminders
  const usersNeedingReminder = await findTrialsNeedingReminder();
  for (const user of usersNeedingReminder) {
    try {
      await sendTrialExpirationReminder(user);
      remindersSent++;
    } catch (error) {
      console.error(`Failed to send trial reminder to ${user.email}:`, error);
    }
  }

  // Expire trials
  const expiredTrials = await findExpiredTrials();
  for (const user of expiredTrials) {
    try {
      await expireTrialAndDowngrade(user);
      trialsExpired++;
    } catch (error) {
      console.error(`Failed to expire trial for ${user.email}:`, error);
    }
  }

  return { remindersSent, trialsExpired };
};
