import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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
  noreply: 'Balkan Estate <noreply@balkanestateai.com>',
  alerts: 'Balkan Estate Alerts <alerts@balkanestateai.com>',
  support: 'Balkan Estate Support <support@balkanestateai.com>',
  inquiries: 'Balkan Estate <inquiries@balkanestateai.com>',
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private provider: EmailProvider = 'none';
  private fromEmails: Record<EmailCategory, string>;

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
      console.log('✉️ Email service configured with Resend');
      console.log('   Email addresses:');
      console.log(`     noreply: ${this.fromEmails.noreply}`);
      console.log(`     alerts: ${this.fromEmails.alerts}`);
      console.log(`     support: ${this.fromEmails.support}`);
      console.log(`     inquiries: ${this.fromEmails.inquiries}`);
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
      console.log('✉️ Email service configured with SMTP');
    } else {
      console.warn('⚠️ Email service not configured. Set RESEND_API_KEY or SMTP credentials.');
      console.warn('   Get a free Resend API key at: https://resend.com');
    }
  }

  /**
   * Get the appropriate "from" address for an email category
   */
  getFromAddress(category: EmailCategory = 'noreply'): string {
    return this.fromEmails[category];
  }

  async sendEmail(config: EmailConfig): Promise<void> {
    // Get the appropriate "from" address based on category
    const fromAddress = this.getFromAddress(config.category || 'noreply');

    // Skip email sending if not configured
    if (this.provider === 'none') {
      console.log('📧 [DEV MODE] Email skipped (no email provider configured):');
      console.log(`   From: ${fromAddress}`);
      console.log(`   To: ${config.to}`);
      console.log(`   Subject: ${config.subject}`);
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
      console.log(`✅ Email sent (${config.category || 'noreply'}) to ${config.to}: ${config.subject}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
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
   * Send weekly statistics email to Pro members
   */
  async sendWeeklyStats(data: WeeklyStatsData): Promise<void> {
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
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">${data.period}</p>
    </div>

    <!-- Greeting -->
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>${data.userName}</strong>,
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
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${data.topPerformingProperty.title}</div>
        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${data.topPerformingProperty.address}</div>
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

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        You're receiving this email because you're a Pro member of Balkan Estate.
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Balkan Estate. All rights reserved.
      </p>
    </div>
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
      <p style="color: #ddd6fe; margin: 8px 0 0 0; font-size: 14px;">${data.period}</p>
    </div>

    <!-- Greeting -->
    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>${data.agencyName}</strong>,
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
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${data.topAgent.name}</div>
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
        <div style="color: #374151; font-weight: 600; font-size: 14px;">${data.topProperty.title}</div>
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

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        You're receiving this email as an agency owner on Balkan Estate.
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} Balkan Estate. All rights reserved.
      </p>
    </div>
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
        ${params.senderAvatarUrl
          ? `<img src="${params.senderAvatarUrl}" alt="${params.senderName}" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 12px; object-fit: cover;">`
          : `<div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); margin-right: 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 18px;">${params.senderName.charAt(0).toUpperCase()}</div>`
        }
        <div>
          <div style="font-weight: 600; color: #374151; font-size: 16px;">${params.senderName}</div>
          <div style="font-size: 12px; color: #6b7280;">sent you a message</div>
        </div>
      </div>

      <!-- Message Preview -->
      <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.5;">"${params.messagePreview}"</p>
      </div>

      ${params.propertyTitle ? `
      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        ${params.propertyImageUrl ? `<img src="${params.propertyImageUrl}" alt="${params.propertyTitle}" style="width: 100%; height: 120px; object-fit: cover;">` : ''}
        <div style="padding: 12px;">
          <div style="font-weight: 600; color: #374151; font-size: 14px;">${params.propertyTitle}</div>
          <div style="font-size: 12px; color: #6b7280;">${params.propertyAddress}${params.propertyCity ? `, ${params.propertyCity}` : ''}</div>
        </div>
      </div>
      ` : ''}

      <!-- CTA -->
      <a href="${params.conversationUrl}"
         style="display: block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        Reply to Message →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate
      </p>
    </div>
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
    const html = '<html><body><h1>Welcome ' + agencyName + '!</h1><p>Use coupon <strong>' + couponCode + '</strong> for 1 week FREE featured listing.</p><p>Valid until: ' + expiryDate.toLocaleDateString() + '</p></body></html>';
    await this.sendEmail({
      to: email,
      subject: agencyName + ' - Get 1 Week FREE Featured Listing!',
      html,
      text: 'Welcome! Use coupon ' + couponCode + ' for 1 week free. Valid until ' + expiryDate.toLocaleDateString(),
    });
  }

  async sendExpiryReminder(email: string, agencyName: string, expiryDate: Date, couponCode: string, discount: number): Promise<void> {
    const html = '<html><body><h1>Your Featured Listing Expires Tomorrow!</h1><p>Hi ' + agencyName + ',</p><p>Your subscription expires on ' + expiryDate.toLocaleDateString() + '</p><p>Use coupon <strong>' + couponCode + '</strong> for ' + discount + '% off renewal!</p></body></html>';
    await this.sendEmail({
      to: email,
      subject: agencyName + ' - Expires Tomorrow! ' + discount + '% OFF',
      html,
      text: 'Your listing expires ' + expiryDate.toLocaleDateString() + '. Use ' + couponCode + ' for ' + discount + '% off!',
    });
  }

  async sendSubscriptionConfirmation(email: string, agencyName: string, details: any): Promise<void> {
    const html = '<html><body><h1>Subscription Activated!</h1><p>Hi ' + agencyName + ',</p><p>Your featured listing is now active.</p><p>Plan: ' + details.interval + '</p><p>Price: €' + details.price + '</p><p>Renews: ' + details.endDate.toLocaleDateString() + '</p></body></html>';
    await this.sendEmail({
      to: email,
      subject: agencyName + ' - Featured Listing Active!',
      html,
      text: 'Your subscription is active! Renews: ' + details.endDate.toLocaleDateString(),
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
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
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
    New listing in ${params.property.city}! ${params.property.title} for €${params.property.price.toLocaleString()} - matches your "${params.searchName}" search.
  </div>

  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header with urgency -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 24px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 12px; font-weight: 600;">✨ JUST LISTED</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">New Property Match!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px;">From your search: "${params.searchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
        Hey <strong>${params.recipientName}</strong>! We found something you might love:
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
        ${params.property.imageUrl ? `<img src="${params.property.imageUrl}" alt="${params.property.title}" style="width: 100%; height: 180px; object-fit: cover;">` : '<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 48px;">🏠</span></div>'}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 6px;">${params.property.title}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">📍 ${params.property.address}, ${params.property.city}</div>
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
      <a href="${frontendUrl}/property/${params.property.id}"
         style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
        View Property Details →
      </a>

      <!-- Secondary action -->
      <p style="text-align: center; margin: 16px 0 0 0;">
        <a href="${frontendUrl}/saved-searches" style="color: #6b7280; font-size: 13px; text-decoration: none;">Manage your alerts →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        Alert from your saved search: "${params.searchName}"
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject: `Just listed in ${params.property.city}: ${params.property.title} - €${params.property.price.toLocaleString()}`,
      html,
      text: `Hey ${params.recipientName}!\n\nNew property match for "${params.searchName}"!\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n€${params.property.price.toLocaleString()}\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nHot properties go fast! View details: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} Balkan Estate`,
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
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const frequencyLabel = params.frequency === 'daily' ? 'Daily' : params.frequency === 'weekly' ? 'Weekly' : '';

    const propertyCards = params.properties.slice(0, 5).map(p => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 12px;">
        <div style="display: flex;">
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.title}" style="width: 100px; height: 80px; object-fit: cover;">` : '<div style="width: 100px; height: 80px; background: #e5e7eb;"></div>'}
          <div style="padding: 10px; flex: 1;">
            <div style="font-weight: 600; color: #374151; font-size: 13px; margin-bottom: 2px;">${p.title}</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">${p.city}</div>
            <div style="font-size: 14px; font-weight: 700; color: #059669;">€${p.price.toLocaleString()}</div>
          </div>
        </div>
      </div>
    `).join('');

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
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px;">${frequencyLabel} update for "${params.searchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>${params.recipientName}</strong>, we found ${params.properties.length} new properties matching your search!
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

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        You're receiving this because you have alerts enabled for "${params.searchName}"
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate
      </p>
    </div>
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
      beds: number;
      baths: number;
      sqft: number;
      imageUrl?: string;
    };
  }): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
    const savings = params.property.previousPrice - params.property.newPrice;

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
    Save €${savings.toLocaleString()}! ${params.property.title} just dropped ${params.property.percentageDrop}% - now €${params.property.newPrice.toLocaleString()}
  </div>

  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Header with savings highlight -->
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 24px; text-align: center;">
      <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 16px; margin-bottom: 12px;">
        <span style="color: #ffffff; font-size: 14px; font-weight: 700;">🔥 ${params.property.percentageDrop}% OFF</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700;">Price Just Dropped!</h1>
      <p style="color: #fecaca; margin: 12px 0 0 0; font-size: 18px; font-weight: 600;">Save €${savings.toLocaleString()}</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
        Great news, <strong>${params.recipientName}</strong>! A property you saved just became more affordable:
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
        ${params.property.imageUrl ? `<img src="${params.property.imageUrl}" alt="${params.property.title}" style="width: 100%; height: 180px; object-fit: cover;">` : '<div style="width: 100%; height: 120px; background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 48px;">🏠</span></div>'}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #1f2937; font-size: 17px; margin-bottom: 6px;">${params.property.title}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">📍 ${params.property.address}, ${params.property.city}</div>

          <!-- Price comparison - prominent -->
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px;">Was</div>
                <div style="font-size: 18px; color: #9ca3af; text-decoration: line-through;">€${params.property.previousPrice.toLocaleString()}</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 20%; vertical-align: middle;">
                <div style="font-size: 24px; color: #ef4444;">→</div>
              </div>
              <div style="display: table-cell; text-align: center; width: 40%;">
                <div style="font-size: 11px; color: #059669; text-transform: uppercase; margin-bottom: 4px; font-weight: 600;">Now</div>
                <div style="font-size: 24px; font-weight: 700; color: #059669;">€${params.property.newPrice.toLocaleString()}</div>
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
      <div style="background: #fffbeb; border-radius: 8px; padding: 12px; margin-bottom: 20px; text-align: center;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          ⚡ <strong>Price drops attract buyers fast.</strong> Don't miss this opportunity!
        </p>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${params.property.id}"
         style="display: block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px; border-radius: 10px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);">
        Claim This Deal - Save €${savings.toLocaleString()} →
      </a>

      <!-- Secondary action -->
      <p style="text-align: center; margin: 16px 0 0 0;">
        <a href="${frontendUrl}/saved" style="color: #6b7280; font-size: 13px; text-decoration: none;">View all saved properties →</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        You saved this property and enabled price drop alerts
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.recipientEmail,
      subject: `Price dropped ${params.property.percentageDrop}%! Save €${savings.toLocaleString()} on ${params.property.title}`,
      html,
      text: `Great news, ${params.recipientName}!\n\nA property you saved just dropped in price!\n\n${params.property.title}\n${params.property.address}, ${params.property.city}\n\nWas: €${params.property.previousPrice.toLocaleString()}\nNow: €${params.property.newPrice.toLocaleString()}\nYou save: €${savings.toLocaleString()} (${params.property.percentageDrop}% off)\n\n${params.property.beds} beds · ${params.property.baths} baths · ${params.property.sqft.toLocaleString()} sqft\n\nPrice drops attract buyers fast. Don't miss this opportunity!\n\nView property: ${frontendUrl}/property/${params.property.id}\n\n© ${new Date().getFullYear()} Balkan Estate`,
      category: 'alerts',
    });
  }

  /**
   * Send subscription renewal reminder
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
        Hi <strong>${params.agentName}</strong>, you've received a new inquiry!
      </p>

      <!-- Buyer Info Card -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">👤 From:</div>
        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${params.buyerName}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
          📧 <a href="mailto:${params.buyerEmail}" style="color: #7c3aed;">${params.buyerEmail}</a>
        </div>
        ${params.buyerPhone ? `<div style="font-size: 14px; color: #6b7280; margin-top: 4px;">📱 ${params.buyerPhone}</div>` : ''}
      </div>

      ${params.propertyTitle ? `
      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">🏠 Property:</div>
        <div style="font-size: 14px; color: #1f2937;">${params.propertyTitle}</div>
        ${params.location ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">📍 ${params.location}</div>` : ''}
        ${params.propertyId ? `<a href="${frontendUrl}/property/${params.propertyId}" style="display: inline-block; margin-top: 8px; font-size: 12px; color: #7c3aed;">View Property →</a>` : ''}
      </div>
      ` : ''}

      ${params.location && !params.propertyTitle ? `
      <!-- Area Search Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">📍 Area of Interest:</div>
        <div style="font-size: 14px; color: #1f2937;">${params.location}</div>
      </div>
      ` : ''}

      <!-- Message Card -->
      <div style="background: #faf5ff; border-left: 4px solid #7c3aed; padding: 16px; margin-bottom: 16px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">💬 Message:</div>
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6; white-space: pre-wrap;">${params.message}</p>
      </div>

      <!-- Reply CTA -->
      <a href="mailto:${params.buyerEmail}?subject=Re: ${params.propertyTitle ? `Inquiry about ${params.propertyTitle}` : 'Your Balkan Estate Inquiry'}"
         style="display: block; background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        Reply to ${params.buyerName} →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        This inquiry was sent through Balkan Estate
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate
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
        Hey ${params.userName},
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        We received a request to reset your password. No worries—it happens to the best of us! Click the button below to create a new password:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.resetUrl}"
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
        ${params.resetUrl}
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
        © ${new Date().getFullYear()} Balkan Estate · Your security is our priority
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: 'Reset your Balkan Estate password',
      html,
      text: `Hey ${params.userName},\n\nWe received a request to reset your password. No worries—it happens to the best of us!\n\nReset your password here:\n${params.resetUrl}\n\nThis link expires in 1 hour.\n\nPassword tips:\n- Use at least 8 characters\n- Mix uppercase, lowercase, and numbers\n- Avoid using common words or personal info\n\nIf you didn't request this reset, you can safely ignore this email.\n\nNeed help? Contact us at support@balkanestateai.com\n\n© ${new Date().getFullYear()} Balkan Estate`,
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
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to Balkan Estate!</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 15px;">Your journey to the perfect property starts here</p>
    </div>

    <div style="padding: 32px 24px;">
      <!-- Personalized greeting -->
      <p style="color: #1f2937; font-size: 18px; margin: 0 0 8px 0; font-weight: 600;">
        Hey ${params.userName}! 👋
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Thanks for joining Balkan Estate! We're excited to help you discover amazing properties across the Balkans. Just one quick step to get started:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.verificationUrl}"
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
        Didn't sign up for Balkan Estate? No worries—just ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Questions? We're here to help at <a href="mailto:support@balkanestateai.com" style="color: #0252CD; text-decoration: none;">support@balkanestateai.com</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: 'Verify your email to start exploring properties 🏠',
      html,
      text: `Hey ${params.userName}!\n\nWelcome to Balkan Estate! We're excited to help you discover amazing properties across the Balkans.\n\nVerify your email to get started:\n${params.verificationUrl}\n\nOnce verified, you can:\n- Search thousands of properties\n- Save your favorite listings\n- Get alerts for new matches\n- Message agents directly\n\nThis link expires in 24 hours.\n\nQuestions? Contact us at support@balkanestateai.com\n\n© ${new Date().getFullYear()} Balkan Estate`,
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
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    You're all set! Start exploring thousands of properties across the Balkans.
  </div>

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <!-- Celebration Header -->
    <div style="background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); padding: 48px 24px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 48px;">🎉</span>
      </div>
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">You're In, ${params.userName}!</h1>
      <p style="color: #bfdbfe; margin: 12px 0 0 0; font-size: 16px;">Your account is verified and ready to go</p>
    </div>

    <div style="padding: 32px 24px;">
      <!-- Personal welcome -->
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
        Welcome aboard! You now have full access to Balkan Estate—the smartest way to find properties across Croatia, Slovenia, Montenegro, Serbia, Albania, Kosovo, North Macedonia, and Bosnia.
      </p>

      <!-- Quick Start Guide -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
        <p style="color: #92400e; font-weight: 700; font-size: 15px; margin: 0 0 16px 0;">🚀 Quick Start Guide</p>

        <div style="margin-bottom: 16px;">
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 32px; vertical-align: top;">
              <div style="width: 24px; height: 24px; background: #0252CD; border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">1</div>
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <p style="color: #374151; font-size: 14px; margin: 0;"><strong>Set up your search</strong> — Tell us what you're looking for (location, budget, property type)</p>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 32px; vertical-align: top;">
              <div style="width: 24px; height: 24px; background: #0252CD; border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">2</div>
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <p style="color: #374151; font-size: 14px; margin: 0;"><strong>Save your favorites</strong> — Click the heart icon on properties you love</p>
            </div>
          </div>
        </div>

        <div>
          <div style="display: table; width: 100%;">
            <div style="display: table-cell; width: 32px; vertical-align: top;">
              <div style="width: 24px; height: 24px; background: #0252CD; border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">3</div>
            </div>
            <div style="display: table-cell; vertical-align: top;">
              <p style="color: #374151; font-size: 14px; margin: 0;"><strong>Enable alerts</strong> — Get notified instantly when matching properties are listed</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <p style="color: #374151; font-weight: 600; font-size: 15px; margin: 0 0 16px 0;">What you can do now:</p>
      <div style="display: table; width: 100%; border-collapse: separate; border-spacing: 8px;">
        <div style="display: table-row;">
          <div style="display: table-cell; width: 50%; background: #f0f9ff; border-radius: 10px; padding: 16px; vertical-align: top;">
            <div style="font-size: 28px; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 600; color: #0369a1; font-size: 14px;">Smart Search</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Filter by location, price, size & more</div>
          </div>
          <div style="display: table-cell; width: 50%; background: #fef2f2; border-radius: 10px; padding: 16px; vertical-align: top;">
            <div style="font-size: 28px; margin-bottom: 8px;">❤️</div>
            <div style="font-weight: 600; color: #dc2626; font-size: 14px;">Save & Compare</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Build your shortlist of top picks</div>
          </div>
        </div>
        <div style="display: table-row;">
          <div style="display: table-cell; width: 50%; background: #f0fdf4; border-radius: 10px; padding: 16px; vertical-align: top;">
            <div style="font-size: 28px; margin-bottom: 8px;">🔔</div>
            <div style="font-weight: 600; color: #16a34a; font-size: 14px;">Instant Alerts</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Never miss a new listing</div>
          </div>
          <div style="display: table-cell; width: 50%; background: #faf5ff; border-radius: 10px; padding: 16px; vertical-align: top;">
            <div style="font-size: 28px; margin-bottom: 8px;">💬</div>
            <div style="font-weight: 600; color: #7c3aed; font-size: 14px;">Direct Messaging</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Chat with agents in real-time</div>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${frontendUrl}/search"
           style="display: inline-block; background: linear-gradient(135deg, #0252CD 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(2, 82, 205, 0.4);">
          Start Searching Now →
        </a>
      </div>

      <!-- Pro tip -->
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="color: #374151; font-size: 13px; margin: 0;">
          <strong>💡 Pro tip:</strong> Complete your profile to get personalized property recommendations based on your preferences!
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 12px; margin: 0 0 8px 0;">
        Need help? Just reply to this email or visit our <a href="${frontendUrl}/help" style="color: #0252CD; text-decoration: none;">Help Center</a>
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 0;">
        © ${new Date().getFullYear()} Balkan Estate · Find your place in the Balkans
      </p>
    </div>
  </div>
</body>
</html>`;

    await this.sendEmail({
      to: params.email,
      subject: "You're in! Start exploring properties now 🏠",
      html,
      text: `Welcome aboard, ${params.userName}!\n\nYou now have full access to Balkan Estate—the smartest way to find properties across the Balkans.\n\nQuick Start Guide:\n1. Set up your search — Tell us what you're looking for\n2. Save your favorites — Click the heart icon on properties you love\n3. Enable alerts — Get notified instantly when matching properties are listed\n\nStart exploring: ${frontendUrl}/search\n\nPro tip: Complete your profile to get personalized property recommendations!\n\nNeed help? Contact us at support@balkanestateai.com\n\n© ${new Date().getFullYear()} Balkan Estate`,
      category: 'support',
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
export const sendAgentInquiry = emailServiceInstance.sendAgentInquiry.bind(emailServiceInstance);
export const sendPasswordResetEmail = emailServiceInstance.sendPasswordResetEmail.bind(emailServiceInstance);
export const sendEmailVerification = emailServiceInstance.sendEmailVerification.bind(emailServiceInstance);
export const sendWelcomeEmail = emailServiceInstance.sendWelcomeEmail.bind(emailServiceInstance);
export const getFromAddress = emailServiceInstance.getFromAddress.bind(emailServiceInstance);
