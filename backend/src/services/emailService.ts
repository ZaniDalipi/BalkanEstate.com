import nodemailer from 'nodemailer';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null;
  private isConfigured: boolean;

  constructor() {
    // Check if SMTP credentials are configured
    this.isConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('✉️ Email service configured and ready');
    } else {
      this.transporter = null;
      console.warn('⚠️ Email service not configured - SMTP credentials missing. Emails will be skipped in development mode.');
    }
  }

  async sendEmail(config: EmailConfig): Promise<void> {
    // Skip email sending if not configured (development mode)
    if (!this.isConfigured || !this.transporter) {
      console.log('📧 [DEV MODE] Email skipped (no SMTP configured):');
      console.log(`   To: ${config.to}`);
      console.log(`   Subject: ${config.subject}`);
      return; // Don't throw error, just skip
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: config.to,
        subject: config.subject,
        html: config.html,
        text: config.text || '',
      });
      console.log('✅ Email sent to ' + config.to + ': ' + config.subject);
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
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

  async sendNewMessageNotification(params: { recipientEmail: string; recipientName: string; senderName: string; messageText?: string; appUrl?: string; [key: string]: any }): Promise<void> {
    const html = '<html><body><h3>New Message from ' + params.senderName + '</h3><p>' + (params.messageText || 'You have a new message') + '</p></body></html>';
    await this.sendEmail({
      to: params.recipientEmail,
      subject: 'New message from ' + params.senderName,
      html,
      text: 'New message from ' + params.senderName,
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
