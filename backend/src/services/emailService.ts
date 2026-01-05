import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
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

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;
  private provider: EmailProvider = 'none';
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@balkanestate.com';

    // Priority: Resend > SMTP > None
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.provider = 'resend';
      console.log('✉️ Email service configured with Resend');
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

  async sendEmail(config: EmailConfig): Promise<void> {
    // Skip email sending if not configured
    if (this.provider === 'none') {
      console.log('📧 [DEV MODE] Email skipped (no email provider configured):');
      console.log(`   To: ${config.to}`);
      console.log(`   Subject: ${config.subject}`);
      return;
    }

    try {
      if (this.provider === 'resend' && this.resend) {
        const { error } = await this.resend.emails.send({
          from: this.fromEmail,
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
          from: this.fromEmail,
          to: config.to,
          subject: config.subject,
          html: config.html,
          text: config.text || '',
        });
      }
      console.log('✅ Email sent to ' + config.to + ': ' + config.subject);
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
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
export const sendEmail = emailServiceInstance.sendEmail.bind(emailServiceInstance);
export const sendNewMessageNotification = emailServiceInstance.sendNewMessageNotification.bind(emailServiceInstance);
export const sendWeeklyStats = emailServiceInstance.sendWeeklyStats.bind(emailServiceInstance);
export const sendAgencyWeeklyStats = emailServiceInstance.sendAgencyWeeklyStats.bind(emailServiceInstance);
