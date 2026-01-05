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
    // Priority: Resend > SMTP > None
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.provider = 'resend';
      // Use onboarding@resend.dev for testing (required without verified domain)
      // Once you verify your domain, set EMAIL_FROM to your own address
      this.fromEmail = process.env.EMAIL_FROM || 'Balkan Estate <onboarding@resend.dev>';
      console.log('✉️ Email service configured with Resend');
      console.log(`   From: ${this.fromEmail}`);
    } else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@balkanestate.com';
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
      this.fromEmail = 'noreply@balkanestate.com';
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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">🏠 New Property Match!</h1>
      <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 13px;">From your saved search: "${params.searchName}"</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>${params.recipientName}</strong>, a new property matches your search!
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        ${params.property.imageUrl ? `<img src="${params.property.imageUrl}" alt="${params.property.title}" style="width: 100%; height: 160px; object-fit: cover;">` : ''}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #374151; font-size: 16px; margin-bottom: 4px;">${params.property.title}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">${params.property.address}, ${params.property.city}</div>
          <div style="font-size: 24px; font-weight: 700; color: #059669; margin-bottom: 12px;">€${params.property.price.toLocaleString()}</div>
          <div style="display: flex; gap: 16px; font-size: 13px; color: #6b7280;">
            <span>🛏 ${params.property.beds} beds</span>
            <span>🚿 ${params.property.baths} baths</span>
            <span>📐 ${params.property.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${params.property.id}"
         style="display: block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        View Property →
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
      subject: `🏠 New match: ${params.property.title} - €${params.property.price.toLocaleString()}`,
      html,
      text: `New property match for "${params.searchName}": ${params.property.title} in ${params.property.city} - €${params.property.price.toLocaleString()}`,
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
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">📉 Price Drop Alert!</h1>
      <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 14px;">Save €${savings.toLocaleString()} (${params.property.percentageDrop}% off)</p>
    </div>

    <div style="padding: 24px;">
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>${params.recipientName}</strong>, great news! A property you saved just dropped in price!
      </p>

      <!-- Property Card -->
      <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px;">
        ${params.property.imageUrl ? `<img src="${params.property.imageUrl}" alt="${params.property.title}" style="width: 100%; height: 160px; object-fit: cover;">` : ''}
        <div style="padding: 16px;">
          <div style="font-weight: 700; color: #374151; font-size: 16px; margin-bottom: 4px;">${params.property.title}</div>
          <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">${params.property.address}, ${params.property.city}</div>

          <!-- Price comparison -->
          <div style="background: #fef2f2; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div>
                <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">Was</div>
                <div style="font-size: 16px; color: #9ca3af; text-decoration: line-through;">€${params.property.previousPrice.toLocaleString()}</div>
              </div>
              <div style="font-size: 20px; color: #ef4444;">→</div>
              <div>
                <div style="font-size: 11px; color: #059669; text-transform: uppercase;">Now</div>
                <div style="font-size: 20px; font-weight: 700; color: #059669;">€${params.property.newPrice.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 16px; font-size: 13px; color: #6b7280;">
            <span>🛏 ${params.property.beds} beds</span>
            <span>🚿 ${params.property.baths} baths</span>
            <span>📐 ${params.property.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <a href="${frontendUrl}/property/${params.property.id}"
         style="display: block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 14px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
        View Property & Save €${savings.toLocaleString()} →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 11px; margin: 0 0 4px 0;">
        You're receiving this because you saved this property
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
      subject: `📉 Price dropped ${params.property.percentageDrop}%: ${params.property.title} now €${params.property.newPrice.toLocaleString()}`,
      html,
      text: `Price drop alert! ${params.property.title} dropped from €${params.property.previousPrice.toLocaleString()} to €${params.property.newPrice.toLocaleString()} (${params.property.percentageDrop}% off)`,
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
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
export const sendEmail = emailServiceInstance.sendEmail.bind(emailServiceInstance);
export const sendNewMessageNotification = emailServiceInstance.sendNewMessageNotification.bind(emailServiceInstance);
export const sendWeeklyStats = emailServiceInstance.sendWeeklyStats.bind(emailServiceInstance);
export const sendAgencyWeeklyStats = emailServiceInstance.sendAgencyWeeklyStats.bind(emailServiceInstance);
export const sendPropertyAlert = emailServiceInstance.sendPropertyAlert.bind(emailServiceInstance);
export const sendNewListingsDigest = emailServiceInstance.sendNewListingsDigest.bind(emailServiceInstance);
export const sendPriceDropAlert = emailServiceInstance.sendPriceDropAlert.bind(emailServiceInstance);
