/**
 * Email Preview Test Script
 * Run with: npx ts-node src/scripts/testEmails.ts
 *
 * Generates HTML files in /tmp for previewing email templates:
 * - Enterprise Agent Registration Coupons
 * - Enterprise Welcome/Thank You
 * - Pro Monthly Promotion Coupons
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// Helper Functions
// =============================================================================

function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =============================================================================
// Test Data
// =============================================================================

const testAgencyOwner = {
  name: 'Zani Dalipi',
  email: 'zani@balkanestateai.com',
  agencyName: 'Dalipi Real Estate',
};

const testAgentCoupons = [
  { code: 'AGENCY-DALP-X7K9M2', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-B3N8P5', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-Q2W4E6', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-R8T1Y3', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'AGENCY-DALP-U6I0O9', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
];

const testProUser = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  planName: 'Pro Monthly',
};

// =============================================================================
// Email Templates
// =============================================================================

/**
 * Enterprise Agent Registration Coupons Email
 */
function generateAgentCouponsEmail(params: {
  ownerName: string;
  agencyName: string;
  coupons: Array<{ code: string; expiresAt: Date }>;
}): string {
  const frontendUrl = 'https://balkanestateai.com';
  const safeOwnerName = escapeHtml(params.ownerName);
  const safeAgencyName = escapeHtml(params.agencyName);
  const currentYear = new Date().getFullYear();

  const couponRows = params.coupons.map((coupon, index) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <span style="display: inline-block; background: #f3f4f6; padding: 8px 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-weight: 600; font-size: 14px; color: #1f2937; letter-spacing: 1px;">
          ${escapeHtml(coupon.code)}
        </span>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
        Agent ${index + 1}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
        ${coupon.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent Registration Coupons - ${safeAgencyName}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your Enterprise subscription is active! Here are your 5 agent registration codes.
  </div>

  <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; line-height: 60px; font-size: 28px;">🏢</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Enterprise Plan Activated!</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Welcome to BalkanEstate<sup>AI</sup> Enterprise</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hello ${safeOwnerName}! 🎉
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Congratulations! Your Enterprise subscription for <strong>${safeAgencyName}</strong> is now active.
        Below are <strong>5 agent registration codes</strong> that your team members can use to join with a full <strong>yearly Pro subscription</strong> included!
      </p>

      <!-- Agent Coupons Table -->
      <div style="background: #f9fafb; border-radius: 12px; overflow: hidden; margin-bottom: 24px; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 12px 16px;">
          <h2 style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 600;">🎟️ Agent Registration Codes</h2>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Code</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">For</th>
              <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Expires</th>
            </tr>
          </thead>
          <tbody>
            ${couponRows}
          </tbody>
        </table>
      </div>

      <!-- How to Use -->
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
        <h3 style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📋 How to Use These Codes</h3>
        <ol style="color: #1e40af; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Share a code with each team member you want to invite</li>
          <li>They register on BalkanEstate<sup>AI</sup> (or log in if already registered)</li>
          <li>Go to <strong>Agency → Redeem Code</strong> and enter the code</li>
          <li>They'll automatically get a yearly Pro subscription and join your agency!</li>
        </ol>
      </div>

      <!-- Benefits Box -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 2px solid #f59e0b;">
        <h3 style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">✨ What Each Agent Gets</h3>
        <ul style="color: #78350f; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li><strong>Full Year</strong> of Pro features included</li>
          <li><strong>20 listings per month</strong> under your agency</li>
          <li><strong>Monthly promotion coupons</strong> shared with the team</li>
          <li><strong>Priority support</strong> and agency branding</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/agency/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.3);">
          Go to Agency Dashboard →
        </a>
      </div>

      <p style="text-align: center; margin: 0;">
        <a href="${frontendUrl}/agency/team" style="color: #6b7280; font-size: 13px; text-decoration: none;">Manage your team →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        ${safeAgencyName} · Enterprise Plan
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Enterprise Welcome/Thank You Email
 */
function generateEnterpriseWelcomeEmail(params: {
  ownerName: string;
  agencyName: string;
}): string {
  const frontendUrl = 'https://balkanestateai.com';
  const safeOwnerName = escapeHtml(params.ownerName);
  const safeAgencyName = escapeHtml(params.agencyName);
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Enterprise - ${safeAgencyName}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Thank you for choosing BalkanEstateᴬᴵ Enterprise! Your journey starts now.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 80px; font-size: 40px;">🎉</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Thank You!</h1>
      <p style="color: #fef3c7; margin: 12px 0 0 0; font-size: 16px;">Welcome to the Enterprise family</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 18px; margin: 0 0 24px 0;">
        Dear ${safeOwnerName},
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
        We're thrilled to have <strong>${safeAgencyName}</strong> join the BalkanEstate<sup>AI</sup> Enterprise program!
        Your trust in our platform means the world to us, and we're committed to helping your agency succeed.
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
        As an Enterprise subscriber, you now have access to our most powerful features designed specifically for
        growing real estate agencies like yours.
      </p>

      <!-- What's Included -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🚀 Your Enterprise Benefits</h2>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-block; width: 32px; height: 32px; background: #059669; border-radius: 50%; text-align: center; line-height: 32px; font-size: 16px;">✓</span>
            <span style="color: #e2e8f0; font-size: 14px;"><strong>500 Listings</strong> - Expandable as you grow</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-block; width: 32px; height: 32px; background: #059669; border-radius: 50%; text-align: center; line-height: 32px; font-size: 16px;">✓</span>
            <span style="color: #e2e8f0; font-size: 14px;"><strong>5 Team Members</strong> - Each with yearly Pro subscription</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-block; width: 32px; height: 32px; background: #059669; border-radius: 50%; text-align: center; line-height: 32px; font-size: 16px;">✓</span>
            <span style="color: #e2e8f0; font-size: 14px;"><strong>5 Monthly Promotion Coupons</strong> - Boost your visibility</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-block; width: 32px; height: 32px; background: #059669; border-radius: 50%; text-align: center; line-height: 32px; font-size: 16px;">✓</span>
            <span style="color: #e2e8f0; font-size: 14px;"><strong>Priority Support</strong> - We're here when you need us</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="display: inline-block; width: 32px; height: 32px; background: #059669; border-radius: 50%; text-align: center; line-height: 32px; font-size: 16px;">✓</span>
            <span style="color: #e2e8f0; font-size: 14px;"><strong>Agency Branding</strong> - Your brand, front and center</span>
          </div>
        </div>
      </div>

      <!-- Next Steps -->
      <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
        <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📋 Your Next Steps</h3>
        <ol style="color: #166534; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Check your inbox for <strong>5 agent registration codes</strong></li>
          <li>Share codes with your team members to onboard them</li>
          <li>Set up your agency profile with branding and description</li>
          <li>Start listing properties and watch your agency grow!</li>
        </ol>
      </div>

      <!-- Personal Note -->
      <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin-bottom: 28px; border-left: 4px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
          "We built BalkanEstate<sup>AI</sup> to empower real estate professionals across the Balkans.
          Your success is our success. If you ever need anything, don't hesitate to reach out!"
        </p>
        <p style="color: #78350f; font-size: 13px; margin: 12px 0 0 0; font-weight: 600;">
          — The BalkanEstate<sup>AI</sup> Team
        </p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/agency/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4); margin-bottom: 12px;">
          Go to Dashboard →
        </a>
      </div>

      <div style="text-align: center;">
        <a href="${frontendUrl}/agency/settings" style="color: #6b7280; font-size: 13px; text-decoration: none; margin-right: 16px;">Agency Settings</a>
        <a href="${frontendUrl}/support" style="color: #6b7280; font-size: 13px; text-decoration: none;">Contact Support</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #374151; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
        ${safeAgencyName}
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px 0;">
        Enterprise Subscriber · €1,000/year
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 12px 0 0 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Pro Monthly Promotion Coupons Email
 */
function generateProMonthlyCouponsEmail(params: {
  userName: string;
  planName: string;
  totalCoupons: number;
  newCoupons: number;
  rolledOver: number;
  breakdown: {
    highlighted: number;
    premium: number;
    featured: number;
  };
}): string {
  const frontendUrl = 'https://balkanestateai.com';
  const safeUserName = escapeHtml(params.userName);
  const safePlanName = escapeHtml(params.planName);
  const currentYear = new Date().getFullYear();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[new Date().getMonth()];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentMonth} Promotion Coupons</title>
</head>
<body style="margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your ${currentMonth} promotion coupons are ready! ${params.totalCoupons} coupons available.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 60px; font-size: 28px;">🎟️</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${currentMonth} Coupons Ready!</h1>
      <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 14px;">Your monthly promotion coupons have arrived</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hey ${safeUserName}! 👋
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Your <strong>${safePlanName}</strong> subscription includes fresh promotion coupons for ${currentMonth}. Time to boost your listings!
      </p>

      <!-- Coupon Summary Card -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 2px solid #f59e0b;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 48px; font-weight: 700; color: #92400e;">${params.totalCoupons}</div>
          <div style="font-size: 14px; color: #78350f; font-weight: 600;">Total Coupons Available</div>
        </div>

        ${params.rolledOver > 0 ? `
        <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 12px; margin-bottom: 12px;">
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; text-align: center; width: 50%; border-right: 1px solid #f59e0b;">
              <div style="font-size: 20px; font-weight: 700; color: #92400e;">+${params.newCoupons}</div>
              <div style="font-size: 11px; color: #78350f;">New This Month</div>
            </div>
            <div style="display: table-cell; text-align: center; width: 50%;">
              <div style="font-size: 20px; font-weight: 700; color: #92400e;">+${params.rolledOver}</div>
              <div style="font-size: 11px; color: #78350f;">Rolled Over</div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Coupon Breakdown -->
        <div style="background: rgba(255,255,255,0.5); border-radius: 8px; padding: 12px;">
          <div style="font-size: 12px; color: #78350f; font-weight: 600; margin-bottom: 8px; text-align: center;">Coupon Breakdown:</div>
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; text-align: center; ${params.breakdown.highlighted > 0 ? '' : 'opacity: 0.5;'}">
              <div style="font-size: 18px; font-weight: 700; color: #059669;">${params.breakdown.highlighted}</div>
              <div style="font-size: 10px; color: #78350f;">Highlighted</div>
            </div>
            <div style="display: table-cell; text-align: center; ${params.breakdown.premium > 0 ? '' : 'opacity: 0.5;'}">
              <div style="font-size: 18px; font-weight: 700; color: #7c3aed;">${params.breakdown.premium}</div>
              <div style="font-size: 10px; color: #78350f;">Premium</div>
            </div>
            ${params.breakdown.featured > 0 ? `
            <div style="display: table-cell; text-align: center;">
              <div style="font-size: 18px; font-weight: 700; color: #dc2626;">${params.breakdown.featured}</div>
              <div style="font-size: 10px; color: #78350f;">Featured</div>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Info Box -->
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>💡 Pro Tip:</strong> Use your promotion coupons to boost listings that aren't getting enough views.
          Promoted listings get up to <strong>5x more visibility</strong>!
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/promotions"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
          Use My Coupons →
        </a>
      </div>

      <p style="text-align: center; margin: 0;">
        <a href="${frontendUrl}/my-listings" style="color: #6b7280; font-size: 13px; text-decoration: none;">View my listings →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        ${safePlanName} Subscription
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;
}

// =============================================================================
// Main Function
// =============================================================================

async function main() {
  const outputDir = '/tmp/email-previews';

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🎨 Generating email previews...\n');

  // 1. Enterprise Agent Registration Coupons Email
  const agentCouponsHtml = generateAgentCouponsEmail({
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
    coupons: testAgentCoupons,
  });
  const agentCouponsPath = path.join(outputDir, '1-enterprise-agent-coupons.html');
  fs.writeFileSync(agentCouponsPath, agentCouponsHtml);
  console.log(`✅ Enterprise Agent Coupons Email: ${agentCouponsPath}`);

  // 2. Enterprise Welcome/Thank You Email
  const welcomeHtml = generateEnterpriseWelcomeEmail({
    ownerName: testAgencyOwner.name,
    agencyName: testAgencyOwner.agencyName,
  });
  const welcomePath = path.join(outputDir, '2-enterprise-welcome-thankyou.html');
  fs.writeFileSync(welcomePath, welcomeHtml);
  console.log(`✅ Enterprise Welcome Email: ${welcomePath}`);

  // 3. Pro Monthly Promotion Coupons Email
  const proMonthlyHtml = generateProMonthlyCouponsEmail({
    userName: testProUser.name,
    planName: testProUser.planName,
    totalCoupons: 5,
    newCoupons: 3,
    rolledOver: 2,
    breakdown: {
      highlighted: 2,
      premium: 2,
      featured: 1,
    },
  });
  const proMonthlyPath = path.join(outputDir, '3-pro-monthly-coupons.html');
  fs.writeFileSync(proMonthlyPath, proMonthlyHtml);
  console.log(`✅ Pro Monthly Coupons Email: ${proMonthlyPath}`);

  console.log('\n📧 Email previews generated successfully!');
  console.log(`\n📂 Open in browser:`);
  console.log(`   file://${agentCouponsPath}`);
  console.log(`   file://${welcomePath}`);
  console.log(`   file://${proMonthlyPath}`);

  console.log('\n💡 Or run: open /tmp/email-previews/*.html');
}

main().catch(console.error);
