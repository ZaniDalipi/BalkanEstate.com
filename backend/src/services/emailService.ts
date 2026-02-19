import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import User from '../models/User';
import { getPromoTemplate, BRAND_COLORS } from '../templates/emailTemplates';
import { emailLogger } from '../utils/logger';
import { getActiveEmailConfig, renderEmailConfig, buildCouponCodesHtml } from '../utils/emailTemplateRenderer';

// =============================================================================
// Security Utilities
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(unsafe: string | undefined | null): string {
  if (unsafe == null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate and sanitize URL - only allow http/https protocols
 */
function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Sanitize URL for use in HTML attributes (escape special chars and validate protocol)
 */
function sanitizeUrlForHtml(url: string | undefined | null): string {
  const sanitized = sanitizeUrl(url);
  return escapeHtml(sanitized);
}

// =============================================================================
// Types and Interfaces
// =============================================================================

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
  category?: 'noreply' | 'alerts' | 'support' | 'inquiries';
}

type EmailProvider = 'resend' | 'smtp' | 'none';

// Weekly statistics data structure for sellers
export interface WeeklyStatsData {
  userName: string;
  email: string;
  totalViews: number;
  viewsChange: number; // Percentage change from last week
  totalInquiries: number;
  inquiriesChange: number;
  totalSaves: number;
  savesChange: number;
  activeListings: number;
  topPerformingProperty?: {
    title: string;
    address: string;
    views: number;
    inquiries: number;
  };
  propertiesSold: number;
  totalSalesValue: number;
  period: string; // e.g., "Dec 30 - Jan 5"
}

// Agency statistics data structure
export interface AgencyWeeklyStatsData {
  agencyName: string;
  email: string;
  profileViews: number;
  profileViewsChange: number;
  uniqueProfileViews: number;
  totalAgents: number;
  totalListings: number;
  activeListings: number;
  totalInquiries: number;
  inquiriesChange: number;
  topAgent?: {
    name: string;
    views: number;
    inquiries: number;
  };
  topProperty?: {
    title: string;
    views: number;
  };
  period: string;
}

// New message notification params
export interface NewMessageParams {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  senderAvatarUrl?: string;
  messagePreview: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyImageUrl?: string;
  conversationUrl: string;
}

// Email categories for different purposes
export type EmailCategory = 'noreply' | 'alerts' | 'support' | 'inquiries';

// Default "from" addresses for each category
const DEFAULT_EMAIL_ADDRESSES: Record<EmailCategory, string> = {
  noreply: 'BalkanEstateᴬᴵ <noreply@balkanestateai.com>',
  alerts: 'BalkanEstateᴬᴵ Alerts <alerts@balkanestateai.com>',
  support: 'BalkanEstateᴬᴵ Support <support@balkanestateai.com>',
  inquiries: 'BalkanEstateᴬᴵ <inquiries@balkanestateai.com>',
};

// Minimum gap between consecutive email sends (ms). Default 5 minutes.
const EMAIL_SEND_INTERVAL_MS = parseInt(process.env.EMAIL_SEND_INTERVAL_MS ?? '300000', 10);

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private provider: EmailProvider = 'none';
  private fromEmails: Record<EmailCategory, string>;

  // Simple in-memory send queue to avoid hitting provider rate limits
  private sendQueue: Array<{ config: EmailConfig; resolve: () => void; reject: (err: unknown) => void }> = [];
  private queueRunning = false;

  constructor() {
    // Initialize from addresses (can be overridden via env vars)
    this.fromEmails = {
      noreply: process.env.EMAIL_FROM_NOREPLY || DEFAULT_EMAIL_ADDRESSES.noreply,
      alerts: process.env.EMAIL_FROM_ALERTS || DEFAULT_EMAIL_ADDRESSES.alerts,
      support: process.env.EMAIL_FROM_SUPPORT || DEFAULT_EMAIL_ADDRESSES.support,
      inquiries: process.env.EMAIL_FROM_INQUIRIES || DEFAULT_EMAIL_ADDRESSES.inquiries,
    };

    // Priority: Resend > SMTP > None
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.provider = 'resend';
      emailLogger.info('✉️ Email service configured with Resend');
      emailLogger.info('   Email addresses:');
      emailLogger.info(`     noreply: ${this.fromEmails.noreply}`);
      emailLogger.info(`     alerts: ${this.fromEmails.alerts}`);
      emailLogger.info(`     support: ${this.fromEmails.support}`);
      emailLogger.info(`     inquiries: ${this.fromEmails.inquiries}`);
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.provider = 'smtp';
      emailLogger.info('✉️ Email service configured with SMTP');
    } else {
      emailLogger.warn('⚠️ Email service not configured. Set RESEND_API_KEY or SMTP credentials.');
      emailLogger.warn('   Get a free Resend API key at: https://resend.com');
    }
  }

  /**
   * Get the appropriate "from" address for an email category
   */
  getFromAddress(category: EmailCategory = 'noreply'): string {
    return this.fromEmails[category];
  }

  /**
   * Background queue processor — sends one email at a time with a
   * EMAIL_SEND_INTERVAL_MS gap (default 5 min) to stay under provider rate limits.
   */
  private async processQueue(): Promise<void> {
    if (this.queueRunning) return;
    this.queueRunning = true;
    while (this.sendQueue.length > 0) {
      const item = this.sendQueue.shift()!;
      try {
        await this.dispatchEmail(item.config);
        item.resolve();
      } catch (err) {
        item.reject(err);
      }
      if (this.sendQueue.length > 0) {
        await new Promise(r => setTimeout(r, EMAIL_SEND_INTERVAL_MS));
      }
    }
    this.queueRunning = false;
  }

  /**
   * Enqueue an email. Returns a promise that resolves once the email is sent.
   */
  async sendEmail(config: EmailConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sendQueue.push({ config, resolve, reject });
      this.processQueue().catch(err => emailLogger.error('Queue processor error:', err));
    });
  }

  /**
   * Actually dispatch the email through the configured provider.
   */
  private async dispatchEmail(config: EmailConfig): Promise<void> {
    // Validate email address
    if (!isValidEmail(config.to)) {
      emailLogger.error(`❌ Invalid email address: ${config.to}`);
      throw new Error('Invalid email address format');
    }

    // Get the appropriate "from" address based on category
    const fromAddress = this.getFromAddress(config.category || 'noreply');

    // Skip email sending if not configured
    if (this.provider === 'none') {
      emailLogger.info('📧 [DEV MODE] Email skipped (no email provider configured):');
      emailLogger.info(`   From: ${fromAddress}`);
      emailLogger.info(`   To: ${config.to}`);
      emailLogger.info(`   Subject: ${config.subject}`);
      return;
    }

    try {
      if (this.provider === 'resend' && this.resend) {
        const { error } = await this.resend.emails.send({
          from: fromAddress,
          to: config.to,
          subject: config.subject,
          html: config.html,
          text: config.text,
        });
        if (error) {
          throw new Error(error.message);
        }
      } else if (this.provider === 'smtp' && this.transporter) {
        await this.transporter.sendMail({
          from: fromAddress,
          to: config.to,
          subject: config.subject,
          html: config.html,
          text: config.text || '',
        });
      }
      emailLogger.info(`✅ Email sent (${config.category || 'noreply'}) to ${config.to}: ${config.subject}`);
    } catch (error) {
      emailLogger.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  /**
   * Helper to format numbers with + or - prefix for changes
   */
  private formatChange(change: number): string {
    if (change > 0) return `<span style="color: #22c55e;">+${change}%</span>`;
    if (change < 0) return `<span style="color: #ef4444;">${change}%</span>`;
    return `<span style="color: #6b7280;">0%</span>`;
  }

  /**
   * Helper to format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  /**
   * Fetch unsubscribe token for a user by email
   * Also checks if user has opted out of specific email type
   */
  private async getUnsubscribeInfo(email: string, emailType: string = 'all'): Promise<{
    token: string | undefined;
    canSend: boolean;
  }> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() }).select('unsubscribeToken emailPreferences');
      if (!user) {
        return { token: undefined, canSend: true }; // Non-registered users still get emails
      }

      // Check if user has opted out of this email type
      const preferences = user.emailPreferences || {
        weeklyStats: true,
        propertyAlerts: true,
        priceDrops: true,
        messages: true,
        marketing: true,
        transactional: true,
      };

      // Map email types to preference keys
      const typeToPreference: Record<string, keyof typeof preferences> = {
        weeklyStats: 'weeklyStats',
        propertyAlerts: 'propertyAlerts',
        priceDrops: 'priceDrops',
        messages: 'messages',
        marketing: 'marketing',
        transactional: 'transactional',
        all: 'transactional', // 'all' only blocked if transactional is blocked (shouldn't happen)
      };

      const preferenceKey = typeToPreference[emailType] || 'transactional';
      const canSend = preferences[preferenceKey] !== false;

      return { token: user.unsubscribeToken, canSend };
    } catch (error) {
      emailLogger.error('Error fetching unsubscribe info:', error);
      return { token: undefined, canSend: true }; // Default to sending on error
    }
  }

  /**
   * Generate email footer with unsubscribe link
   * @param unsubscribeToken - User's unique unsubscribe token
   * @param emailType - Type of email for specific unsubscribe (weeklyStats, propertyAlerts, priceDrops, messages, marketing)
   * @param reason - Reason shown to user why they're receiving this email
   */
  generateEmailFooter(unsubscribeToken: string | undefined, emailType: string = 'all', reason: string = ''): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const backendUrl = process.env.BACKEND_URL || 'https://api.balkanestate.com';
    const year = new Date().getFullYear();

    const unsubscribeUrl = unsubscribeToken
      ? `${backendUrl}/api/auth/unsubscribe?token=${unsubscribeToken}&type=${emailType}`
      : `${frontendUrl}/settings/notifications`;

    const unsubscribeAllUrl = unsubscribeToken
      ? `${backendUrl}/api/auth/unsubscribe?token=${unsubscribeToken}&type=all`
      : `${frontendUrl}/settings/notifications`;

    return `
    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      ${reason ? `<p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">${escapeHtml(reason)}</p>` : ''}
      <p style="color: #9ca3af; font-size: 11px; margin: 0 0 8px 0;">
        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from these emails</a>
        ${emailType !== 'all' ? ` · <a href="${unsubscribeAllUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe from all</a>` : ''}
        · <a href="${frontendUrl}/settings/notifications" style="color: #9ca3af; text-decoration: underline;">Manage preferences</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
        © ${year} BalkanEstate<sup>AI</sup>. All rights reserved.
      </p>
    </div>`;
  }

  /**
   * Send weekly statistics email to Pro members
   */
  async sendWeeklyStats(data: WeeklyStatsData): Promise<void> {
    // Check if user has opted out of weekly stats emails
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(data.email, 'weeklyStats');
    if (!canSend) {
      emailLogger.info(`📧 Skipping weekly stats email to ${data.email} - user unsubscribed`);
      return;
    }

    // Sanitize user inputs
    const safeUserName = escapeHtml(data.userName);
    const safePeriod = escapeHtml(data.period);
    const safeTopPropertyTitle = data.topPerformingProperty ? escapeHtml(data.topPerformingProperty.title) : '';
    const safeTopPropertyAddress = data.topPerformingProperty ? escapeHtml(data.topPerformingProperty.address) : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📊 Your Weekly Report</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">${safePeriod}</p>
    </div>

    <!-- Greeting -->
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>${safeUserName}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's how your properties performed this week:
      </p>

      <!-- Stats Grid -->
      <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 8px;">
        <div style="display: table-row;">
          <!-- Views -->
          <div style="display: table-cell; width: 50%; background: #f0f9ff; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #0369a1;">${data.totalViews.toLocaleString()}</div>
            <div style="font-size: 12px; color: #6b7280; margin: 4px 0;">Total Views</div>
            <div style="font-size: 12px;">${this.formatChange(data.viewsChange)} vs last week</div>
          </div>
          <!-- Inquiries -->
          <div style="display: table-cell; width: 50%; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #16a34a;">${data.totalInquiries}</div>
            <div style="font-size: 12px; color: #6b7280; margin: 4px 0;">Inquiries</div>
            <div style="font-size: 12px;">${this.formatChange(data.inquiriesChange)} vs last week</div>
          </div>
        </div>
      </div>

      <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 8px; margin-top: 8px;">
        <div style="display: table-row;">
          <!-- Saves -->
          <div style="display: table-cell; width: 50%; background: #fef3c7; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #d97706;">${data.totalSaves}</div>
            <div style="font-size: 12px; color: #6b7280; margin: 4px 0;">Saves</div>
            <div style="font-size: 12px;">${this.formatChange(data.savesChange)} vs last week</div>
          </div>
          <!-- Active Listings -->
          <div style="display: table-cell; width: 50%; background: #faf5ff; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 32px; font-weight: 700; color: #7c3aed;">${data.activeListings}</div>
            <div style="font-size: 12px; color: #6b7280; margin: 4px 0;">Active Listings</div>
          </div>
        </div>
      </div>

      ${data.topPerformingProperty ? `
      <!-- Top Performing Property -->
      <div style="margin-top: 24px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; margin-right: 8px;">🏆</span>
          <span style="font-weight: 600; color: #92400e;">Top Performing Property</span>
        </div>
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${safeTopPropertyTitle}</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${safeTopPropertyAddress}</div>
        <div style="display: flex; gap: 16px; margin-top: 8px;">
          <span style="font-size: 12px; color: #6b7280;">👁 ${data.topPerformingProperty.views} views</span>
          <span style="font-size: 12px; color: #6b7280;">💬 ${data.topPerformingProperty.inquiries} inquiries</span>
        </div>
      </div>
      ` : ''}

      ${data.propertiesSold > 0 ? `
      <!-- Sales Summary -->
      <div style="margin-top: 24px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; margin-right: 8px;">🎉</span>
          <span style="font-weight: 600; color: #166534;">Sales This Week</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <div>
            <div style="font-size: 24px; font-weight: 700; color: #166534;">${data.propertiesSold}</div>
            <div style="font-size: 12px; color: #6b7280;">Properties Sold</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: 700; color: #166534;">${this.formatCurrency(data.totalSalesValue)}</div>
            <div style="font-size: 12px; color: #6b7280;">Total Value</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://balkanestate.com'}/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Full Analytics →
        </a>
      </div>

      <!-- Tips Section -->
      <div style="margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">💡 Pro Tips</div>
        <ul style="color: #6b7280; font-size: 13px; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">Respond to inquiries within 1 hour to increase conversion by 50%</li>
          <li style="margin-bottom: 4px;">Properties with 10+ photos get 3x more views</li>
          <li>Consider promoting your top property for more visibility</li>
        </ul>
      </div>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'weeklyStats', "You're receiving this email because you're a Pro member of BalkanEstate.")}
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: data.email,
      subject: `📊 Your Weekly Stats: ${data.totalViews.toLocaleString()} views, ${data.totalInquiries} inquiries`,
      html,
      text: `Hi ${data.userName}, here's your weekly report for ${data.period}: ${data.totalViews} views, ${data.totalInquiries} inquiries, ${data.totalSaves} saves.`,
      category: 'support',
    });
  }

  /**
   * Send weekly statistics email to agency owners
   */
  async sendAgencyWeeklyStats(data: AgencyWeeklyStatsData): Promise<void> {
    // Check if user has opted out of weekly stats emails
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(data.email, 'weeklyStats');
    if (!canSend) {
      emailLogger.info(`📧 Skipping agency weekly stats email to ${data.email} - user unsubscribed`);
      return;
    }

    // Sanitize user inputs
    const safeAgencyName = escapeHtml(data.agencyName);
    const safePeriod = escapeHtml(data.period);
    const safeTopAgentName = data.topAgent ? escapeHtml(data.topAgent.name) : '';
    const safeTopPropertyTitle = data.topProperty ? escapeHtml(data.topProperty.title) : '';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🏢 Agency Weekly Report</h1>
      <p style="color: #ddd6fe; margin: 8px 0 0 0; font-size: 14px;">${safePeriod}</p>
    </div>

    <!-- Greeting -->
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>${safeAgencyName}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's how your agency performed this week:
      </p>

      <!-- Agency Profile Stats -->
      <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #5b21b6; margin-bottom: 12px;">📍 Agency Profile Performance</div>
        <div style="display: table; width: 100%;">
          <div style="display: table-row;">
            <div style="display: table-cell; width: 50%; text-align: center; padding: 8px;">
              <div style="font-size: 28px; font-weight: 700; color: #7c3aed;">${data.profileViews.toLocaleString()}</div>
              <div style="font-size: 11px; color: #6b7280;">Profile Views</div>
              <div style="font-size: 11px;">${this.formatChange(data.profileViewsChange)}</div>
            </div>
            <div style="display: table-cell; width: 50%; text-align: center; padding: 8px;">
              <div style="font-size: 28px; font-weight: 700; color: #7c3aed;">${data.uniqueProfileViews.toLocaleString()}</div>
              <div style="font-size: 11px; color: #6b7280;">Unique Visitors</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 8px;">
        <div style="display: table-row;">
          <!-- Agents -->
          <div style="display: table-cell; width: 33%; background: #f0f9ff; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #0369a1;">${data.totalAgents}</div>
            <div style="font-size: 11px; color: #6b7280;">Agents</div>
          </div>
          <!-- Listings -->
          <div style="display: table-cell; width: 33%; background: #f0fdf4; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${data.activeListings}</div>
            <div style="font-size: 11px; color: #6b7280;">Active Listings</div>
          </div>
          <!-- Inquiries -->
          <div style="display: table-cell; width: 33%; background: #fef3c7; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="font-size: 24px; font-weight: 700; color: #d97706;">${data.totalInquiries}</div>
            <div style="font-size: 11px; color: #6b7280;">Inquiries</div>
            <div style="font-size: 10px;">${this.formatChange(data.inquiriesChange)}</div>
          </div>
        </div>
      </div>

      ${data.topAgent ? `
      <!-- Top Agent -->
      <div style="margin-top: 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; margin-right: 8px;">⭐</span>
          <span style="font-weight: 600; color: #92400e;">Top Performing Agent</span>
        </div>
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${safeTopAgentName}</div>
        <div style="display: flex; gap: 16px; margin-top: 8px;">
          <span style="font-size: 12px; color: #6b7280;">👁 ${data.topAgent.views} views</span>
          <span style="font-size: 12px; color: #6b7280;">💬 ${data.topAgent.inquiries} inquiries</span>
        </div>
      </div>
      ` : ''}

      ${data.topProperty ? `
      <!-- Top Property -->
      <div style="margin-top: 16px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 16px;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 18px; margin-right: 8px;">🏠</span>
          <span style="font-weight: 600; color: #166534;">Top Property</span>
        </div>
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${safeTopPropertyTitle}</div>
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">👁 ${data.topProperty.views} views this week</div>
      </div>
      ` : ''}

      <!-- CTA -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://balkanestate.com'}/agency/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Agency Dashboard →
        </a>
      </div>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'weeklyStats', "You're receiving this email as an agency owner on BalkanEstate.")}
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: data.email,
      subject: `🏢 ${data.agencyName} Weekly Report: ${data.profileViews} profile views, ${data.totalInquiries} inquiries`,
      html,
      text: `Hi ${data.agencyName}, here's your weekly agency report for ${data.period}: ${data.profileViews} profile views, ${data.totalInquiries} inquiries, ${data.totalAgents} agents.`,
      category: 'support',
    });
  }

  /**
   * Send enhanced new message notification with property details
   */
  async sendNewMessageNotification(params: NewMessageParams): Promise<void> {
    // Check if user has opted out of message notifications
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(params.recipientEmail, 'messages');
    if (!canSend) {
      emailLogger.info(`📧 Skipping message notification to ${params.recipientEmail} - user unsubscribed`);
      return;
    }

    // Sanitize all user inputs
    const safeSenderName = escapeHtml(params.senderName);
    const safeMessagePreview = escapeHtml(params.messagePreview);
    const safePropertyTitle = escapeHtml(params.propertyTitle);
    const safePropertyAddress = escapeHtml(params.propertyAddress);
    const safePropertyCity = escapeHtml(params.propertyCity);
    const safeSenderAvatarUrl = sanitizeUrlForHtml(params.senderAvatarUrl);
    const safePropertyImageUrl = sanitizeUrlForHtml(params.propertyImageUrl);
    const safeConversationUrl = sanitizeUrlForHtml(params.conversationUrl);
    const senderInitial = params.senderName ? escapeHtml(params.senderName.charAt(0).toUpperCase()) : '?';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">💬 New Message</h1>
    </div>

    <div style="padding: 24px;">
      <!-- Sender Info -->
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        ${safeSenderAvatarUrl
          ? `<img src="${safeSenderAvatarUrl}" alt="${safeSenderName}" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; object-fit: cover;">`
          : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); margin-right: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 18px;">${senderInitial}</div>`
        }
        <div>
          <div style="font-weight: 600; color: #374151; font-size: 16px;">${safeSenderName}</div>
          <div style="font-size: 12px; color: #6b7280;">sent you a message</div>
        </div>
      </div>

      <!-- Message Preview -->
      <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.5;">"${safeMessagePreview}"</p>
      </div>

      ${safePropertyTitle ? `
      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        ${safePropertyImageUrl ? `<img src="${safePropertyImageUrl}" alt="${safePropertyTitle}" style="width: 100%; height: 120px; object-fit: cover;">` : ''}
        <div style="padding: 12px;">
          <div style="font-weight: 600; color: #374151; font-size: 14px;">${safePropertyTitle}</div>
          <div style="font-size: 12px; color: #6b7280;">${safePropertyAddress}${safePropertyCity ? `, ${safePropertyCity}` : ''}</div>
        </div>
      </div>
      ` : ''}

      <!-- CTA -->
      <a href="${safeConversationUrl}"
         style="display: block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        Reply to Message →
      </a>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'messages', "You received this message through BalkanEstate.")}
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject: `💬 New message from ${params.senderName}${params.propertyTitle ? ` about ${params.propertyTitle}` : ''}`,
      html,
      text: `New message from ${params.senderName}: "${params.messagePreview}"`,
      category: 'inquiries',
    });
  }

  async sendWelcomeCoupon(email: string, agencyName: string, couponCode: string, expiryDate: Date): Promise<void> {
    const safeAgencyName = escapeHtml(agencyName);
    const safeCouponCode = escapeHtml(couponCode);
    const expiryDateStr = expiryDate.toLocaleDateString();
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    const html = getPromoTemplate({
      title: '1 Week FREE Featured Listing',
      subtitle: 'Welcome to BalkanEstate! Start showcasing your properties today.',
      greeting: `Hi ${safeAgencyName},`,
      bodyParagraphs: [
        'Thank you for joining BalkanEstate! To help you get started, we\'re giving you a special welcome gift.',
        `Use code <strong style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: ${BRAND_COLORS.primary};">${safeCouponCode}</strong> to get 1 week of featured listing absolutely free.`,
        `This offer is valid until ${expiryDateStr}. Don\'t miss out!`,
      ],
      ctaText: 'Claim Your Free Week',
      ctaUrl: `${frontendUrl}/dashboard/promotions?coupon=${encodeURIComponent(couponCode)}`,
      houseStyle: 'modern',
      badge: 'Welcome Gift',
    });

    await this.sendEmail({
      to: email,
      subject: `Welcome ${agencyName}! Claim Your FREE Featured Listing`,
      html,
      text: `Welcome ${agencyName}! Use coupon ${couponCode} for 1 week free featured listing. Valid until ${expiryDateStr}`,
    });
  }

  async sendExpiryReminder(email: string, agencyName: string, expiryDate: Date, couponCode: string, discount: number): Promise<void> {
    const safeAgencyName = escapeHtml(agencyName);
    const safeCouponCode = escapeHtml(couponCode);
    const expiryDateStr = expiryDate.toLocaleDateString();
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    const html = getPromoTemplate({
      title: `${discount}% OFF Renewal`,
      subtitle: 'Your featured listing expires tomorrow - renew now and save!',
      greeting: `Hi ${safeAgencyName},`,
      bodyParagraphs: [
        `Your featured listing subscription expires on <strong>${expiryDateStr}</strong>.`,
        'Don\'t lose your premium visibility! Properties with featured status get <strong>5x more views</strong> on average.',
        `Renew now with code <strong style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: ${BRAND_COLORS.primary};">${safeCouponCode}</strong> to get ${discount}% off your renewal.`,
      ],
      ctaText: `Renew & Save ${discount}%`,
      ctaUrl: `${frontendUrl}/dashboard/promotions?coupon=${encodeURIComponent(couponCode)}`,
      houseStyle: 'modern',
      badge: 'Expires Tomorrow',
      badgeColor: '#f59e0b',
    });

    await this.sendEmail({
      to: email,
      subject: `Your Featured Listing Expires Tomorrow - Save ${discount}%`,
      html,
      text: `Your listing expires ${expiryDateStr}. Use ${couponCode} for ${discount}% off renewal!`,
    });
  }

  async sendSubscriptionConfirmation(email: string, agencyName: string, details: { interval: string; price: number; endDate: Date }): Promise<void> {
    const safeAgencyName = escapeHtml(agencyName);
    const safeInterval = escapeHtml(details.interval);
    const renewsDate = details.endDate.toLocaleDateString();
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    const html = getPromoTemplate({
      title: 'Featured Listing Activated!',
      subtitle: 'Your properties now have premium visibility',
      greeting: `Hi ${safeAgencyName},`,
      bodyParagraphs: [
        'Great news! Your featured listing subscription is now active.',
        `<strong>Plan:</strong> ${safeInterval}<br><strong>Price:</strong> €${details.price}<br><strong>Renews:</strong> ${renewsDate}`,
        'Your properties will now appear at the top of search results and get up to 5x more views.',
      ],
      ctaText: 'View Your Dashboard',
      ctaUrl: `${frontendUrl}/dashboard`,
      houseStyle: 'modern',
      badge: 'Active',
      badgeColor: BRAND_COLORS.success,
    });

    await this.sendEmail({
      to: email,
      subject: `Your Featured Listing is Now Active!`,
      html,
      text: `Your subscription is active! Plan: ${details.interval}, Price: €${details.price}, Renews: ${renewsDate}`,
    });
  }

  /**
   * Send new property alert (single property)
   */
  async sendPropertyAlert(params: {
    recipientEmail: string;
    recipientName: string;
    searchName: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
      price: number;
      beds: number;
      baths: number;
      sqft: number;
      imageUrl?: string;
    };
  }): Promise<void> {
    // Check if user has opted out of property alerts
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(params.recipientEmail, 'propertyAlerts');
    if (!canSend) {
      emailLogger.info(`📧 Skipping property alert to ${params.recipientEmail} - user unsubscribed`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    // Sanitize all user inputs
    const safeRecipientName = escapeHtml(params.recipientName);
    const safeSearchName = escapeHtml(params.searchName);
    const safeTitle = escapeHtml(params.property.title);
    const safeAddress = escapeHtml(params.property.address);
    const safeCity = escapeHtml(params.property.city);
    const safePropertyId = encodeURIComponent(params.property.id);
    const safeImageUrl = sanitizeUrlForHtml(params.property.imageUrl);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    New listing in ${safeCity}! ${safeTitle} for €${params.property.price.toLocaleString()} - matches your "${safeSearchName}" search.
  </div>

  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header with urgency -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 24px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 12px; font-weight: 600;">✨ JUST LISTED</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">New Property Match!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px;">From your search: "${safeSearchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
        Hey <strong>${safeRecipientName}</strong>! We found something you might love:
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
        ${safeImageUrl ? `<img src="${safeImageUrl}" alt="${safeTitle}" style="width: 100%; height: 180px; object-fit: cover;">` : '<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 48px;">🏠</span></div>'}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 6px;">${safeTitle}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">📍 ${safeAddress}, ${safeCity}</div>
          <div style="font-size: 28px; font-weight: 700; color: #059669; margin-bottom: 14px;">€${params.property.price.toLocaleString()}</div>
          <div style="display: table; width: 100%; background: #f9fafb; border-radius: 8px; padding: 10px;">
            <div style="display: table-row;">
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.beds}</div>
                <div style="font-size: 11px; color: #6b7280;">Beds</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.baths}</div>
                <div style="font-size: 11px; color: #6b7280;">Baths</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.sqft.toLocaleString()}</div>
                <div style="font-size: 11px; color: #6b7280;">Sqft</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Urgency note -->
      <div style="background: #fffbeb; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          ⚡ <strong>Hot properties go fast!</strong> Be the first to schedule a viewing.
        </p>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${safePropertyId}"
         style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        View Property Details →
      </a>

      <!-- Secondary action -->
      <p style="text-align: center; margin: 16px 0 0 0;">
        <a href="${frontendUrl}/saved-searches" style="color: #6b7280; font-size: 13px; text-decoration: none;">Manage your alerts →</a>
      </p>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'propertyAlerts', `Alert from your saved search: "${safeSearchName}"`)}
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject: `Just listed in ${params.property.city}: ${params.property.title} - €${params.property.price.toLocaleString()}`,
      html,
      text: `Hey ${params.recipientName}!\n\nNew property match for "${params.searchName}"!\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n€${params.property.price.toLocaleString()}\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nHot properties go fast! View details: ${frontendUrl}/property/${safePropertyId}\n\n© ${new Date().getFullYear()} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send new listings digest (multiple properties)
   */
  async sendNewListingsDigest(params: {
    recipientEmail: string;
    recipientName: string;
    searchName: string;
    properties: Array<{
      id: string;
      title: string;
      address: string;
      city: string;
      price: number;
      beds: number;
      baths: number;
      sqft: number;
      imageUrl?: string;
    }>;
    frequency: 'instant' | 'daily' | 'weekly';
  }): Promise<void> {
    // Check if user has opted out of property alerts
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(params.recipientEmail, 'propertyAlerts');
    if (!canSend) {
      emailLogger.info(`📧 Skipping listings digest to ${params.recipientEmail} - user unsubscribed`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const frequencyLabel = params.frequency === 'daily' ? 'Daily' : params.frequency === 'weekly' ? 'Weekly' : '';

    // Sanitize user inputs
    const safeRecipientName = escapeHtml(params.recipientName);
    const safeSearchName = escapeHtml(params.searchName);

    const propertyCards = params.properties.slice(0, 5).map(p => {
      const safeTitle = escapeHtml(p.title);
      const safeCity = escapeHtml(p.city);
      const safeImageUrl = sanitizeUrlForHtml(p.imageUrl);
      return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
        <div style="display: flex;">
          ${safeImageUrl ? `<img src="${safeImageUrl}" alt="${safeTitle}" style="width: 100px; height: 80px; object-fit: cover;">` : '<div style="width: 100px; height: 80px; background: #e5e7eb;"></div>'}
          <div style="padding: 10px; flex: 1;">
            <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 2px;">${safeTitle}</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${safeCity}</div>
            <div style="font-size: 14px; font-weight: 700; color: #059669;">€${p.price.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">🏠 ${params.properties.length} New Properties!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px;">${frequencyLabel} update for "${safeSearchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>${safeRecipientName}</strong>, we found ${params.properties.length} new properties matching your search!
      </p>

      <!-- Property Cards -->
      ${propertyCards}

      ${params.properties.length > 5 ? `<p style="color: #6b7280; font-size: 13px; text-align: center; margin: 12px 0;">+${params.properties.length - 5} more properties</p>` : ''}

      <!-- CTA -->
      <a href="${frontendUrl}/search"
         style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        View All Properties →
      </a>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'propertyAlerts', `You're receiving this because you have alerts enabled for "${safeSearchName}"`)}
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject: `🏠 ${params.properties.length} new properties match "${params.searchName}"`,
      html,
      text: `${params.properties.length} new properties match your saved search "${params.searchName}"`,
      category: 'alerts',
    });
  }

  /**
   * Send price drop alert
   */
  async sendPriceDropAlert(params: {
    recipientEmail: string;
    recipientName: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
      previousPrice: number;
      newPrice: number;
      percentageDrop: number;
      isPriceIncrease?: boolean;
      beds: number;
      baths: number;
      sqft: number;
      imageUrl?: string;
    };
  }): Promise<void> {
    // Check if user has opted out of price drop alerts
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(params.recipientEmail, 'priceDrops');
    if (!canSend) {
      emailLogger.info(`📧 Skipping price change alert to ${params.recipientEmail} - user unsubscribed`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const isIncrease = !!params.property.isPriceIncrease;
    const priceDiff = Math.abs(params.property.previousPrice - params.property.newPrice);

    // Dynamic content based on direction
    const headerGradient = isIncrease
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    const badgeText = isIncrease
      ? `📈 ${params.property.percentageDrop}% UP`
      : `🔥 ${params.property.percentageDrop}% OFF`;
    const headlineText = isIncrease ? 'Price Just Increased' : 'Price Just Dropped!';
    const subHeadline = isIncrease
      ? `Up by €${priceDiff.toLocaleString()}`
      : `Save €${priceDiff.toLocaleString()}`;
    const subHeadlineColor = isIncrease ? '#fde68a' : '#fecaca';
    const introText = isIncrease
      ? `Heads up, <strong>${params.recipientName}</strong>! A property you saved just went up in price:`
      : `Great news, <strong>${params.recipientName}</strong>! A property you saved just became more affordable:`;
    const priceBoxBg = isIncrease
      ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
    const nowColor = isIncrease ? '#d97706' : '#059669';
    const arrowColor = isIncrease ? '#f59e0b' : '#ef4444';
    const urgencyBg = isIncrease ? '#fef3c7' : '#fffbeb';
    const urgencyColor = isIncrease ? '#92400e' : '#92400e';
    const urgencyText = isIncrease
      ? '⚠️ <strong>Act now before the price rises further.</strong>'
      : '⚡ <strong>Price drops attract buyers fast.</strong> Don\'t miss this opportunity!';
    const ctaText = isIncrease
      ? `View Property - Now €${params.property.newPrice.toLocaleString()} →`
      : `Claim This Deal - Save €${priceDiff.toLocaleString()} →`;
    const ctaGradient = headerGradient;
    const ctaShadow = isIncrease
      ? '0 4px 14px rgba(245, 158, 11, 0.4)'
      : '0 4px 14px rgba(239, 68, 68, 0.4)';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${isIncrease ? `Price up ${params.property.percentageDrop}%!` : `Save €${priceDiff.toLocaleString()}!`} ${params.property.title} - now €${params.property.newPrice.toLocaleString()}
  </div>

  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: ${headerGradient}; padding: 32px 24px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 14px; font-weight: 700;">${badgeText}</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">${headlineText}</h1>
      <p style="color: ${subHeadlineColor}; margin: 12px 0 0 0; font-size: 18px; font-weight: 600;">${subHeadline}</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
        ${introText}
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
        ${params.property.imageUrl ? `<img src="${params.property.imageUrl}" alt="${params.property.title}" style="width: 100%; height: 180px; object-fit: cover;">` : '<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 48px;">🏠</span></div>'}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 6px;">${params.property.title}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">📍 ${params.property.address}, ${params.property.city}</div>

          <!-- Price comparison -->
          <div style="background: ${priceBoxBg}; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Was</div>
                <div style="font-size: 18px; color: #9ca3af; text-decoration: line-through;">€${params.property.previousPrice.toLocaleString()}</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 20%; vertical-align: middle;">
                <div style="font-size: 24px; color: ${arrowColor};">→</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: ${nowColor}; text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Now</div>
                <div style="font-size: 24px; font-weight: 700; color: ${nowColor};">€${params.property.newPrice.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <!-- Property specs -->
          <div style="display: table; width: 100%; background: #f9fafb; border-radius: 8px; padding: 10px;">
            <div style="display: table-row;">
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.beds}</div>
                <div style="font-size: 11px; color: #6b7280;">Beds</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.baths}</div>
                <div style="font-size: 11px; color: #6b7280;">Baths</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.sqft.toLocaleString()}</div>
                <div style="font-size: 11px; color: #6b7280;">Sqft</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Urgency message -->
      <div style="background: ${urgencyBg}; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
        <p style="color: ${urgencyColor}; font-size: 13px; margin: 0;">
          ${urgencyText}
        </p>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${params.property.id}"
         style="display: block; background: ${ctaGradient}; color: #ffffff; text-decoration: none; padding: 16px; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: ${ctaShadow};">
        ${ctaText}
      </a>

      <!-- Secondary action -->
      <p style="text-align: center; margin: 16px 0 0 0;">
        <a href="${frontendUrl}/saved" style="color: #6b7280; font-size: 13px; text-decoration: none;">View all saved properties →</a>
      </p>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'priceDrops', "You saved this property and enabled price alerts")}
  </div>
</body>
</html>`;

    const subject = isIncrease
      ? `Price increased ${params.property.percentageDrop}% on ${params.property.title}`
      : `Price dropped ${params.property.percentageDrop}%! Save €${priceDiff.toLocaleString()} on ${params.property.title}`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject,
      html,
      text: isIncrease
        ? `Heads up, ${params.recipientName}!\n\nA property you saved just went up in price.\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n\nWas: €${params.property.previousPrice.toLocaleString()}\nNow: €${params.property.newPrice.toLocaleString()}\nIncrease: €${priceDiff.toLocaleString()} (${params.property.percentageDrop}% up)\n\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nAct now before the price rises further.\n\nView property: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} BalkanEstate`
        : `Great news, ${params.recipientName}!\n\nA property you saved just dropped in price!\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n\nWas: €${params.property.previousPrice.toLocaleString()}\nNow: €${params.property.newPrice.toLocaleString()}\nYou save: €${priceDiff.toLocaleString()} (${params.property.percentageDrop}% off)\n\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nPrice drops attract buyers fast. Don't miss this opportunity!\n\nView property: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} BalkanEstate`,
      category: 'alerts',
    });
  }

  /**
   * Send price change alert for a property that matches a saved search
   * Similar to sendPriceDropAlert but includes the saved search context
   */
  async sendSavedSearchPriceDropAlert(params: {
    recipientEmail: string;
    recipientName: string;
    searchName: string;
    property: {
      id: string;
      title: string;
      address: string;
      city: string;
      previousPrice: number;
      newPrice: number;
      percentageDrop: number;
      isPriceIncrease?: boolean;
      beds: number;
      baths: number;
      sqft: number;
      imageUrl?: string;
    };
  }): Promise<void> {
    // Check if user has opted out of price drop alerts
    const { token: unsubscribeToken, canSend } = await this.getUnsubscribeInfo(params.recipientEmail, 'priceDrops');
    if (!canSend) {
      emailLogger.info(`📧 Skipping saved search price change alert to ${params.recipientEmail} - user unsubscribed`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const isIncrease = !!params.property.isPriceIncrease;
    const priceDiff = Math.abs(params.property.previousPrice - params.property.newPrice);

    // Sanitize inputs
    const safeRecipientName = escapeHtml(params.recipientName);
    const safeSearchName = escapeHtml(params.searchName);
    const safeTitle = escapeHtml(params.property.title);
    const safeAddress = escapeHtml(params.property.address);
    const safeCity = escapeHtml(params.property.city);
    const safePropertyId = encodeURIComponent(params.property.id);
    const safeImageUrl = sanitizeUrlForHtml(params.property.imageUrl);

    // Dynamic content based on direction
    const headerGradient = isIncrease
      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    const badgeText = isIncrease
      ? `📈 ${params.property.percentageDrop}% UP`
      : `🔥 ${params.property.percentageDrop}% OFF`;
    const headlineText = isIncrease ? 'Price Just Increased' : 'Price Just Dropped!';
    const subHeadline = isIncrease
      ? `Up by €${priceDiff.toLocaleString()}`
      : `Save €${priceDiff.toLocaleString()}`;
    const subHeadlineColor = isIncrease ? '#fde68a' : '#fecaca';
    const introText = isIncrease
      ? `Heads up, <strong>${safeRecipientName}</strong>! A property matching your saved search just went up in price:`
      : `Great news, <strong>${safeRecipientName}</strong>! A property matching your saved search just became more affordable:`;
    const priceBoxBg = isIncrease
      ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
    const nowColor = isIncrease ? '#d97706' : '#059669';
    const arrowColor = isIncrease ? '#f59e0b' : '#ef4444';
    const urgencyBg = isIncrease ? '#fef3c7' : '#fffbeb';
    const urgencyColor = isIncrease ? '#92400e' : '#92400e';
    const urgencyText = isIncrease
      ? '⚠️ <strong>Act now before the price rises further.</strong>'
      : '⚡ <strong>Price drops attract buyers fast.</strong> Don\'t miss this opportunity!';
    const ctaText = isIncrease
      ? `View Property - Now €${params.property.newPrice.toLocaleString()} →`
      : `Claim This Deal - Save €${priceDiff.toLocaleString()} →`;
    const ctaShadow = isIncrease
      ? '0 4px 14px rgba(245, 158, 11, 0.4)'
      : '0 4px 14px rgba(239, 68, 68, 0.4)';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${isIncrease ? `Price up ${params.property.percentageDrop}%!` : `Save €${priceDiff.toLocaleString()}!`} ${safeTitle} - now €${params.property.newPrice.toLocaleString()} (from "${safeSearchName}")
  </div>

  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: ${headerGradient}; padding: 32px 24px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 14px; font-weight: 700;">${badgeText}</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">${headlineText}</h1>
      <p style="color: ${subHeadlineColor}; margin: 12px 0 0 0; font-size: 18px; font-weight: 600;">${subHeadline}</p>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0; font-size: 13px;">From your search: "${safeSearchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
        ${introText}
      </p>

      <!-- Saved Search Context -->
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px;">
        <p style="color: #0369a1; font-size: 12px; margin: 0; font-weight: 600;">
          🔍 Saved Search: "${safeSearchName}"
        </p>
      </div>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
        ${safeImageUrl ? `<img src="${safeImageUrl}" alt="${safeTitle}" style="width: 100%; height: 180px; object-fit: cover;">` : '<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 48px;">🏠</span></div>'}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 6px;">${safeTitle}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">📍 ${safeAddress}, ${safeCity}</div>

          <!-- Price comparison -->
          <div style="background: ${priceBoxBg}; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Was</div>
                <div style="font-size: 18px; color: #9ca3af; text-decoration: line-through;">€${params.property.previousPrice.toLocaleString()}</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 20%; vertical-align: middle;">
                <div style="font-size: 24px; color: ${arrowColor};">→</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: ${nowColor}; text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Now</div>
                <div style="font-size: 24px; font-weight: 700; color: ${nowColor};">€${params.property.newPrice.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <!-- Property specs -->
          <div style="display: table; width: 100%; background: #f9fafb; border-radius: 8px; padding: 10px;">
            <div style="display: table-row;">
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.beds}</div>
                <div style="font-size: 11px; color: #6b7280;">Beds</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.baths}</div>
                <div style="font-size: 11px; color: #6b7280;">Baths</div>
              </div>
              <div style="display: table-cell; text-align: center; padding: 4px;">
                <div style="font-size: 16px; font-weight: 600; color: #374151;">${params.property.sqft.toLocaleString()}</div>
                <div style="font-size: 11px; color: #6b7280;">Sqft</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Urgency message -->
      <div style="background: ${urgencyBg}; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
        <p style="color: ${urgencyColor}; font-size: 13px; margin: 0;">
          ${urgencyText}
        </p>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${safePropertyId}"
         style="display: block; background: ${headerGradient}; color: #ffffff; text-decoration: none; padding: 16px; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: ${ctaShadow};">
        ${ctaText}
      </a>

      <!-- Secondary action -->
      <p style="text-align: center; margin: 16px 0 0 0;">
        <a href="${frontendUrl}/saved-searches" style="color: #6b7280; font-size: 13px; text-decoration: none;">Manage your saved searches →</a>
      </p>
    </div>

    ${this.generateEmailFooter(unsubscribeToken, 'priceDrops', `Alert from your saved search: "${safeSearchName}"`)}
  </div>
</body>
</html>`;

    const subject = isIncrease
      ? `Price up ${params.property.percentageDrop}% on ${params.property.title} (from "${params.searchName}")`
      : `Price dropped ${params.property.percentageDrop}%! Save €${priceDiff.toLocaleString()} on ${params.property.title}`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject,
      html,
      text: isIncrease
        ? `Heads up, ${params.recipientName}!\n\nA property matching your saved search "${params.searchName}" just went up in price.\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n\nWas: €${params.property.previousPrice.toLocaleString()}\nNow: €${params.property.newPrice.toLocaleString()}\nIncrease: €${priceDiff.toLocaleString()} (${params.property.percentageDrop}% up)\n\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nAct now before the price rises further.\n\nView property: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} BalkanEstateᴬᴵ`
        : `Great news, ${params.recipientName}!\n\nA property matching your saved search "${params.searchName}" just dropped in price!\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n\nWas: €${params.property.previousPrice.toLocaleString()}\nNow: €${params.property.newPrice.toLocaleString()}\nYou save: €${priceDiff.toLocaleString()} (${params.property.percentageDrop}% off)\n\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nPrice drops attract buyers fast. Don't miss this opportunity!\n\nView property: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send subscription renewal reminder (for non-auto-renewing subscriptions)
   */
  async sendSubscriptionRenewalReminder(email: string, userName: string, expiryDate: Date, planName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Subscription Expiring Soon</h1>
          <p>Hi ${userName},</p>
          <p>Your <strong>${planName}</strong> subscription will expire on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
          <p>Don't lose access to your premium features! Renew your subscription to continue enjoying:</p>
          <ul>
            <li>Unlimited saved searches</li>
            <li>Priority property notifications</li>
            <li>Market insights and analytics</li>
            <li>Ad-free experience</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="${frontendUrl}/account" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Renew Subscription</a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you have any questions, please contact our support team.
          </p>
        </body>
      </html>
    `;
    await this.sendEmail({
      to: email,
      subject: `Your ${planName} subscription expires soon`,
      html,
      text: `Hi ${userName}, your ${planName} subscription expires on ${expiryDate.toLocaleDateString()}. Renew at ${frontendUrl}/account`,
    });
  }

  /**
   * Send auto-renewal reminder (7 days before renewal for auto-renewing subscriptions)
   */
  async sendAutoRenewalReminder(email: string, userName: string, renewalDate: Date, planName: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const formattedDate = renewalDate.toLocaleDateString();

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="width: 60px; height: 60px; background-color: #eff6ff; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <span style="font-size: 28px;">🔔</span>
              </div>
              <h1 style="color: #1e40af; margin: 0 0 8px 0; font-size: 24px;">Subscription Renewal Notice</h1>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">7 days until your renewal</p>
            </div>

            <!-- Main Content -->
            <p style="color: #374151;">Hi ${userName},</p>
            <p style="color: #374151;">
              This is a friendly reminder that your <strong>${planName}</strong> subscription will automatically renew on <strong>${formattedDate}</strong>.
            </p>

            <!-- Info Box -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">What happens next?</h3>
              <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Your payment method will be charged on ${formattedDate}</li>
                <li>Your subscription will continue uninterrupted</li>
                <li>You'll receive an invoice/receipt via email</li>
              </ul>
            </div>

            <!-- Don't want to renew? -->
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>Don't want to renew?</strong> You can cancel your subscription anytime from your account settings. Your access will continue until the end of the current billing period.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${frontendUrl}/account" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Manage Subscription</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 24px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Questions? Contact us at <a href="mailto:support@balkanestate.com" style="color: #2563eb;">support@balkanestate.com</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Upcoming renewal: Your ${planName} subscription renews on ${formattedDate}`,
      html,
      text: `Hi ${userName}, your ${planName} subscription will automatically renew on ${formattedDate}. If you don't want to renew, you can cancel from your account settings at ${frontendUrl}/account. Your access will continue until the end of your current billing period.`,
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(email: string, userName: string, details: {
    planName: string;
    amount: number;
    currency: string;
    expiresAt: Date;
    transactionId?: string;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a;">Payment Confirmed!</h1>
          <p>Hi ${userName},</p>
          <p>Thank you for your payment. Your subscription is now active.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <p><strong>Plan:</strong> ${details.planName}</p>
            <p><strong>Amount:</strong> ${details.currency}${details.amount.toFixed(2)}</p>
            <p><strong>Valid Until:</strong> ${details.expiresAt.toLocaleDateString()}</p>
            ${details.transactionId ? `<p><strong>Transaction ID:</strong> ${details.transactionId}</p>` : ''}
          </div>
          <p>You now have access to all premium features. Enjoy!</p>
          <p style="margin-top: 20px;">
            <a href="${frontendUrl}/account" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Go to My Account</a>
          </p>
        </body>
      </html>
    `;
    await this.sendEmail({
      to: email,
      subject: `Payment confirmed - ${details.planName} subscription active`,
      html,
      text: `Payment confirmed! ${details.planName} subscription active until ${details.expiresAt.toLocaleDateString()}. Amount: ${details.currency}${details.amount.toFixed(2)}`,
    });
  }

  /**
   * Send subscription cancelled notification
   */
  async sendSubscriptionCancelled(email: string, userName: string, details: {
    planName: string;
    expiresAt: Date;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #dc2626;">Subscription Cancelled</h1>
          <p>Hi ${userName},</p>
          <p>We're sorry to see you go. Your <strong>${details.planName}</strong> subscription has been cancelled.</p>
          <p>You'll continue to have access to premium features until <strong>${details.expiresAt.toLocaleDateString()}</strong>.</p>
          <p>Changed your mind? You can resubscribe anytime to regain access to:</p>
          <ul>
            <li>Unlimited saved searches</li>
            <li>Priority property notifications</li>
            <li>Market insights and analytics</li>
            <li>Ad-free experience</li>
          </ul>
          <p style="margin-top: 20px;">
            <a href="${frontendUrl}/account" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Resubscribe</a>
          </p>
        </body>
      </html>
    `;
    await this.sendEmail({
      to: email,
      subject: `Subscription cancelled - access until ${details.expiresAt.toLocaleDateString()}`,
      html,
      text: `Your ${details.planName} subscription has been cancelled. Access continues until ${details.expiresAt.toLocaleDateString()}.`,
    });
  }

  /**
   * Send subscription invoice with full details including auto-renewal info
   */
  async sendSubscriptionInvoice(email: string, userName: string, details: {
    planName: string;
    amount: number;
    currency: string;
    billingPeriod: string;
    orderId: string;
    subscriptionStartDate: Date;
    nextBillingDate: Date;
    autoRenewing: boolean;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const currencySymbol = details.currency === 'EUR' ? '€' : details.currency;
    const billingText = details.billingPeriod === 'yearly' ? 'year' : 'month';
    const renewalDate = new Date(details.nextBillingDate);

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin-bottom: 10px;">Invoice & Receipt</h1>
              <p style="color: #6b7280; font-size: 14px;">Thank you for subscribing to BalkanEstate</p>
            </div>

            <!-- Invoice Details Box -->
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">#${details.orderId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Plan:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${details.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Billing Period:</td>
                  <td style="padding: 8px 0; text-align: right;">${details.billingPeriod === 'yearly' ? 'Annual' : 'Monthly'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Start Date:</td>
                  <td style="padding: 8px 0; text-align: right;">${details.subscriptionStartDate.toLocaleDateString()}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 0 8px 0; color: #111827; font-weight: bold; font-size: 18px;">Amount Paid:</td>
                  <td style="padding: 16px 0 8px 0; text-align: right; font-weight: bold; font-size: 18px; color: #16a34a;">${currencySymbol}${details.amount.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <!-- Auto-Renewal Notice -->
            ${details.autoRenewing ? `
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0; font-size: 14px;">Auto-Renewal Information</h3>
              <p style="color: #1e3a8a; font-size: 13px; margin-bottom: 8px;">
                Your subscription will automatically renew on <strong>${renewalDate.toLocaleDateString()}</strong>.
              </p>
              <ul style="color: #1e3a8a; font-size: 12px; margin: 0; padding-left: 20px;">
                <li>You will be charged <strong>${currencySymbol}${details.amount.toFixed(2)}/${billingText}</strong></li>
                <li>We'll send you a reminder email 7 days before renewal</li>
                <li>You can cancel anytime from your account settings</li>
              </ul>
            </div>
            ` : `
            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #92400e; font-size: 13px; margin: 0;">
                Your subscription is set to expire on <strong>${renewalDate.toLocaleDateString()}</strong>.
                Visit your account to enable auto-renewal if you'd like to continue your subscription.
              </p>
            </div>
            `}

            <!-- What's Included -->
            <div style="margin: 24px 0;">
              <h3 style="color: #111827; font-size: 16px; margin-bottom: 12px;">What's Included:</h3>
              <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>Premium property listings</li>
                <li>Priority in search results</li>
                <li>Unlimited saved searches</li>
                <li>AI-powered property insights</li>
                <li>Advanced analytics dashboard</li>
                <li>Priority customer support</li>
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}/account" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Go to My Account</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">
                This receipt was sent to ${email}
              </p>
              <p style="color: #9ca3af; font-size: 11px;">
                Questions? Contact us at <a href="mailto:support@balkanestate.com" style="color: #2563eb;">support@balkanestate.com</a>
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin-top: 12px;">
                BalkanEstate • Secure Payment Processing
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `Invoice #${details.orderId} - ${details.planName} Subscription`,
      html,
      text: `Invoice #${details.orderId}\n\nThank you for subscribing to ${details.planName}!\n\nAmount: ${currencySymbol}${details.amount.toFixed(2)}\nBilling: ${details.billingPeriod}\n${details.autoRenewing ? `Next renewal: ${renewalDate.toLocaleDateString()}\n\nYour subscription will automatically renew. You'll receive a reminder 7 days before.` : `Expires: ${renewalDate.toLocaleDateString()}`}\n\nManage your subscription at ${frontendUrl}/account`,
    });
  }

  /**
   * Send refund notification
   */
  async sendRefundNotification(email: string, userName: string, details: {
    amount: number;
    currency: string;
    reason?: string;
    transactionId?: string;
  }): Promise<void> {
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Refund Processed</h1>
          <p>Hi ${userName},</p>
          <p>Your refund has been processed.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Refund Details</h3>
            <p><strong>Amount:</strong> ${details.currency}${details.amount.toFixed(2)}</p>
            ${details.reason ? `<p><strong>Reason:</strong> ${details.reason}</p>` : ''}
            ${details.transactionId ? `<p><strong>Transaction ID:</strong> ${details.transactionId}</p>` : ''}
          </div>
          <p>The refund should appear in your account within 5-10 business days, depending on your payment method.</p>
          <p>If you have any questions, please contact our support team.</p>
        </body>
      </html>
    `;
    await this.sendEmail({
      to: email,
      subject: `Refund processed - ${details.currency}${details.amount.toFixed(2)}`,
      html,
      text: `Refund processed: ${details.currency}${details.amount.toFixed(2)}. Should appear in 5-10 business days.`,
    });
  }

  /**
   * Send agent inquiry - forwards buyer inquiries to agents
   */
  async sendAgentInquiry(params: {
    agentEmail: string;
    agentName: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone?: string;
    message: string;
    propertyTitle?: string;
    propertyId?: string;
    location?: string;
    inquiryType: 'property' | 'general' | 'area_search';
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';

    // Sanitize all user inputs - critical for preventing XSS attacks
    const safeAgentName = escapeHtml(params.agentName);
    const safeBuyerName = escapeHtml(params.buyerName);
    const safeBuyerEmail = escapeHtml(params.buyerEmail);
    const safeBuyerPhone = escapeHtml(params.buyerPhone);
    const safeMessage = escapeHtml(params.message);
    const safePropertyTitle = escapeHtml(params.propertyTitle);
    const safeLocation = escapeHtml(params.location);
    const safePropertyId = params.propertyId ? encodeURIComponent(params.propertyId) : '';

    const inquiryTypeLabels: Record<string, string> = {
      property: 'Property Inquiry',
      general: 'General Inquiry',
      area_search: 'Area Search Request',
    };

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">📨 New ${inquiryTypeLabels[params.inquiryType]}</h1>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>${safeAgentName}</strong>, you've received a new inquiry!
      </p>

      <!-- Buyer Info Card -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">👤 From:</div>
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${safeBuyerName}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
          📧 <a href="mailto:${safeBuyerEmail}" style="color: #7c3aed;">${safeBuyerEmail}</a>
        </div>
        ${safeBuyerPhone ? `<div style="font-size: 14px; color: #6b7280; margin-top: 4px;">📱 ${safeBuyerPhone}</div>` : ''}
      </div>

      ${safePropertyTitle ? `
      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">🏠 Property:</div>
        <div style="font-size: 14px; color: #1f2937;">${safePropertyTitle}</div>
        ${safeLocation ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">📍 ${safeLocation}</div>` : ''}
        ${safePropertyId ? `<a href="${frontendUrl}/property/${safePropertyId}" style="display: inline-block; margin-top: 8px; font-size: 12px; color: #7c3aed;">View Property →</a>` : ''}
      </div>
      ` : ''}

      ${safeLocation && !safePropertyTitle ? `
      <!-- Area Search Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">📍 Area of Interest:</div>
        <div style="font-size: 14px; color: #1f2937;">${safeLocation}</div>
      </div>
      ` : ''}

      <!-- Message Card -->
      <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">💬 Message:</div>
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6; white-space: pre-wrap;">${safeMessage}</p>
      </div>

      <!-- Reply CTA -->
      <a href="mailto:${safeBuyerEmail}?subject=Re: ${safePropertyTitle ? `Inquiry about ${safePropertyTitle}` : 'Your BalkanEstateᴬᴵ Inquiry'}"
         style="display: block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        Reply to ${safeBuyerName} →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        This inquiry was sent through BalkanEstate<sup>AI</sup>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} BalkanEstate<sup>AI</sup>
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.agentEmail,
      subject: `📨 New inquiry from ${params.buyerName}${params.propertyTitle ? ` about ${params.propertyTitle}` : ''}`,
      html,
      text: `New inquiry from ${params.buyerName} (${params.buyerEmail}): ${params.message}`,
      category: 'inquiries',
    });
  }

  /**
   * Send password reset email (uses noreply address)
   */
  async sendPasswordResetEmail(params: {
    email: string;
    userName: string;
    resetUrl: string;
  }): Promise<void> {
    // Sanitize user inputs
    const safeUserName = escapeHtml(params.userName);
    const safeResetUrl = sanitizeUrlForHtml(params.resetUrl);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Reset your password to get back to finding your dream property. Link expires in 1 hour.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; line-height: 60px; font-size: 28px;">🔐</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Password Reset</h1>
      <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">Let's get you back into your account</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hey ${safeUserName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset your password. No worries—it happens to the best of us! Click the button below to create a new password:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${safeResetUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.4);">
          Reset My Password
        </a>
      </div>

      <!-- Security notice -->
      <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <div style="display: table; width: 100%;">
          <div style="display: table-cell; width: 40px; vertical-align: top;">
            <span style="font-size: 20px;">⚠️</span>
          </div>
          <div style="display: table-cell; vertical-align: top;">
            <p style="color: #991b1b; font-size: 13px; margin: 0 0 4px 0; font-weight: 600;">Security Notice</p>
            <p style="color: #7f1d1d; font-size: 13px; margin: 0; line-height: 1.5;">
              This link expires in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email—your password won't change.
            </p>
          </div>
        </div>
      </div>

      <!-- Link fallback -->
      <p style="color: #6b7280; font-size: 12px; margin: 20px 0 8px 0;">
        Button not working? Copy and paste this link:
      </p>
      <div style="word-break: break-all; color: #0252CD; font-size: 12px; background: #f3f4f6; padding: 12px; border-radius: 8px; border: 1px dashed #d1d5db;">
        ${safeResetUrl}
      </div>

      <!-- Tips -->
      <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #0369a1; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">💡 Password tips:</p>
        <ul style="color: #374151; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Use at least 8 characters</li>
          <li>Mix uppercase, lowercase, and numbers</li>
          <li>Avoid using common words or personal info</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} BalkanEstate<sup>AI</sup> · Your security is our priority
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: 'Reset your BalkanEstateᴬᴵ password',
      html,
      text: `Hey ${params.userName},\n\nWe received a request to reset your password. No worries—it happens to the best of us!\n\nReset your password here:\n${params.resetUrl}\n\nThis link expires in 1 hour.\n\nPassword tips:\n- Use at least 8 characters\n- Mix uppercase, lowercase, and numbers\n- Avoid using common words or personal info\n\nIf you didn't request this reset, you can safely ignore this email.\n\nNeed help? Contact us at support@balkanestateai.com\n\n© ${new Date().getFullYear()} BalkanEstate<sup>AI</sup>`,
      category: 'noreply',
    });
  }

  /**
   * Send email verification email (uses noreply address)
   */
  async sendEmailVerification(params: {
    email: string;
    userName: string;
    verificationUrl: string;
  }): Promise<void> {
    // Sanitize user inputs
    const safeUserName = escapeHtml(params.userName);
    const safeVerificationUrl = sanitizeUrlForHtml(params.verificationUrl);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 14px 32px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    One click away from finding your dream property in the Balkans! Verify your email to get started.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header with Logo -->
    <div style="background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 16px; line-height: 60px; font-size: 32px;">🏠</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to BalkanEstate<sup>AI</sup>!</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 15px;">Your journey to the perfect property starts here</p>
    </div>

    <div style="padding: 32px 24px;">
      <!-- Personalized greeting -->
      <p style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">
        Hey ${safeUserName}! 👋
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Thanks for joining BalkanEstate<sup>AI</sup>! We're excited to help you discover amazing properties across the Balkans. Just one quick step to get started:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${safeVerificationUrl}"
           class="button"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.4); transition: transform 0.2s;">
          ✓ Verify My Email
        </a>
      </div>

      <!-- What's next section -->
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin: 28px 0;">
        <p style="color: #0369a1; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">✨ Once verified, you can:</p>
        <div style="display: table; width: 100%;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 6px 0; color: #374151; font-size: 14px;">
              <span style="margin-right: 8px;">🔍</span> Search thousands of properties
            </div>
          </div>
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 6px 0; color: #374151; font-size: 14px;">
              <span style="margin-right: 8px;">❤️</span> Save your favorite listings
            </div>
          </div>
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 6px 0; color: #374151; font-size: 14px;">
              <span style="margin-right: 8px;">🔔</span> Get alerts for new matches
            </div>
          </div>
          <div style="display: table-row;">
            <div style="display: table-cell; padding: 6px 0; color: #374151; font-size: 14px;">
              <span style="margin-right: 8px;">💬</span> Message agents directly
            </div>
          </div>
        </div>
      </div>

      <!-- Link fallback -->
      <p style="color: #6b7280; font-size: 12px; margin: 20px 0 8px 0;">
        Button not working? Copy and paste this link:
      </p>
      <div style="word-break: break-all; color: #0252CD; font-size: 12px; background: #f3f4f6; padding: 12px; border-radius: 8px; border: 1px dashed #d1d5db;">
        ${params.verificationUrl}
      </div>

      <!-- Expiry notice -->
      <div style="background: #fffbeb; border-radius: 8px; padding: 12px 16px; margin: 24px 0; display: table; width: 100%;">
        <div style="display: table-cell; vertical-align: middle; width: 30px;">
          <span style="font-size: 18px;">⏰</span>
        </div>
        <div style="display: table-cell; vertical-align: middle;">
          <p style="color: #92400e; font-size: 13px; margin: 0;">
            <strong>Heads up:</strong> This link expires in 24 hours for security.
          </p>
        </div>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        Didn't sign up for BalkanEstate<sup>AI</sup>? No worries—just ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Questions? We're here to help at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: 'Verify your email to start exploring properties 🏠',
      html,
      text: `Hey ${params.userName}!\n\nWelcome to BalkanEstateᴬᴵ! We're excited to help you discover amazing properties across the Balkans.\n\nVerify your email to get started:\n${params.verificationUrl}\n\nOnce verified, you can:\n- Search thousands of properties\n- Save your favorite listings\n- Get alerts for new matches\n- Message agents directly\n\nThis link expires in 24 hours.\n\nQuestions? Contact us at support@balkanestateai.com\n\n© ${new Date().getFullYear()} BalkanEstateᴬᴵ`,
      category: 'noreply',
    });
  }

  /**
   * Send welcome email after verification (uses support address)
   */
  async sendWelcomeEmail(params: {
    email: string;
    userName: string;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 16px 48px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Welcome to BalkanEstateᴬᴵ! Your gateway to properties across 8 Balkan countries. Search, save, compare, and connect with agents.
  </div>

  <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff;">
    <!-- Professional Header -->
    <div style="background: linear-gradient(135deg, #0252CD 0%, #1e40af 50%, #0369a1 100%); padding: 48px 32px; text-align: center;">
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background: rgba(255,255,255,0.15); border-radius: 16px; padding: 12px 20px;">
          <span style="font-size: 32px; vertical-align: middle;">🏠</span>
          <span style="color: #ffffff; font-size: 24px; font-weight: 700; vertical-align: middle; margin-left: 8px;">BalkanEstate<sup>AI</sup></span>
        </div>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Welcome, ${params.userName}!</h1>
      <p style="color: #bfdbfe; margin: 12px 0 0 0; font-size: 16px;">Your account is verified and ready to explore</p>
    </div>

    <!-- Main Content -->
    <div style="padding: 40px 32px;">

      <!-- Introduction -->
      <p style="color: #374151; font-size: 16px; line-height: 1.7; margin: 0 0 24px 0;">
        Thank you for joining <strong>BalkanEstate<sup>AI</sup></strong> — the premier real estate platform connecting buyers, sellers, and agents across the Balkans. Whether you're searching for your dream home or looking to list a property, we've got you covered.
      </p>

      <!-- Countries Coverage -->
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #1e40af; font-weight: 600; font-size: 14px; margin: 0 0 12px 0;">🌍 Properties across 8 Balkan countries</p>
        <p style="color: #374151; font-size: 13px; margin: 0; line-height: 1.6;">
          Croatia · Serbia · Montenegro · Bosnia · Albania · Kosovo · North Macedonia · Romania
        </p>
      </div>

      <!-- For Buyers Section -->
      <div style="margin: 32px 0;">
        <div style="display: table; width: 100%; margin-bottom: 16px;">
          <div style="display: table-cell; vertical-align: middle;">
            <h2 style="color: #1f2937; font-size: 18px; margin: 0; font-weight: 700;">🏡 For Property Seekers</h2>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <!-- Feature 1 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #eff6ff; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🔍</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Advanced Property Search</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Filter by location, price, property type, bedrooms, amenities, and more</div>
              </div>
            </div>
          </div>
          <!-- Feature 2 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #fef2f2; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">❤️</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Save & Compare Properties</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Bookmark favorites and compare up to 5 properties side-by-side</div>
              </div>
            </div>
          </div>
          <!-- Feature 3 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #f0fdf4; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🔔</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Smart Alerts & Notifications</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Get instant alerts for new listings and price drops on saved properties</div>
              </div>
            </div>
          </div>
          <!-- Feature 4 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #faf5ff; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">💬</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Direct Messaging</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Chat directly with agents and sellers — no phone calls needed</div>
              </div>
            </div>
          </div>
          <!-- Feature 5 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #fef3c7; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">📊</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Property Valuation Tool</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Get AI-powered estimates to understand fair market prices</div>
              </div>
            </div>
          </div>
          <!-- Feature 6 -->
          <div style="padding: 16px 20px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #ecfdf5; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🏦</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Mortgage Calculator</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Calculate monthly payments and plan your budget with ease</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- For Sellers Section -->
      <div style="margin: 32px 0;">
        <div style="display: table; width: 100%; margin-bottom: 16px;">
          <div style="display: table-cell; vertical-align: middle;">
            <h2 style="color: #1f2937; font-size: 18px; margin: 0; font-weight: 700;">📈 For Property Sellers & Agents</h2>
          </div>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <!-- Seller Feature 1 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #f0fdf4; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">✨</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">List Properties for Free</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Create beautiful listings with photos, virtual tours, and detailed descriptions</div>
              </div>
            </div>
          </div>
          <!-- Seller Feature 2 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #fef3c7; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🚀</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Promote Your Listings</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Boost visibility with featured placements and premium badges</div>
              </div>
            </div>
          </div>
          <!-- Seller Feature 3 -->
          <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #eff6ff; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">📉</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Performance Analytics</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Track views, inquiries, saves, and engagement metrics in real-time</div>
              </div>
            </div>
          </div>
          <!-- Seller Feature 4 -->
          <div style="padding: 16px 20px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 44px; vertical-align: top;">
                <div style="width: 36px; height: 36px; background: #faf5ff; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px;">🏢</div>
              </div>
              <div style="display: table-cell; vertical-align: top;">
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">Agency Dashboard</div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">Manage team members, track performance, and grow your agency</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Links -->
      <div style="margin: 32px 0;">
        <p style="color: #374151; font-weight: 600; font-size: 15px; margin: 0 0 16px 0;">Quick Links to Get Started:</p>
        <div style="display: table; width: 100%;">
          <div style="display: table-row;">
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/search" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">🔍 Search Properties</span>
              </a>
            </div>
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/agents" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">👥 Find Agents</span>
              </a>
            </div>
          </div>
          <div style="display: table-row;">
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/valuation" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">📊 Property Valuation</span>
              </a>
            </div>
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/mortgage-calculator" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">🏦 Mortgage Calculator</span>
              </a>
            </div>
          </div>
          <div style="display: table-row;">
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/explore-cities" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">🏙️ Explore Cities</span>
              </a>
            </div>
            <div style="display: table-cell; width: 50%; padding: 6px;">
              <a href="${frontendUrl}/account/profile" style="display: block; background: #f3f4f6; padding: 14px 16px; border-radius: 8px; text-decoration: none; text-align: center;">
                <span style="color: #374151; font-size: 13px; font-weight: 500;">⚙️ Account Settings</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Primary CTA -->
      <div style="text-align: center; margin: 40px 0 32px 0;">
        <a href="${frontendUrl}/search"
           class="button"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 18px 56px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.4);">
          Start Exploring Properties →
        </a>
      </div>

      <!-- Pro Tip -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 10px; padding: 16px 20px; margin: 24px 0;">
        <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
          <strong>💡 Pro Tip:</strong> Complete your profile and save your first search to receive personalized property recommendations and instant alerts when new matches are listed!
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #1f2937; padding: 32px; text-align: center;">
      <div style="margin-bottom: 20px;">
        <span style="color: #ffffff; font-size: 18px; font-weight: 600;">🏠 BalkanEstate<sup>AI</sup></span>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin: 0 0 16px 0;">
        The premier real estate platform for the Balkans
      </p>
      <div style="margin: 20px 0;">
        <a href="${frontendUrl}/how-it-works" style="color: #60a5fa; text-decoration: none; font-size: 13px; margin: 0 12px;">How It Works</a>
        <span style="color: #4b5563;">·</span>
        <a href="${frontendUrl}/agencies" style="color: #60a5fa; text-decoration: none; font-size: 13px; margin: 0 12px;">Browse Agencies</a>
        <span style="color: #4b5563;">·</span>
        <a href="mailto:support@balkanestateai.com" style="color: #60a5fa; text-decoration: none; font-size: 13px; margin: 0 12px;">Contact Support</a>
      </div>
      <div style="border-top: 1px solid #374151; padding-top: 20px; margin-top: 20px;">
        <p style="color: #6b7280; font-size: 11px; margin: 0;">
          © ${new Date().getFullYear()} BalkanEstate<sup>AI</sup>. All rights reserved.<br>
          You're receiving this email because you created an account at balkanestateai.com
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: "Welcome to BalkanEstateᴬᴵ — Your Account is Ready!",
      html,
      text: `Welcome to BalkanEstateᴬᴵ, ${params.userName}!

Your account is verified and ready to explore.

Thank you for joining BalkanEstateᴬᴵ — the premier real estate platform connecting buyers, sellers, and agents across the Balkans.

🌍 Properties across 8 Balkan countries:
Croatia, Serbia, Montenegro, Bosnia, Albania, Kosovo, North Macedonia, Romania

FOR PROPERTY SEEKERS:
• Advanced Property Search — Filter by location, price, property type, bedrooms, amenities
• Save & Compare Properties — Bookmark favorites and compare up to 5 properties side-by-side
• Smart Alerts — Get instant alerts for new listings and price drops
• Direct Messaging — Chat directly with agents and sellers
• Property Valuation Tool — Get AI-powered estimates for fair market prices
• Mortgage Calculator — Calculate monthly payments and plan your budget

FOR SELLERS & AGENTS:
• List Properties for Free — Create beautiful listings with photos and descriptions
• Promote Your Listings — Boost visibility with featured placements
• Performance Analytics — Track views, inquiries, and engagement in real-time
• Agency Dashboard — Manage team members and grow your agency

QUICK LINKS:
• Search Properties: ${frontendUrl}/search
• Find Agents: ${frontendUrl}/agents
• Property Valuation: ${frontendUrl}/valuation
• Mortgage Calculator: ${frontendUrl}/mortgage-calculator
• Explore Cities: ${frontendUrl}/explore-cities
• Account Settings: ${frontendUrl}/account/profile

Pro Tip: Complete your profile and save your first search to receive personalized property recommendations!

Questions? Contact us at support@balkanestateai.com

© ${new Date().getFullYear()} BalkanEstateᴬᴵ. All rights reserved.`,
      category: 'support',
    });
  }

  /**
   * Send monthly coupon notification email
   */
  async sendMonthlyCouponEmail(params: {
    email: string;
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
    isAgency?: boolean;
    agencyName?: string;
    isAgentNotification?: boolean;
    couponCodes?: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }>;
  }): Promise<void> {
    if (!params.email || !isValidEmail(params.email)) {
      throw new Error(`sendMonthlyCouponEmail: invalid recipient email "${params.email}"`);
    }
    if (typeof params.totalCoupons !== 'number' || params.totalCoupons < 0) {
      throw new Error('sendMonthlyCouponEmail: totalCoupons must be a non-negative number');
    }
    const breakdown = params.breakdown ?? { highlighted: 0, premium: 0, featured: 0 };
    const computedTotal = breakdown.highlighted + breakdown.premium + breakdown.featured;
    // newCoupons should equal the tier sum; warn if mismatched but don't reject
    if (params.newCoupons !== computedTotal) {
      emailLogger.warn(`sendMonthlyCouponEmail: newCoupons (${params.newCoupons}) ≠ breakdown sum (${computedTotal}) for ${params.email}`);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    const currentYear = new Date().getFullYear();

    const couponCodesHtml = buildCouponCodesHtml(params.couponCodes ?? []);

    // Try admin-editable template first
    const configKey = params.isAgency ? 'agency-monthly-coupon' : 'monthly-coupon';
    const config = await getActiveEmailConfig(configKey);

    if (config) {
      const isAgentText = params.isAgentNotification
        ? `Great news! Your agency <strong>${escapeHtml(params.agencyName)}</strong> has received its fresh promotion coupons for <strong>${currentMonth}</strong>. These are shared across your team.`
        : params.isAgency
          ? `<strong>${escapeHtml(params.agencyName)}</strong>'s Enterprise plan has been refreshed with <strong>${params.newCoupons} new promotion coupons</strong> for <strong>${currentMonth}</strong>. Coordinate with your team to get maximum visibility.`
          : `Your <strong>${escapeHtml(params.planName)}</strong> subscription has been refreshed with <strong>${params.newCoupons} new promotion coupons</strong> for <strong>${currentMonth}</strong>.`;

      const variables: Record<string, string> = {
        userName:           escapeHtml(params.userName) || 'there',
        planName:           escapeHtml(params.planName) || 'Pro',
        agencyName:         escapeHtml(params.agencyName) || '',
        currentMonth,
        totalCoupons:       String(params.totalCoupons),
        newCoupons:         String(params.newCoupons),
        rolledOver:         String(params.rolledOver),
        highlightedCoupons: String(breakdown.highlighted),
        premiumCoupons:     String(breakdown.premium),
        featuredCoupons:    String(breakdown.featured),
        isAgentText,
        couponCodesList:    couponCodesHtml,
        frontendUrl,
      };

      const { html, subject } = renderEmailConfig(config, variables);
      await this.sendEmail({ to: params.email, subject, html, category: config.fromCategory as any });
      return;
    }

    // ── Fallback: inline HTML (used if template is missing or disabled) ──
    const safeUserName = escapeHtml(params.userName);
    const safePlanName = escapeHtml(params.planName);
    const safeAgencyName = escapeHtml(params.agencyName);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
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
        ${params.isAgentNotification
          ? `Great news! Your agency <strong>${safeAgencyName}</strong> has received fresh promotion coupons for ${currentMonth}. These are shared across your team.`
          : `Your <strong>${safePlanName}</strong> subscription includes fresh promotion coupons for ${currentMonth}. Time to boost your listings!`
        }
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

      <!-- Coupon Codes -->
      ${params.couponCodes && params.couponCodes.length > 0 ? `
      <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 20px; border: 1px solid #86efac;">
        <p style="color: #166534; font-size: 13px; font-weight: 600; margin: 0 0 10px 0;">🎫 Your coupon codes — copy and use when promoting a listing:</p>
        ${params.couponCodes.map(c => {
          const label = c.tier === 'highlight' ? '✨ Highlighted' : c.tier === 'premium' ? '💎 Premium' : '🔥 Featured';
          const bg = c.tier === 'highlight' ? '#059669' : c.tier === 'premium' ? '#7c3aed' : '#dc2626';
          return `<div style="display:flex; align-items:center; margin-bottom:6px;">
            <span style="background:${bg}; color:#fff; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:600; margin-right:8px; white-space:nowrap;">${label}</span>
            <code style="background:#fff; border:1px solid #86efac; border-radius:4px; padding:4px 10px; font-size:13px; font-weight:700; letter-spacing:1px; color:#166534;">${escapeHtml(c.code)}</code>
          </div>`;
        }).join('')}
      </div>
      ` : ''}

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
        ${params.isAgency ? `${safeAgencyName} · Enterprise Plan` : `${safePlanName} Subscription`}
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    const codesText = (params.couponCodes ?? []).length > 0
      ? `\nYour coupon codes:\n${(params.couponCodes ?? []).map(c => `- ${c.tier.toUpperCase()}: ${c.code}`).join('\n')}\n`
      : '';
    await this.sendEmail({
      to: params.email,
      subject: `🎟️ Your ${currentMonth} Promotion Coupons Are Ready! (${params.totalCoupons} available)`,
      html,
      text: `Hey ${params.userName}!\n\nYour ${currentMonth} promotion coupons are ready!\n\nTotal: ${params.totalCoupons} (${params.newCoupons} new + ${params.rolledOver} rolled over)\n\nBreakdown:\n- Highlighted: ${breakdown.highlighted}\n- Premium: ${breakdown.premium}\n- Featured: ${breakdown.featured}\n${codesText}\nUse coupons to boost listings and get up to 5× more views.\n${frontendUrl}/promotions\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send email with agent registration coupons when Enterprise subscription is created
   * Contains 5 coupon codes for agents to join the team with yearly Pro subscriptions
   */
  async sendAgentRegistrationCouponsEmail(params: {
    email: string;
    ownerName: string;
    agencyName: string;
    coupons: Array<{ code: string; expiresAt: Date }>;
    agentListingsLimit?: number;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';

    // Sanitize user inputs
    const safeOwnerName = escapeHtml(params.ownerName);
    const safeAgencyName = escapeHtml(params.agencyName);
    const agentListingsLimit = params.agentListingsLimit ?? 25;

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

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your Enterprise subscription is active! Here are your ${params.coupons.length} agent registration codes.
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
        Below are <strong>${params.coupons.length} agent registration codes</strong> that your team members can use to join with a full <strong>yearly Pro subscription</strong> included!
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
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
        <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📋 How to Use These Codes</h3>
        <ol style="color: #e2e8f0; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Share a code with each team member you want to invite</li>
          <li>They register on BalkanEstate<sup>AI</sup> (or log in if already registered)</li>
          <li>Go to <strong style="color: #60a5fa;">Agency → Redeem Code</strong> and enter the code</li>
          <li>They'll automatically get a yearly Pro subscription and join your agency!</li>
        </ol>
      </div>

      <!-- Benefits Box -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 2px solid #f59e0b;">
        <h3 style="color: #fbbf24; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">✨ What Each Agent Gets</h3>
        <ul style="color: #e2e8f0; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li><strong style="color: #fbbf24;">Full Year</strong> of Pro features included</li>
          <li><strong style="color: #fbbf24;">${agentListingsLimit} listings per year</strong> under your agency</li>
          <li><strong style="color: #fbbf24;">Monthly promotion coupons</strong> shared with the team</li>
          <li><strong style="color: #fbbf24;">Priority support</strong> and agency branding</li>
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
    <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #ffffff; font-size: 11px; margin: 0 0 4px 0;">
        ${safeAgencyName} · Enterprise Plan
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    const couponList = params.coupons.map((c, i) => `Agent ${i + 1}: ${c.code} (expires ${c.expiresAt.toLocaleDateString()})`).join('\n');

    await this.sendEmail({
      to: params.email,
      subject: `🏢 Welcome to Enterprise! Your ${params.coupons.length} Agent Registration Codes Are Ready`,
      html,
      text: `Hello ${params.ownerName}!\n\nCongratulations! Your Enterprise subscription for ${params.agencyName} is now active.\n\nHere are your ${params.coupons.length} agent registration codes:\n\n${couponList}\n\nHow to use:\n1. Share a code with each team member\n2. They register or log in to BalkanEstateᴬᴵ\n3. Go to Agency → Redeem Code\n4. Enter the code to join your agency with a yearly Pro subscription!\n\nGo to your agency dashboard: ${frontendUrl}/agency/dashboard\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send Enterprise Welcome/Thank You email
   * Sent separately from agent coupons to welcome and thank the customer
   */
  async sendEnterpriseWelcomeEmail(params: {
    email: string;
    ownerName: string;
    agencyName: string;
    promotionCoupons?: {
      total: number;
      premium: number;
      highlighted: number;
      featured: number;
    };
    agentCoupons?: number;
    teamMembersLimit?: number;
    listingsLimit?: number;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';

    // Sanitize user inputs
    const safeOwnerName = escapeHtml(params.ownerName);
    const safeAgencyName = escapeHtml(params.agencyName);

    const currentYear = new Date().getFullYear();

    // Default values if not provided
    const listingsLimit = params.listingsLimit || 500;
    const teamMembersLimit = params.teamMembersLimit || 5;
    const agentCoupons = params.agentCoupons || 5;
    const promotionCoupons = params.promotionCoupons || {
      total: 5,
      premium: 2,
      highlighted: 2,
      featured: 1,
    };

    // Create promotion coupons breakdown string
    const couponBreakdown = `${promotionCoupons.premium} Premium + ${promotionCoupons.highlighted} Highlighted + ${promotionCoupons.featured} Featured`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
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
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>${listingsLimit} Listings</strong> - Expandable as you grow</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>${agentCoupons} Agent Coupons</strong> - Each with yearly Pro subscription</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>${promotionCoupons.total} Monthly Promotion Coupons</strong></span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; padding-left: 40px;">
              <span style="color: #94a3b8; font-size: 13px;">${couponBreakdown}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>Up to ${teamMembersLimit} Team Members</strong></span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>Priority Support</strong> - We're here when you need us</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px;"><strong>Agency Branding</strong> - Your brand, front and center</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Next Steps -->
      <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
        <h3 style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">📋 Your Next Steps</h3>
        <ol style="color: #e2e8f0; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>Check your inbox for <strong style="color: #10b981;">${agentCoupons} agent registration codes</strong></li>
          <li>Share codes with your team members to onboard them</li>
          <li>Set up your agency profile with branding and description</li>
          <li>Start listing properties and watch your agency grow!</li>
        </ol>
      </div>

      <!-- Personal Note -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 8px; padding: 20px; margin-bottom: 28px; border-left: 4px solid #f59e0b;">
        <p style="color: #e2e8f0; font-size: 14px; margin: 0; line-height: 1.6; font-style: italic;">
          "We built BalkanEstate<sup>AI</sup> to empower real estate professionals across the Balkans.
          Your success is our success. If you ever need anything, don't hesitate to reach out!"
        </p>
        <p style="color: #ffffff; font-size: 13px; margin: 12px 0 0 0; font-weight: 600;">
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

      <p style="text-align: center; margin: 0;">
        <a href="${frontendUrl}/agency/settings" style="color: #6b7280; font-size: 13px; text-decoration: none; margin-right: 16px;">Agency Settings</a>
        <a href="${frontendUrl}/support" style="color: #6b7280; font-size: 13px; text-decoration: none;">Contact Support</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 24px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #ffffff; font-size: 13px; margin: 0 0 8px 0; font-weight: 600;">
        ${safeAgencyName}
      </p>
      <p style="color: #94a3b8; font-size: 12px; margin: 0 0 4px 0;">
        Enterprise Subscriber · €999/year
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 12px 0 0 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: `🎉 Thank You for Choosing Enterprise! Welcome to BalkanEstateᴬᴵ`,
      html,
      text: `Dear ${params.ownerName},\n\nWe're thrilled to have ${params.agencyName} join the BalkanEstateᴬᴵ Enterprise program!\n\nYour Enterprise Benefits:\n- ${listingsLimit} Listings (expandable)\n- ${agentCoupons} Agent Coupons with yearly Pro subscription\n- ${promotionCoupons.total} Monthly Promotion Coupons (${couponBreakdown})\n- Up to ${teamMembersLimit} Team Members\n- Priority Support\n- Agency Branding\n\nNext Steps:\n1. Check your inbox for ${agentCoupons} agent registration codes\n2. Share codes with your team\n3. Set up your agency profile\n4. Start listing properties!\n\nGo to your dashboard: ${frontendUrl}/agency/dashboard\n\nThank you for trusting us!\n— The BalkanEstateᴬᴵ Team\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send email to agent when they successfully join an agency via coupon redemption
   */
  async sendAgentJoinedAgencyEmail(params: {
    agentEmail: string;
    agentName: string;
    agencyName: string;
    agencyId: string;
    subscriptionTier: string;
    listingsLimit: number;
    expiresAt: Date;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';

    // Sanitize user inputs
    const safeAgentName = escapeHtml(params.agentName);
    const safeAgencyName = escapeHtml(params.agencyName);

    const currentYear = new Date().getFullYear();
    const expiryDate = params.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Welcome to ${safeAgencyName}! Your Pro subscription is now active.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #16213e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 80px; font-size: 40px;">🎉</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to the Team!</h1>
      <p style="color: #d1fae5; margin: 12px 0 0 0; font-size: 16px;">You've successfully joined ${safeAgencyName}</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="color: #ffffff; font-size: 18px; margin: 0 0 24px 0;">
        Hello ${safeAgentName}! 👋
      </p>

      <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
        Great news! You've successfully joined <strong style="color: #10b981;">${safeAgencyName}</strong> and your Pro subscription is now active.
        You're all set to start listing properties under your agency's brand!
      </p>

      <!-- Subscription Details -->
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🎯 Your Pro Subscription</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 14px;">Plan</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155; text-align: right;">
              <span style="color: #10b981; font-size: 14px; font-weight: 600;">Pro (Agency Agent)</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 14px;">Listings Limit</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155; text-align: right;">
              <span style="color: #ffffff; font-size: 14px; font-weight: 600;">${params.listingsLimit} listings</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155;">
              <span style="color: #94a3b8; font-size: 14px;">Valid Until</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #334155; text-align: right;">
              <span style="color: #ffffff; font-size: 14px; font-weight: 600;">${expiryDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="color: #94a3b8; font-size: 14px;">Agency</span>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="color: #f59e0b; font-size: 14px; font-weight: 600;">${safeAgencyName}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- What You Get -->
      <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #10b981;">
        <h3 style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">✨ What's Included</h3>
        <ul style="color: #e2e8f0; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li><strong style="color: #10b981;">Full Year</strong> of Pro features</li>
          <li><strong style="color: #10b981;">${params.listingsLimit} active listings</strong> under your name</li>
          <li><strong style="color: #10b981;">Agency branding</strong> on all your listings</li>
          <li><strong style="color: #10b981;">Access to promotion coupons</strong> from your agency</li>
          <li><strong style="color: #10b981;">Priority support</strong> from our team</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/agencies/${params.agencyId}"
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
          View Your Agency →
        </a>
      </div>

      <p style="text-align: center; margin: 0;">
        <a href="${frontendUrl}/account" style="color: #94a3b8; font-size: 13px; text-decoration: none;">Go to your account →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0 0 4px 0;">
        ${safeAgencyName} · Pro Agent
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.agentEmail,
      subject: `🎉 Welcome to ${safeAgencyName}! Your Pro Subscription is Active`,
      html,
      text: `Hello ${params.agentName}!\n\nGreat news! You've successfully joined ${params.agencyName} and your Pro subscription is now active.\n\nYour Pro Subscription:\n- Plan: Pro (Agency Agent)\n- Listings Limit: ${params.listingsLimit} listings\n- Valid Until: ${expiryDate}\n- Agency: ${params.agencyName}\n\nWhat's Included:\n- Full Year of Pro features\n- ${params.listingsLimit} active listings under your name\n- Agency branding on all your listings\n- Access to promotion coupons from your agency\n- Priority support from our team\n\nView your agency: ${frontendUrl}/agencies/${params.agencyId}\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send email to agency owner when a new agent joins via coupon redemption
   */
  async sendAgencyNewMemberEmail(params: {
    ownerEmail: string;
    ownerName: string;
    agencyName: string;
    agencyId: string;
    newAgentName: string;
    newAgentEmail: string;
    couponCode: string;
    totalAgents: number;
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';

    // Sanitize user inputs
    const safeOwnerName = escapeHtml(params.ownerName);
    const safeAgencyName = escapeHtml(params.agencyName);
    const safeNewAgentName = escapeHtml(params.newAgentName);
    const safeNewAgentEmail = escapeHtml(params.newAgentEmail);
    const safeCouponCode = escapeHtml(params.couponCode);

    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1a1a2e; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    New team member joined ${safeAgencyName}!
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #16213e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 60px; font-size: 28px;">👥</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">New Team Member!</h1>
      <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 14px;">Someone just joined ${safeAgencyName}</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #ffffff; font-size: 16px; margin: 0 0 20px 0;">
        Hello ${safeOwnerName}! 👋
      </p>

      <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Great news! A new agent has joined your agency <strong style="color: #f59e0b;">${safeAgencyName}</strong> using one of your registration codes.
      </p>

      <!-- New Member Details -->
      <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🆕 New Team Member</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 14px;">Name</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
              <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${safeNewAgentName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 14px;">Email</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
              <a href="mailto:${safeNewAgentEmail}" style="color: #0891b2; font-size: 14px; font-weight: 600; text-decoration: none;">${safeNewAgentEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="color: #6b7280; font-size: 14px;">Code Used</span>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
              <span style="display: inline-block; background: #fef3c7; padding: 4px 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-weight: 600; font-size: 13px; color: #b45309; letter-spacing: 1px;">
                ${safeCouponCode}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="color: #6b7280; font-size: 14px;">Team Size</span>
            </td>
            <td style="padding: 10px 0; text-align: right;">
              <span style="color: #1f2937; font-size: 14px; font-weight: 600;">${params.totalAgents} agent${params.totalAgents > 1 ? 's' : ''}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Info Box -->
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
        <p style="color: #e2e8f0; font-size: 13px; margin: 0; line-height: 1.6;">
          <strong style="color: #10b981;">Note:</strong> The agent coupon has been marked as used and cannot be redeemed again.
          ${safeNewAgentName} now has a yearly Pro subscription under your agency.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/agencies/${params.agencyId}"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
          View Agency Dashboard →
        </a>
      </div>

      <p style="text-align: center; margin: 0;">
        <a href="${frontendUrl}/agencies/${params.agencyId}/team" style="color: #94a3b8; font-size: 13px; text-decoration: none;">Manage your team →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0 0 4px 0;">
        ${safeAgencyName} · Enterprise Plan
      </p>
      <p style="color: #64748b; font-size: 11px; margin: 0;">
        © ${currentYear} BalkanEstate<sup>AI</sup> · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.ownerEmail,
      subject: `👥 New Team Member Joined ${safeAgencyName}!`,
      html,
      text: `Hello ${params.ownerName}!\n\nGreat news! A new agent has joined your agency ${params.agencyName}.\n\nNew Team Member:\n- Name: ${params.newAgentName}\n- Email: ${params.newAgentEmail}\n- Code Used: ${params.couponCode}\n- Team Size: ${params.totalAgents} agent(s)\n\nThe agent coupon has been marked as used and cannot be redeemed again.\n\nView your agency: ${frontendUrl}/agencies/${params.agencyId}\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  /**
   * Send viewing confirmation email to visitor
   */
  async sendViewingConfirmation(params: {
    visitorEmail: string;
    visitorName: string;
    propertyTitle: string;
    propertyAddress: string;
    date: string;
    timeSlot: string;
    sellerName: string;
    propertyId: string;
  }): Promise<void> {
    const safeName = escapeHtml(params.visitorName);
    const safeTitle = escapeHtml(params.propertyTitle);
    const safeAddress = escapeHtml(params.propertyAddress);
    const safeDate = escapeHtml(params.date);
    const safeTime = escapeHtml(params.timeSlot);
    const safeSellerName = escapeHtml(params.sellerName);
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your viewing has been scheduled for ${safeDate} at ${safeTime}
  </div>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; line-height: 60px; font-size: 28px;">📅</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Viewing Confirmed!</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Your property viewing has been scheduled</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello ${safeName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Your viewing request has been submitted. The property owner will review and confirm your appointment.
      </p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #0369a1; font-size: 16px; margin: 0 0 16px 0;">Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contact:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeSellerName}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${frontendUrl}/property/${params.propertyId}"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.3);">
          View Property
        </a>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Note:</strong> The property owner will confirm your viewing. You'll receive another email once confirmed. Please arrive on time and bring a valid ID.
        </p>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup>
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.visitorEmail,
      subject: `📅 Viewing Scheduled: ${params.propertyTitle} on ${params.date}`,
      html,
      text: `Hello ${params.visitorName},\n\nYour viewing has been scheduled!\n\nProperty: ${params.propertyTitle}\nAddress: ${params.propertyAddress}\nDate: ${params.date}\nTime: ${params.timeSlot}\nContact: ${params.sellerName}\n\nThe property owner will confirm your viewing.\n\nView property: ${frontendUrl}/property/${params.propertyId}\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'inquiries',
    });
  }

  /**
   * Send viewing notification email to seller/agent
   */
  async sendViewingNotification(params: {
    sellerEmail: string;
    sellerName: string;
    visitorName: string;
    visitorEmail: string;
    visitorPhone?: string;
    visitorMessage?: string;
    propertyTitle: string;
    propertyAddress: string;
    date: string;
    timeSlot: string;
    propertyId: string;
  }): Promise<void> {
    const safeSellerName = escapeHtml(params.sellerName);
    const safeVisitorName = escapeHtml(params.visitorName);
    const safeVisitorEmail = escapeHtml(params.visitorEmail);
    const safeVisitorPhone = escapeHtml(params.visitorPhone);
    const safeVisitorMessage = escapeHtml(params.visitorMessage);
    const safeTitle = escapeHtml(params.propertyTitle);
    const safeAddress = escapeHtml(params.propertyAddress);
    const safeDate = escapeHtml(params.date);
    const safeTime = escapeHtml(params.timeSlot);
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    New viewing request from ${safeVisitorName} for ${safeDate} at ${safeTime}
  </div>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; line-height: 60px; font-size: 28px;">🏠</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">New Viewing Request!</h1>
      <p style="color: #fef3c7; margin: 8px 0 0 0; font-size: 14px;">${safeTitle}</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello ${safeSellerName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Someone wants to view your property. Here are the details:
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #92400e; font-size: 16px; margin: 0 0 16px 0;">Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeDate} at ${safeTime}</td>
          </tr>
        </table>
      </div>
      <div style="background: #f3f4f6; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Visitor Info</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Name:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeVisitorName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">
              <a href="mailto:${safeVisitorEmail}" style="color: #0252CD; text-decoration: none;">${safeVisitorEmail}</a>
            </td>
          </tr>
          ${safeVisitorPhone ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">
              <a href="tel:${safeVisitorPhone}" style="color: #0252CD; text-decoration: none;">${safeVisitorPhone}</a>
            </td>
          </tr>` : ''}
          ${safeVisitorMessage ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Message:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-style: italic;">"${safeVisitorMessage}"</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${frontendUrl}/account/viewings"
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3); margin-right: 8px;">
          Manage Viewing Requests
        </a>
      </div>
      <div style="text-align: center; margin: 12px 0 0 0;">
        <a href="${frontendUrl}/property/${params.propertyId}"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
          View Property Listing
        </a>
      </div>
      <div style="background: #ecfdf5; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #065f46; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Action Required:</strong> Please review this viewing request in your account dashboard. You can approve or decline the request, and the visitor will be notified by email.
        </p>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup>
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.sellerEmail,
      subject: `🏠 New Viewing Request from ${params.visitorName} - ${params.date} at ${params.timeSlot}`,
      html,
      text: `Hello ${params.sellerName},\n\nNew viewing request!\n\nProperty: ${params.propertyTitle}\nDate: ${params.date} at ${params.timeSlot}\n\nVisitor: ${params.visitorName}\nEmail: ${params.visitorEmail}${params.visitorPhone ? `\nPhone: ${params.visitorPhone}` : ''}${params.visitorMessage ? `\nMessage: "${params.visitorMessage}"` : ''}\n\nManage viewings: ${frontendUrl}/account/viewings\nView listing: ${frontendUrl}/property/${params.propertyId}\n\nAction Required: Please approve or decline this viewing request in your account dashboard.\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'inquiries',
    });
  }
  /**
   * Send viewing approved email to visitor
   */
  async sendViewingApproved(params: {
    visitorEmail: string;
    visitorName: string;
    propertyTitle: string;
    propertyAddress: string;
    date: string;
    timeSlot: string;
    sellerName: string;
    sellerPhone?: string;
    propertyId: string;
  }): Promise<void> {
    const safeName = escapeHtml(params.visitorName);
    const safeTitle = escapeHtml(params.propertyTitle);
    const safeAddress = escapeHtml(params.propertyAddress);
    const safeDate = escapeHtml(params.date);
    const safeTime = escapeHtml(params.timeSlot);
    const safeSellerName = escapeHtml(params.sellerName);
    const safeSellerPhone = escapeHtml(params.sellerPhone);
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Great news! Your viewing has been confirmed for ${safeDate} at ${safeTime}
  </div>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; line-height: 60px; font-size: 28px;">&#10003;</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Viewing Confirmed!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">The property owner has approved your visit</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello ${safeName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Great news! Your viewing request has been <strong style="color: #059669;">approved</strong>. You're all set to visit the property.
      </p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #065f46; font-size: 16px; margin: 0 0 16px 0;">Confirmed Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contact:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeSellerName}${safeSellerPhone ? ` &mdash; <a href="tel:${safeSellerPhone}" style="color: #0252CD; text-decoration: none;">${safeSellerPhone}</a>` : ''}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${frontendUrl}/property/${params.propertyId}"
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
          View Property Details
        </a>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>Reminder:</strong> Please arrive on time and bring a valid ID. If you need to cancel, please let the owner know in advance.
        </p>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup>
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.visitorEmail,
      subject: `✅ Viewing Confirmed: ${params.propertyTitle} on ${params.date}`,
      html,
      text: `Hello ${params.visitorName},\n\nGreat news! Your viewing has been confirmed!\n\nProperty: ${params.propertyTitle}\nAddress: ${params.propertyAddress}\nDate: ${params.date}\nTime: ${params.timeSlot}\nContact: ${params.sellerName}${params.sellerPhone ? ` — ${params.sellerPhone}` : ''}\n\nPlease arrive on time and bring a valid ID.\n\nView property: ${frontendUrl}/property/${params.propertyId}\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'inquiries',
    });
  }

  /**
   * Send viewing rejected/declined email to visitor
   */
  async sendViewingRejected(params: {
    visitorEmail: string;
    visitorName: string;
    propertyTitle: string;
    propertyAddress: string;
    date: string;
    timeSlot: string;
    sellerName: string;
    cancelReason?: string;
    propertyId: string;
  }): Promise<void> {
    const safeName = escapeHtml(params.visitorName);
    const safeTitle = escapeHtml(params.propertyTitle);
    const safeDate = escapeHtml(params.date);
    const safeTime = escapeHtml(params.timeSlot);
    const safeCancelReason = escapeHtml(params.cancelReason);
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const currentYear = new Date().getFullYear();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Unfortunately, your viewing for ${safeDate} at ${safeTime} could not be confirmed
  </div>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.15); border-radius: 50%; line-height: 60px; font-size: 28px;">📋</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Viewing Update</h1>
      <p style="color: #d1d5db; margin: 8px 0 0 0; font-size: 14px;">Your viewing request status has changed</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello ${safeName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Unfortunately, the property owner was unable to confirm your viewing request for the selected date and time. We apologize for any inconvenience.
      </p>
      <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">Request Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${safeTitle}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeDate} at ${safeTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status:</td>
            <td style="padding: 8px 0; color: #dc2626; font-size: 14px; font-weight: 600;">Declined</td>
          </tr>
          ${safeCancelReason ? `<tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Reason:</td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-style: italic;">"${safeCancelReason}"</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="color: #1e40af; font-size: 13px; margin: 0; line-height: 1.5;">
          <strong>What to do next:</strong> You can try scheduling a different date or time for this property, or browse other similar properties in the area.
        </p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${frontendUrl}/property/${params.propertyId}"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.3);">
          Try Another Time
        </a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Contact us at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup>
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.visitorEmail,
      subject: `Viewing Update: ${params.propertyTitle}`,
      html,
      text: `Hello ${params.visitorName},\n\nUnfortunately, the property owner was unable to confirm your viewing request.\n\nProperty: ${params.propertyTitle}\nRequested: ${params.date} at ${params.timeSlot}\nStatus: Declined${params.cancelReason ? `\nReason: "${params.cancelReason}"` : ''}\n\nYou can try scheduling a different date or time.\n\nView property: ${frontendUrl}/property/${params.propertyId}\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'inquiries',
    });
  }
  // Send promotion coupons summary email to agency owner
  async sendPromotionCouponsEmail(params: {
    email: string;
    ownerName: string;
    agencyName: string;
    promotionCoupons: {
      monthly: number;
      available: number;
      used: number;
    };
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';
    const safeOwnerName = escapeHtml(params.ownerName);
    const safeAgencyName = escapeHtml(params.agencyName);
    const currentYear = new Date().getFullYear();
    const { monthly, available, used } = params.promotionCoupons;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your promotion coupons summary for ${safeAgencyName}.
  </div>

  <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 24px; text-align: center;">
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 60px; font-size: 28px;">🎁</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Promotion Coupons</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0 0; font-size: 14px;">${safeAgencyName} • Monthly Summary</p>
    </div>

    <div style="padding: 28px 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hello ${safeOwnerName}! 👋
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Here's your current promotion coupons summary for <strong>${safeAgencyName}</strong>.
        Use these coupons to highlight, feature, or boost your agency's property listings!
      </p>

      <!-- Coupons Summary -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #d97706; font-size: 28px; font-weight: 700; margin: 0;">${monthly}</p>
          <p style="color: #92400e; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Monthly</p>
        </div>
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #059669; font-size: 28px; font-weight: 700; margin: 0;">${available}</p>
          <p style="color: #065f46; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Available</p>
        </div>
        <div style="flex: 1; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center;">
          <p style="color: #374151; font-size: 28px; font-weight: 700; margin: 0;">${used}</p>
          <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Used</p>
        </div>
      </div>

      <!-- How to Use -->
      <div style="background: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
        <h3 style="color: #ffffff; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📋 How to Use Promotion Coupons</h3>
        <ol style="color: #e2e8f0; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Go to any of your active listings</li>
          <li>Click <strong style="color: #fbbf24;">Promote Listing</strong></li>
          <li>Select the promotion type (Highlight, Premium, or Featured)</li>
          <li>Your coupon will be applied automatically!</li>
        </ol>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/agency/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
          Go to Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup> • Promotion coupons refresh monthly
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: `🎁 Promotion Coupons Summary — ${safeAgencyName}`,
      html,
      text: `Hello ${params.ownerName},\n\nHere's your promotion coupons summary for ${params.agencyName}.\n\nMonthly: ${monthly}\nAvailable: ${available}\nUsed: ${used}\n\nUse these coupons to highlight, feature, or boost your listings!\n\nVisit: ${frontendUrl}/agency/dashboard\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }

  async sendProSubscriptionWelcomeEmail(params: {
    email: string;
    userName: string;
    planName: string;
    listingsLimit: number;
    promotionCoupons: {
      total: number;
      highlighted: number;
      premium: number;
      featured: number;
    };
    aiInsightsLimit: number;
    aiMessagesLimit: number;
    savedSearchesLimit: number;
    billingPeriod: 'monthly' | 'yearly';
    expiresAt: Date;
    couponCodes?: Array<{ tier: 'highlight' | 'premium' | 'featured'; code: string }>;
  }): Promise<void> {
    if (!params.email || !isValidEmail(params.email)) {
      throw new Error(`sendProSubscriptionWelcomeEmail: invalid recipient email "${params.email}"`);
    }
    if (!params.expiresAt || !(params.expiresAt instanceof Date)) {
      throw new Error('sendProSubscriptionWelcomeEmail: expiresAt must be a valid Date');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestateai.com';
    const formatLimit = (n: number) => (n === -1 || n === undefined ? 'Unlimited' : String(n));
    const expiryStr = params.expiresAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const currentYear = new Date().getFullYear();

    const breakdownParts = [
      params.promotionCoupons.highlighted > 0 ? `${params.promotionCoupons.highlighted} Highlighted` : '',
      params.promotionCoupons.premium > 0 ? `${params.promotionCoupons.premium} Premium` : '',
      params.promotionCoupons.featured > 0 ? `${params.promotionCoupons.featured} Featured` : '',
    ].filter(Boolean);
    const couponBreakdown = breakdownParts.join(' + ') || `${params.promotionCoupons.total} coupons`;
    const couponCodesHtml = buildCouponCodesHtml(params.couponCodes ?? []);

    // Try admin-editable template first
    const config = await getActiveEmailConfig('pro-subscription-welcome');
    if (config) {
      const variables: Record<string, string> = {
        userName:           escapeHtml(params.userName) || 'there',
        planName:           escapeHtml(params.planName),
        listingsLimit:      String(params.listingsLimit),
        billingPeriodLabel: params.billingPeriod === 'yearly' ? 'year' : 'month',
        totalCoupons:       String(params.promotionCoupons.total),
        couponBreakdown,
        aiMessagesLabel:    formatLimit(params.aiMessagesLimit),
        aiInsightsLabel:    formatLimit(params.aiInsightsLimit),
        expiresAt:          expiryStr,
        couponCodesList:    couponCodesHtml,
        frontendUrl,
      };
      const { html: cfgHtml, subject: cfgSubject } = renderEmailConfig(config, variables);
      await this.sendEmail({ to: params.email, subject: cfgSubject, html: cfgHtml, category: config.fromCategory as any });
      return;
    }

    // ── Fallback: inline HTML ──
    const safeUserName = escapeHtml(params.userName);
    const safePlanName = escapeHtml(params.planName);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Welcome to ${safePlanName}! Here's everything you get with your new subscription.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); padding: 40px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="display: inline-block; width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 80px; font-size: 40px;">🎉</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to ${safePlanName}!</h1>
      <p style="color: #fef3c7; margin: 12px 0 0 0; font-size: 15px;">Your subscription is now active</p>
    </div>

    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 17px; margin: 0 0 20px 0;">
        Hi ${safeUserName}! 👋
      </p>

      <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 28px 0;">
        Thank you for subscribing to <strong>${safePlanName}</strong>. Your account is now fully activated and you have access to all Pro features. Here's a summary of everything included in your plan.
      </p>

      <!-- Plan Benefits -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">🚀 Your Plan Benefits</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">${params.listingsLimit}</strong> active listings per ${params.billingPeriod === 'monthly' ? 'month' : 'year'}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">${params.promotionCoupons.total} promotion coupons/month</strong> — ${couponBreakdown}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">${formatLimit(params.aiMessagesLimit)} AI messages</strong> — intelligent property assistant
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">${formatLimit(params.aiInsightsLimit)} market insights/month</strong> — smart analytics
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">${formatLimit(params.savedSearchesLimit)} saved searches</strong> — track the market
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0;">
              <span style="display: inline-block; width: 28px; height: 28px; background: #059669; border-radius: 50%; text-align: center; line-height: 28px; font-size: 14px; color: white; vertical-align: middle;">✓</span>
              <span style="color: #e2e8f0; font-size: 14px; margin-left: 12px; vertical-align: middle;">
                <strong style="color: #fbbf24;">Unlimited</strong> auto-generate image descriptions
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Promotion Coupons -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 20px; margin-bottom: 24px; border: 2px solid #f59e0b;">
        <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">🎟️ Your first ${params.promotionCoupons.total} promotion coupons are ready! (${couponBreakdown})</p>
        ${params.couponCodes && params.couponCodes.length > 0 ? `
        <div style="margin-bottom: 10px;">
          ${params.couponCodes.map(c => {
            const label = c.tier === 'highlight' ? '✨ Highlighted' : c.tier === 'premium' ? '💎 Premium' : '🔥 Featured';
            const bg = c.tier === 'highlight' ? '#059669' : c.tier === 'premium' ? '#7c3aed' : '#dc2626';
            return `<div style="display: flex; align-items: center; margin-bottom: 6px;">
              <span style="background:${bg}; color:#fff; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:600; margin-right:8px; white-space:nowrap;">${label}</span>
              <code style="background:#fff; border:1px solid #f59e0b; border-radius:4px; padding:4px 10px; font-size:13px; font-weight:700; letter-spacing:1px; color:#92400e;">${escapeHtml(c.code)}</code>
            </div>`;
          }).join('')}
        </div>
        ` : ''}
        <p style="color: #78350f; font-size: 12px; margin: 0; line-height: 1.5;">
          Copy a code and paste it when promoting a listing to use it for free.
          New coupons refresh at the start of each month.
        </p>
      </div>

      <!-- Subscription Details -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 28px; border: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 13px; margin: 0;"><strong>Plan:</strong> ${safePlanName}</p>
        <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;"><strong>Active until:</strong> ${expiryStr}</p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 28px 0;">
        <a href="${frontendUrl}/sell"
           style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
          Post Your First Listing →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
      <p style="color: #64748b; font-size: 12px; margin: 0 0 8px 0;">
        &copy; ${currentYear} BalkanEstate<sup>AI</sup> • All rights reserved
      </p>
      <p style="color: #475569; font-size: 11px; margin: 0;">
        If you have any questions, contact us at <a href="mailto:support@balkanestateai.com" style="color: #f59e0b;">support@balkanestateai.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

    const codesText = (params.couponCodes ?? []).length > 0
      ? `\nYour coupon codes:\n${(params.couponCodes ?? []).map(c => `- ${c.tier.toUpperCase()}: ${c.code}`).join('\n')}\n`
      : '';
    await this.sendEmail({
      to: params.email,
      subject: `🎉 Welcome to ${params.planName} — Your Benefits Are Ready!`,
      html,
      text: `Hi ${params.userName},\n\nWelcome to ${params.planName}! Your subscription is now active.\n\n- ${params.listingsLimit} listings per ${params.billingPeriod === 'monthly' ? 'month' : 'year'}\n- ${params.promotionCoupons.total} promotion coupons/month (${couponBreakdown})\n- ${formatLimit(params.aiMessagesLimit)} AI messages\n- ${formatLimit(params.aiInsightsLimit)} insights/month\n- Unlimited saved searches\n${codesText}\nActive until: ${expiryStr}\nStart posting: ${frontendUrl}/sell\n\n© ${currentYear} BalkanEstateᴬᴵ`,
      category: 'alerts',
    });
  }
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;

// Export bound methods
export const sendEmail = emailServiceInstance.sendEmail.bind(emailServiceInstance);
export const sendNewMessageNotification = emailServiceInstance.sendNewMessageNotification.bind(emailServiceInstance);
export const sendWeeklyStats = emailServiceInstance.sendWeeklyStats.bind(emailServiceInstance);
export const sendAgencyWeeklyStats = emailServiceInstance.sendAgencyWeeklyStats.bind(emailServiceInstance);
export const sendPropertyAlert = emailServiceInstance.sendPropertyAlert.bind(emailServiceInstance);
export const sendNewListingsDigest = emailServiceInstance.sendNewListingsDigest.bind(emailServiceInstance);
export const sendPriceDropAlert = emailServiceInstance.sendPriceDropAlert.bind(emailServiceInstance);
export const sendSavedSearchPriceDropAlert = emailServiceInstance.sendSavedSearchPriceDropAlert.bind(emailServiceInstance);
export const sendAgentInquiry = emailServiceInstance.sendAgentInquiry.bind(emailServiceInstance);
export const sendPasswordResetEmail = emailServiceInstance.sendPasswordResetEmail.bind(emailServiceInstance);
export const sendEmailVerification = emailServiceInstance.sendEmailVerification.bind(emailServiceInstance);
export const sendWelcomeEmail = emailServiceInstance.sendWelcomeEmail.bind(emailServiceInstance);
export const getFromAddress = emailServiceInstance.getFromAddress.bind(emailServiceInstance);
export const sendMonthlyCouponEmail = emailServiceInstance.sendMonthlyCouponEmail.bind(emailServiceInstance);
export const sendAgentRegistrationCouponsEmail = emailServiceInstance.sendAgentRegistrationCouponsEmail.bind(emailServiceInstance);
export const sendEnterpriseWelcomeEmail = emailServiceInstance.sendEnterpriseWelcomeEmail.bind(emailServiceInstance);
export const sendAgentJoinedAgencyEmail = emailServiceInstance.sendAgentJoinedAgencyEmail.bind(emailServiceInstance);
export const sendAgencyNewMemberEmail = emailServiceInstance.sendAgencyNewMemberEmail.bind(emailServiceInstance);
export const sendViewingConfirmation = emailServiceInstance.sendViewingConfirmation.bind(emailServiceInstance);
export const sendViewingNotification = emailServiceInstance.sendViewingNotification.bind(emailServiceInstance);
export const sendViewingApproved = emailServiceInstance.sendViewingApproved.bind(emailServiceInstance);
export const sendViewingRejected = emailServiceInstance.sendViewingRejected.bind(emailServiceInstance);
export const sendSubscriptionInvoice = emailServiceInstance.sendSubscriptionInvoice.bind(emailServiceInstance);
export const sendPaymentConfirmation = emailServiceInstance.sendPaymentConfirmation.bind(emailServiceInstance);
export const sendPromotionCouponsEmail = emailServiceInstance.sendPromotionCouponsEmail.bind(emailServiceInstance);
export const sendProSubscriptionWelcomeEmail = emailServiceInstance.sendProSubscriptionWelcomeEmail.bind(emailServiceInstance);
