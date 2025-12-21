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
}

const emailServiceInstance = new EmailService();
export default emailServiceInstance;
export const sendEmail = emailServiceInstance.sendEmail.bind(emailServiceInstance);
export const sendNewMessageNotification = emailServiceInstance.sendNewMessageNotification.bind(emailServiceInstance);
