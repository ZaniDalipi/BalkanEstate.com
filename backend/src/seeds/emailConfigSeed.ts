import EmailConfig from '../models/EmailConfig';
import { dbLogger } from '../utils/logger';

// Default email configurations for all email types in the system
export const defaultEmailConfigs = [
  // ===== TRANSACTIONAL EMAILS =====
  {
    key: 'email-verification',
    name: 'Email Verification',
    description: 'Sent when a user signs up to verify their email address',
    category: 'transactional',
    fromCategory: 'noreply',
    subject: 'Verify your email address - BalkanEstate',
    preheaderText: 'Please verify your email to complete your registration',
    headerTitle: 'Verify Your Email',
    headerEmoji: '📧',
    headerGradient: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;" class="ec-text">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 24px 0;" class="ec-text-muted">
        Thanks for signing up! Please verify your email address by clicking the button below.
      </p>
      <p style="color: #4b5563; font-size: 14px; margin: 0 0 16px 0;" class="ec-text-muted">
        This link will expire in <strong>24 hours</strong>.
      </p>
      <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0 0; word-break: break-all;" class="ec-text-muted">
        If the button above doesn&rsquo;t work, copy and paste this link into your browser:<br/>
        <a href="{{verificationUrl}}" style="color: #0252CD; text-decoration: underline;" class="ec-link">{{verificationUrl}}</a>
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Verify Email Address',
    ctaUrl: '{{verificationUrl}}',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'verificationUrl', description: 'Email verification URL', required: true, example: 'https://balkanestate.com/verify-email?token=abc123' },
    ],
    isActive: true,
  },
  {
    key: 'password-reset',
    name: 'Password Reset',
    description: 'Sent when a user requests to reset their password',
    category: 'transactional',
    fromCategory: 'noreply',
    subject: 'Reset your password - BalkanEstate',
    preheaderText: 'Password reset request for your BalkanEstate account',
    headerTitle: 'Reset Your Password',
    headerEmoji: '🔐',
    headerGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
        <p style="color: #991b1b; font-size: 13px; margin: 0;">
          <strong>Security Notice:</strong> Never share this link with anyone. BalkanEstate staff will never ask for your password.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Reset Password',
    ctaUrl: '{{resetUrl}}',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'resetUrl', description: 'Password reset URL', required: true, example: 'https://balkanestate.com/reset-password?token=abc123' },
    ],
    isActive: true,
  },
  {
    key: 'welcome-email',
    name: 'Welcome Email',
    description: 'Sent after a user verifies their email address',
    category: 'transactional',
    fromCategory: 'support',
    subject: 'Welcome to BalkanEstate! {{emoji}}',
    preheaderText: 'Your journey to finding the perfect property starts now',
    headerTitle: 'Welcome to BalkanEstate!',
    headerEmoji: '🎉',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        Your email has been verified and your account is now active! Welcome to BalkanEstate, the premier real estate platform for the Balkans.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's what you can do:
      </p>
      <ul style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Browse thousands of properties across the Balkans</li>
        <li style="margin-bottom: 8px;">Save your favorite properties and searches</li>
        <li style="margin-bottom: 8px;">Set up alerts for new listings matching your criteria</li>
        <li style="margin-bottom: 8px;">Contact agents directly through our platform</li>
      </ul>
    `,
    ctaEnabled: true,
    ctaText: 'Start Exploring',
    ctaUrl: '{{frontendUrl}}/search',
    showUnsubscribe: true,
    unsubscribeType: 'marketing',
    footerReason: 'You received this email because you signed up for BalkanEstate.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
      { name: 'emoji', description: 'Welcome emoji', required: false, example: '🎉' },
    ],
    isActive: true,
  },

  // ===== NOTIFICATION EMAILS =====
  {
    key: 'new-message',
    name: 'New Message Notification',
    description: 'Sent when a user receives a new message',
    category: 'notifications',
    fromCategory: 'noreply',
    subject: '{{senderName}} sent you a message',
    preheaderText: '{{messagePreview}}',
    headerTitle: 'New Message',
    headerEmoji: '💬',
    headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{recipientName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        You have a new message from <strong>{{senderName}}</strong>:
      </p>
      <div style="background: #f9fafb; border-left: 4px solid #7c3aed; padding: 16px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0; font-style: italic;">"{{messagePreview}}"</p>
      </div>
      {{#if propertyTitle}}
      <div style="background: #f0f9ff; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
        <p style="color: #0369a1; font-size: 13px; margin: 0;">
          <strong>Regarding:</strong> {{propertyTitle}}
        </p>
      </div>
      {{/if}}
    `,
    ctaEnabled: true,
    ctaText: 'View Conversation',
    ctaUrl: '{{conversationUrl}}',
    showUnsubscribe: true,
    unsubscribeType: 'messages',
    footerReason: 'You received this because someone sent you a message on BalkanEstate.',
    variables: [
      { name: 'recipientName', description: 'Recipient\'s name', required: true, example: 'John Doe' },
      { name: 'senderName', description: 'Sender\'s name', required: true, example: 'Jane Smith' },
      { name: 'messagePreview', description: 'Preview of the message', required: true, example: 'Hi, I\'m interested in your property...' },
      { name: 'propertyTitle', description: 'Property title (if applicable)', required: false, example: 'Modern Apartment in Belgrade' },
      { name: 'conversationUrl', description: 'URL to view the conversation', required: true, example: 'https://balkanestate.com/inbox/123' },
    ],
    isActive: true,
  },
  {
    key: 'agent-inquiry',
    name: 'Agent Inquiry',
    description: 'Sent to agents when they receive a property inquiry',
    category: 'notifications',
    fromCategory: 'inquiries',
    subject: 'New inquiry for {{propertyTitle}}',
    preheaderText: '{{buyerName}} is interested in your property',
    headerTitle: 'New Property Inquiry',
    headerEmoji: '🏠',
    headerGradient: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{agentName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        You've received a new inquiry from <strong>{{buyerName}}</strong> about:
      </p>
      <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
        <p style="color: #0369a1; font-size: 16px; font-weight: 600; margin: 0 0 4px 0;">{{propertyTitle}}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">{{propertyAddress}}</p>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>Message:</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">{{inquiryMessage}}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>Contact:</strong> {{buyerEmail}}</p>
      {{#if buyerPhone}}
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;"><strong>Phone:</strong> {{buyerPhone}}</p>
      {{/if}}
    `,
    ctaEnabled: true,
    ctaText: 'Respond to Inquiry',
    ctaUrl: '{{inquiryUrl}}',
    showUnsubscribe: false,
    variables: [
      { name: 'agentName', description: 'Agent\'s name', required: true, example: 'John Agent' },
      { name: 'buyerName', description: 'Buyer\'s name', required: true, example: 'Jane Buyer' },
      { name: 'buyerEmail', description: 'Buyer\'s email', required: true, example: 'jane@example.com' },
      { name: 'buyerPhone', description: 'Buyer\'s phone', required: false, example: '+381 11 123 4567' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern Apartment in Belgrade' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'Kneza Milosa 50, Belgrade' },
      { name: 'inquiryMessage', description: 'Inquiry message content', required: true, example: 'I would like to schedule a viewing...' },
      { name: 'inquiryUrl', description: 'URL to respond to inquiry', required: true, example: 'https://balkanestate.com/inbox/123' },
    ],
    isActive: true,
  },

  // ===== ALERT EMAILS =====
  {
    key: 'property-alert',
    name: 'Property Alert',
    description: 'Sent when new properties match user\'s saved search',
    category: 'alerts',
    fromCategory: 'alerts',
    subject: '{{count}} new properties match your search',
    preheaderText: 'New listings in {{location}} matching your criteria',
    headerTitle: 'New Properties Found!',
    headerEmoji: '🏡',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        We found <strong>{{count}} new properties</strong> matching your saved search for "{{searchName}}".
      </p>
      {{propertyCards}}
    `,
    ctaEnabled: true,
    ctaText: 'View All Matches',
    ctaUrl: '{{searchUrl}}',
    showUnsubscribe: true,
    unsubscribeType: 'propertyAlerts',
    footerReason: 'You received this because you have property alerts enabled for your saved searches.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'count', description: 'Number of matching properties', required: true, example: '5' },
      { name: 'searchName', description: 'Name of the saved search', required: true, example: 'Apartments in Belgrade' },
      { name: 'location', description: 'Search location', required: true, example: 'Belgrade' },
      { name: 'propertyCards', description: 'HTML cards for each property', required: true, example: '<div>...</div>' },
      { name: 'searchUrl', description: 'URL to view search results', required: true, example: 'https://balkanestate.com/search?...' },
    ],
    isActive: true,
  },
  {
    key: 'price-drop-alert',
    name: 'Price Drop Alert',
    description: 'Sent when a saved property has a price reduction',
    category: 'alerts',
    fromCategory: 'alerts',
    subject: 'Price dropped on {{propertyTitle}}!',
    preheaderText: 'Good news! A property you saved is now {{percentDrop}}% cheaper',
    headerTitle: 'Price Drop Alert!',
    headerEmoji: '📉',
    headerGradient: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Great news! A property you saved has dropped in price:
      </p>
      <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 0 0 24px 0; text-align: center;">
        <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">{{propertyTitle}}</p>
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">{{propertyAddress}}</p>
        <div style="display: inline-block; margin-bottom: 8px;">
          <span style="color: #6b7280; font-size: 16px; text-decoration: line-through;">{{oldPrice}}</span>
          <span style="color: #b91c1c; font-size: 24px; font-weight: 700; margin-left: 12px;">{{newPrice}}</span>
        </div>
        <p style="color: #b91c1c; font-size: 14px; font-weight: 600; margin: 0;">Save {{savings}} ({{percentDrop}}% off)</p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'View Property',
    ctaUrl: '{{propertyUrl}}',
    showUnsubscribe: true,
    unsubscribeType: 'priceDrops',
    footerReason: 'You received this because you have price drop alerts enabled for your saved properties.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern Apartment in Belgrade' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'Kneza Milosa 50, Belgrade' },
      { name: 'oldPrice', description: 'Previous price', required: true, example: '€150,000' },
      { name: 'newPrice', description: 'New price', required: true, example: '€135,000' },
      { name: 'savings', description: 'Amount saved', required: true, example: '€15,000' },
      { name: 'percentDrop', description: 'Percentage decrease', required: true, example: '10' },
      { name: 'propertyUrl', description: 'URL to view property', required: true, example: 'https://balkanestate.com/property/123' },
    ],
    isActive: true,
  },

  // ===== REPORT EMAILS =====
  {
    key: 'weekly-stats',
    name: 'Weekly Statistics Report',
    description: 'Weekly performance report for Pro members',
    category: 'reports',
    fromCategory: 'support',
    subject: '📊 Your Weekly Stats: {{totalViews}} views, {{totalInquiries}} inquiries',
    preheaderText: 'Your property performance for {{period}}',
    headerTitle: 'Your Weekly Report',
    headerSubtitle: '{{period}}',
    headerEmoji: '📊',
    headerGradient: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's how your properties performed this week:
      </p>
      {{statsGrid}}
      {{topPerformingProperty}}
      {{salesSummary}}
      <div style="margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 8px;">
        <div style="font-weight: 600; color: #374151; margin-bottom: 8px;">💡 Pro Tips</div>
        <ul style="color: #6b7280; font-size: 13px; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">Respond to inquiries within 1 hour to increase conversion by 50%</li>
          <li style="margin-bottom: 4px;">Properties with 10+ photos get 3x more views</li>
          <li>Consider promoting your top property for more visibility</li>
        </ul>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'View Full Analytics',
    ctaUrl: '{{frontendUrl}}/dashboard',
    showUnsubscribe: true,
    unsubscribeType: 'weeklyStats',
    footerReason: 'You\'re receiving this email because you\'re a Pro member of BalkanEstate.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'period', description: 'Report period', required: true, example: 'Dec 30 - Jan 5' },
      { name: 'totalViews', description: 'Total property views', required: true, example: '1,234' },
      { name: 'totalInquiries', description: 'Total inquiries', required: true, example: '15' },
      { name: 'statsGrid', description: 'HTML stats grid', required: true, example: '<div>...</div>' },
      { name: 'topPerformingProperty', description: 'Top property section HTML', required: false, example: '<div>...</div>' },
      { name: 'salesSummary', description: 'Sales summary section HTML', required: false, example: '<div>...</div>' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'agency-weekly-stats',
    name: 'Agency Weekly Statistics',
    description: 'Weekly performance report for agency owners',
    category: 'reports',
    fromCategory: 'support',
    subject: '📊 {{agencyName}} Weekly Report',
    preheaderText: 'Your agency performance for {{period}}',
    headerTitle: 'Agency Weekly Report',
    headerSubtitle: '{{period}}',
    headerEmoji: '🏢',
    headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's how <strong>{{agencyName}}</strong> performed this week:
      </p>
      {{statsGrid}}
      {{topAgent}}
      {{topProperty}}
    `,
    ctaEnabled: true,
    ctaText: 'View Agency Dashboard',
    ctaUrl: '{{frontendUrl}}/account/agency',
    showUnsubscribe: true,
    unsubscribeType: 'weeklyStats',
    footerReason: 'You\'re receiving this email because you\'re an agency owner on BalkanEstate.',
    variables: [
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Premium Real Estate' },
      { name: 'period', description: 'Report period', required: true, example: 'Dec 30 - Jan 5' },
      { name: 'statsGrid', description: 'HTML stats grid', required: true, example: '<div>...</div>' },
      { name: 'topAgent', description: 'Top agent section HTML', required: false, example: '<div>...</div>' },
      { name: 'topProperty', description: 'Top property section HTML', required: false, example: '<div>...</div>' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== MARKETING EMAILS =====
  // ===== PRO USER MONTHLY COUPONS =====
  {
    key: 'monthly-coupon',
    name: 'Pro Monthly Coupons',
    description: 'Monthly promotion coupon refresh for Pro plan members (monthly & yearly billing). Includes actual coupon codes for each tier.',
    category: 'marketing',
    fromCategory: 'support',
    subject: '🎟️ Your {{currentMonth}} Promotion Coupons Are Ready! ({{totalCoupons}} available)',
    preheaderText: 'Your {{currentMonth}} Pro coupons are here — boost your listings now',
    headerTitle: '{{currentMonth}} Coupons Ready!',
    headerSubtitle: 'Your {{planName}} promotion coupons have refreshed',
    headerEmoji: '🎟️',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color:#374151;font-size:16px;margin:0 0 16px 0;">
        Hey <strong>{{userName}}</strong>! 👋
      </p>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        Your <strong>{{planName}}</strong> subscription has been refreshed with new promotion coupons for <strong>{{currentMonth}}</strong>.
        Use them to get your listings seen by more buyers.
      </p>

      <!-- Coupon Summary Card -->
      <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;padding:20px;margin-bottom:20px;border:2px solid #f59e0b;">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:52px;font-weight:800;color:#111827;line-height:1;">{{totalCoupons}}</div>
          <div style="font-size:13px;color:#111827;font-weight:700;margin-top:4px;">Total Coupons Available</div>
        </div>

        <!-- New + Rollover -->
        <div style="background:#ffffff;border-radius:8px;padding:12px;margin-bottom:12px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="text-align:center;width:50%;border-right:1px solid #f59e0b;padding:4px 0;">
                <div style="font-size:22px;font-weight:700;color:#111827;">+{{newCoupons}}</div>
                <div style="font-size:11px;color:#374151;">New This Month</div>
              </td>
              <td style="text-align:center;width:50%;padding:4px 0;">
                <div style="font-size:22px;font-weight:700;color:#111827;">+{{rolledOver}}</div>
                <div style="font-size:11px;color:#374151;">Rolled Over</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Tier Breakdown -->
        <div style="background:#ffffff;border-radius:8px;padding:12px;">
          <div style="font-size:11px;color:#111827;font-weight:700;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Coupon Types</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#047857;">{{highlightedCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">✨ Highlighted</div>
              </td>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#6d28d9;">{{premiumCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">💎 Premium</div>
              </td>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#b91c1c;">{{featuredCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">🔥 Featured</div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Actual Coupon Codes -->
      {{couponCodesList}}

      <!-- Tip -->
      <div style="background:#eff6ff;border-radius:8px;padding:14px;margin-bottom:20px;border-left:4px solid #3b82f6;">
        <p style="color:#1e40af;font-size:13px;margin:0;line-height:1.5;">
          <strong>💡 Pro Tip:</strong> Paste a code when promoting a listing to apply it for free.
          Promoted listings get up to <strong>5× more views</strong>. Unused coupons roll over up to 6 per month.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Use My Coupons →',
    ctaUrl: '{{frontendUrl}}/promotions',
    showUnsubscribe: true,
    footerReason: 'You\'re receiving this as part of your {{planName}} subscription.',
    variables: [
      { name: 'userName',          description: 'User\'s display name',                       required: true,  example: 'Ana Kovač' },
      { name: 'planName',          description: 'Subscription plan name',                     required: true,  example: 'Pro Yearly' },
      { name: 'currentMonth',      description: 'Current month name',                         required: true,  example: 'February' },
      { name: 'totalCoupons',      description: 'Total available coupons (new + rolled over)', required: true, example: '5' },
      { name: 'newCoupons',        description: 'New coupons issued this month',               required: true,  example: '2' },
      { name: 'rolledOver',        description: 'Coupons carried over from last month',        required: true,  example: '3' },
      { name: 'highlightedCoupons',description: '# highlighted coupons (new only)',            required: true,  example: '1' },
      { name: 'premiumCoupons',    description: '# premium coupons (new only)',                required: true,  example: '0' },
      { name: 'featuredCoupons',   description: '# featured coupons (new only)',               required: true,  example: '1' },
      { name: 'couponCodesList',   description: 'Pre-rendered HTML block with actual codes',   required: false, example: '<div>...</div>' },
      { name: 'frontendUrl',       description: 'Frontend base URL',                           required: true,  example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== AGENCY/ENTERPRISE MONTHLY COUPONS =====
  {
    key: 'agency-monthly-coupon',
    name: 'Agency Monthly Coupons',
    description: 'Monthly promotion coupon refresh for Enterprise/Agency plan owners and their agents. No rollover — resets to full allocation each month.',
    category: 'marketing',
    fromCategory: 'support',
    subject: '🏢 {{currentMonth}} Agency Coupons Ready — {{totalCoupons}} promotions for your team',
    preheaderText: 'Your agency\'s {{currentMonth}} promotion coupons have been refreshed',
    headerTitle: '{{currentMonth}} Agency Coupons',
    headerSubtitle: '{{agencyName}} — Enterprise Plan',
    headerEmoji: '🏢',
    headerGradient: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    bodyTemplate: `
      <p style="color:#374151;font-size:16px;margin:0 0 16px 0;">
        Hi <strong>{{userName}}</strong>! 👋
      </p>
      <p style="color:#4b5563;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
        {{isAgentText}}
      </p>

      <!-- Coupon Summary Card -->
      <div style="background:linear-gradient(135deg,#dbeafe 0%,#bfdbfe 100%);border-radius:12px;padding:20px;margin-bottom:20px;border:2px solid #3b82f6;">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="font-size:52px;font-weight:800;color:#111827;line-height:1;">{{totalCoupons}}</div>
          <div style="font-size:13px;color:#111827;font-weight:700;margin-top:4px;">Total Coupons This Month</div>
          <div style="font-size:11px;color:#374151;margin-top:4px;">Shared across your agency team • Resets monthly</div>
        </div>

        <!-- Tier Breakdown -->
        <div style="background:#ffffff;border-radius:8px;padding:12px;">
          <div style="font-size:11px;color:#111827;font-weight:700;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Coupon Types</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#047857;">{{highlightedCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">✨ Highlighted</div>
              </td>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#6d28d9;">{{premiumCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">💎 Premium</div>
              </td>
              <td style="text-align:center;padding:4px 2px;">
                <div style="font-size:20px;font-weight:700;color:#b91c1c;">{{featuredCoupons}}</div>
                <div style="font-size:10px;color:#1f2937;font-weight:600;">🔥 Featured</div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Actual Coupon Codes -->
      {{couponCodesList}}

      <!-- Agency Tip -->
      <div style="background:#f0f9ff;border-radius:8px;padding:14px;margin-bottom:20px;border-left:4px solid #0ea5e9;">
        <p style="color:#0369a1;font-size:13px;margin:0;line-height:1.5;">
          <strong>💡 Agency Tip:</strong> Coordinate with your team to use coupons on your highest-priority listings.
          Featured placements appear at the very top of search results — maximising exposure for new listings first.
          Agency coupons do <strong>not</strong> roll over; unused coupons expire at month end.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Agency Promotions →',
    ctaUrl: '{{frontendUrl}}/agency/promotions',
    showUnsubscribe: true,
    footerReason: 'You\'re receiving this as an {{planName}} member of {{agencyName}}.',
    variables: [
      { name: 'userName',          description: 'Recipient\'s display name',                   required: true,  example: 'Marko Petrović' },
      { name: 'agencyName',        description: 'Agency or company name',                      required: true,  example: 'Adriatic Properties' },
      { name: 'planName',          description: 'Plan name',                                   required: true,  example: 'Enterprise' },
      { name: 'currentMonth',      description: 'Current month name',                          required: true,  example: 'February' },
      { name: 'totalCoupons',      description: 'Total coupons allocated this month',          required: true,  example: '5' },
      { name: 'highlightedCoupons',description: '# highlighted coupons',                       required: true,  example: '2' },
      { name: 'premiumCoupons',    description: '# premium coupons',                           required: true,  example: '2' },
      { name: 'featuredCoupons',   description: '# featured coupons',                          required: true,  example: '1' },
      { name: 'isAgentText',       description: 'Personalised intro sentence (owner vs agent)', required: true,  example: 'Your agency has received its monthly coupons.' },
      { name: 'couponCodesList',   description: 'Pre-rendered HTML block with actual codes',   required: false, example: '<div>...</div>' },
      { name: 'frontendUrl',       description: 'Frontend base URL',                           required: true,  example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== PRO SUBSCRIPTION WELCOME EMAIL =====
  {
    key: 'pro-subscription-welcome',
    name: 'Pro Subscription Welcome',
    description: 'Welcome email sent immediately when a user activates a Pro plan (monthly or yearly). Includes plan benefits summary and first-month coupon codes.',
    category: 'transactional',
    fromCategory: 'support',
    subject: '🎉 Welcome to {{planName}} — your benefits are ready!',
    preheaderText: 'Your {{planName}} subscription is active. Here\'s everything you get.',
    headerTitle: 'Welcome to {{planName}}!',
    headerSubtitle: 'Your subscription is now active',
    headerEmoji: '🎉',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    bodyTemplate: `
      <p style="color:#374151;font-size:17px;margin:0 0 16px 0;">
        Hi <strong>{{userName}}</strong>! 👋
      </p>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px 0;">
        Thank you for subscribing to <strong>{{planName}}</strong>. Your account is fully activated and you have access to all Pro features.
        Here's a summary of everything included in your plan.
      </p>

      <!-- Plan Benefits -->
      <div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:12px;padding:24px;margin-bottom:24px;">
        <h2 style="color:#ffffff;margin:0 0 16px 0;font-size:16px;font-weight:700;">🚀 Your Plan Benefits</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="display:inline-block;width:26px;height:26px;background:#059669;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;vertical-align:middle;">✓</span>
              <span style="color:#e2e8f0;font-size:14px;margin-left:10px;vertical-align:middle;">
                <strong style="color:#fbbf24;">{{listingsLimit}}</strong> active listings per {{billingPeriodLabel}}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="display:inline-block;width:26px;height:26px;background:#059669;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;vertical-align:middle;">✓</span>
              <span style="color:#e2e8f0;font-size:14px;margin-left:10px;vertical-align:middle;">
                <strong style="color:#fbbf24;">{{totalCoupons}} promotion coupons/month</strong> — {{couponBreakdown}}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="display:inline-block;width:26px;height:26px;background:#059669;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;vertical-align:middle;">✓</span>
              <span style="color:#e2e8f0;font-size:14px;margin-left:10px;vertical-align:middle;">
                <strong style="color:#fbbf24;">{{aiMessagesLabel}}</strong> AI messages — intelligent property assistant
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
              <span style="display:inline-block;width:26px;height:26px;background:#059669;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;vertical-align:middle;">✓</span>
              <span style="color:#e2e8f0;font-size:14px;margin-left:10px;vertical-align:middle;">
                <strong style="color:#fbbf24;">{{aiInsightsLabel}}</strong> market insights/month
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;">
              <span style="display:inline-block;width:26px;height:26px;background:#059669;border-radius:50%;text-align:center;line-height:26px;font-size:13px;color:#fff;vertical-align:middle;">✓</span>
              <span style="color:#e2e8f0;font-size:14px;margin-left:10px;vertical-align:middle;">
                <strong style="color:#fbbf24;">Unlimited</strong> saved searches &amp; image descriptions
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- First Coupons -->
      <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:10px;padding:18px;margin-bottom:20px;border:2px solid #f59e0b;">
        <p style="color:#111827;font-size:14px;font-weight:700;margin:0 0 6px 0;">🎟️ Your first {{totalCoupons}} promotion coupons are ready! ({{couponBreakdown}})</p>
        <p style="color:#374151;font-size:13px;margin:0;line-height:1.5;">
          Use them to highlight or feature your listings and get more views. New coupons refresh on the 1st of each month.
        </p>
      </div>

      <!-- Actual Coupon Codes -->
      {{couponCodesList}}

      <!-- Subscription Details -->
      <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:24px;border:1px solid #e2e8f0;">
        <p style="color:#374151;font-size:13px;margin:0;"><strong>Plan:</strong> {{planName}}</p>
        <p style="color:#374151;font-size:13px;margin:6px 0 0 0;"><strong>Active until:</strong> {{expiresAt}}</p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Post Your First Listing →',
    ctaUrl: '{{frontendUrl}}/sell',
    showUnsubscribe: false,
    footerReason: 'You\'re receiving this because you just activated a {{planName}} subscription.',
    variables: [
      { name: 'userName',          description: 'User\'s display name',                             required: true,  example: 'Ana Kovač' },
      { name: 'planName',          description: 'Subscription plan name',                           required: true,  example: 'Pro Yearly' },
      { name: 'listingsLimit',     description: 'Max active listings',                              required: true,  example: '250' },
      { name: 'billingPeriodLabel',description: '"month" or "year"',                                required: true,  example: 'year' },
      { name: 'totalCoupons',      description: 'Total promotion coupons per month',                required: true,  example: '2' },
      { name: 'couponBreakdown',   description: 'Human-readable breakdown e.g. "1 Highlighted + 1 Featured"', required: true, example: '1 Highlighted + 1 Featured' },
      { name: 'aiMessagesLabel',   description: '"Unlimited" or the message limit number',          required: true,  example: 'Unlimited' },
      { name: 'aiInsightsLabel',   description: '"Unlimited" or the insights limit number',         required: true,  example: '20' },
      { name: 'expiresAt',         description: 'Subscription expiry date (formatted)',             required: true,  example: '1 February 2027' },
      { name: 'couponCodesList',   description: 'Pre-rendered HTML block with actual coupon codes', required: false, example: '<div>...</div>' },
      { name: 'frontendUrl',       description: 'Frontend base URL',                                required: true,  example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'welcome-coupon',
    name: 'Welcome Coupon',
    description: 'Special welcome offer for new users',
    category: 'marketing',
    fromCategory: 'support',
    subject: '🎉 Welcome Gift: {{discount}}% Off Your First Subscription!',
    preheaderText: 'Start your real estate journey with a special discount',
    headerTitle: 'Welcome Gift!',
    headerEmoji: '🎉',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        As a thank you for joining BalkanEstate, here's a special welcome offer just for you!
      </p>
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <p style="color: #166534; font-size: 48px; font-weight: 700; margin: 0 0 8px 0;">{{discount}}% OFF</p>
        <p style="color: #166534; font-size: 16px; margin: 0 0 16px 0;">Your first Pro subscription</p>
        <p style="font-family: monospace; font-size: 24px; font-weight: 700; color: #14532d; background: #fff; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 0;">{{couponCode}}</p>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 24px 0; text-align: center;">
        Valid for {{validDays}} days • One-time use only
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Claim Your Discount',
    ctaUrl: '{{frontendUrl}}/subscribe',
    showUnsubscribe: true,
    unsubscribeType: 'marketing',
    footerReason: 'You received this welcome offer as a new BalkanEstate member.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'discount', description: 'Discount percentage', required: true, example: '20' },
      { name: 'couponCode', description: 'Discount code', required: true, example: 'WELCOME20' },
      { name: 'validDays', description: 'Days until expiry', required: true, example: '7' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== SUBSCRIPTION EMAILS =====
  {
    key: 'subscription-confirmation',
    name: 'Subscription Confirmation',
    description: 'Sent when a user subscribes to a plan',
    category: 'transactional',
    fromCategory: 'support',
    subject: 'Welcome to {{planName}}! Your subscription is active',
    preheaderText: 'Thank you for subscribing to BalkanEstate {{planName}}',
    headerTitle: 'Subscription Confirmed!',
    headerEmoji: '🎊',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Thank you for subscribing! Your <strong>{{planName}}</strong> subscription is now active.
      </p>
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Plan:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{planName}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Price:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{price}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Billing Period:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{billingPeriod}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Next Billing:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{nextBillingDate}}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        You now have access to all {{planName}} features. Start making the most of your subscription!
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Go to Dashboard',
    ctaUrl: '{{frontendUrl}}/account',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'planName', description: 'Subscription plan name', required: true, example: 'Pro' },
      { name: 'price', description: 'Subscription price', required: true, example: '€29.99/month' },
      { name: 'billingPeriod', description: 'Billing period', required: true, example: 'Monthly' },
      { name: 'nextBillingDate', description: 'Next billing date', required: true, example: 'February 1, 2024' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'subscription-renewal-reminder',
    name: 'Subscription Renewal Reminder',
    description: 'Reminder before subscription renews',
    category: 'transactional',
    fromCategory: 'support',
    subject: 'Your {{planName}} subscription renews in {{daysUntil}} days',
    preheaderText: 'Your subscription will automatically renew on {{renewalDate}}',
    headerTitle: 'Renewal Reminder',
    headerEmoji: '🔔',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        This is a friendly reminder that your <strong>{{planName}}</strong> subscription will renew in <strong>{{daysUntil}} days</strong>.
      </p>
      <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Plan:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{planName}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Renewal Date:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{renewalDate}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Amount:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{amount}}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        No action needed if you want to continue. To make changes, visit your account settings.
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Subscription',
    ctaUrl: '{{frontendUrl}}/account/subscription',
    showUnsubscribe: true,
    unsubscribeType: 'transactional',
    footerReason: 'You received this reminder about your active subscription.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'planName', description: 'Subscription plan name', required: true, example: 'Pro' },
      { name: 'daysUntil', description: 'Days until renewal', required: true, example: '3' },
      { name: 'renewalDate', description: 'Renewal date', required: true, example: 'January 31, 2024' },
      { name: 'amount', description: 'Renewal amount', required: true, example: '€29.99' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'subscription-cancelled',
    name: 'Subscription Cancelled',
    description: 'Confirmation when subscription is cancelled',
    category: 'transactional',
    fromCategory: 'support',
    subject: 'Your {{planName}} subscription has been cancelled',
    preheaderText: 'Your subscription will remain active until {{endDate}}',
    headerTitle: 'Subscription Cancelled',
    headerEmoji: '😢',
    headerGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        We're sorry to see you go. Your <strong>{{planName}}</strong> subscription has been cancelled.
      </p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>Important:</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">
          You can continue using your {{planName}} features until <strong>{{endDate}}</strong>. After that, your account will revert to the free plan.
        </p>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Changed your mind? You can resubscribe anytime to get your benefits back.
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Resubscribe',
    ctaUrl: '{{frontendUrl}}/subscribe',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'planName', description: 'Subscription plan name', required: true, example: 'Pro' },
      { name: 'endDate', description: 'End of subscription period', required: true, example: 'January 31, 2024' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'payment-confirmation',
    name: 'Payment Confirmation',
    description: 'Receipt sent after successful payment',
    category: 'transactional',
    fromCategory: 'noreply',
    subject: 'Payment receipt for {{amount}}',
    preheaderText: 'Thank you for your payment to BalkanEstate',
    headerTitle: 'Payment Received',
    headerEmoji: '✅',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Thank you for your payment. Here's your receipt:
      </p>
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Description:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{description}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Amount:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{amount}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Date:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{paymentDate}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Transaction ID:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{transactionId}}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 13px; margin: 0;">
        This receipt is for your records. No action is required.
      </p>
    `,
    ctaEnabled: false,
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'description', description: 'Payment description', required: true, example: 'Pro Monthly Subscription' },
      { name: 'amount', description: 'Payment amount', required: true, example: '€29.99' },
      { name: 'paymentDate', description: 'Payment date', required: true, example: 'January 1, 2024' },
      { name: 'transactionId', description: 'Transaction ID', required: true, example: 'txn_abc123xyz' },
    ],
    isActive: true,
  },
  {
    key: 'refund-notification',
    name: 'Refund Notification',
    description: 'Sent when a refund is processed',
    category: 'transactional',
    fromCategory: 'support',
    subject: 'Refund of {{amount}} processed',
    preheaderText: 'Your refund has been processed and will appear shortly',
    headerTitle: 'Refund Processed',
    headerEmoji: '💰',
    headerGradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        We've processed a refund for your account. Here are the details:
      </p>
      <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Refund Amount:</td>
            <td style="color: #0369a1; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{amount}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Reason:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{reason}}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Original Transaction:</td>
            <td style="color: #374151; font-size: 14px; font-weight: 600; padding: 8px 0; text-align: right;">{{originalTransactionId}}</td>
          </tr>
        </table>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        The refund should appear in your account within 5-10 business days, depending on your bank.
      </p>
    `,
    ctaEnabled: false,
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'amount', description: 'Refund amount', required: true, example: '€29.99' },
      { name: 'reason', description: 'Refund reason', required: true, example: 'Subscription cancellation' },
      { name: 'originalTransactionId', description: 'Original transaction ID', required: true, example: 'txn_abc123xyz' },
    ],
    isActive: true,
  },

  // ===== AGENCY EMAILS =====
  {
    key: 'agent-joined-agency',
    name: 'Agent Joined Agency',
    description: 'Sent to agents when they join an agency',
    category: 'notifications',
    fromCategory: 'support',
    subject: 'Welcome to {{agencyName}}!',
    preheaderText: 'You are now a member of {{agencyName}}',
    headerTitle: 'Welcome to the Team!',
    headerSubtitle: 'You are now a member of {{agencyName}}',
    headerEmoji: '🤝',
    headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{agentName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Great news! You are now a member of <strong>{{agencyName}}</strong> on BalkanEstate.
      </p>
      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 8px 0;"><strong>What this means:</strong></p>
        <ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">Your profile is now linked to {{agencyName}}</li>
          <li style="margin-bottom: 4px;">You can access agency promotion coupons</li>
          <li>Your listings will display the agency branding</li>
        </ul>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'View Your Profile',
    ctaUrl: '{{frontendUrl}}/account',
    showUnsubscribe: false,
    variables: [
      { name: 'agentName', description: 'Agent\'s name', required: true, example: 'John Agent' },
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Premium Real Estate' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'agency-new-member',
    name: 'New Agency Member',
    description: 'Sent to agency owner when a new agent joins',
    category: 'notifications',
    fromCategory: 'support',
    subject: '{{agentName}} joined {{agencyName}}',
    preheaderText: 'A new agent has joined your agency',
    headerTitle: 'New Team Member!',
    headerEmoji: '🎉',
    headerGradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{ownerName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        <strong>{{agentName}}</strong> has joined <strong>{{agencyName}}</strong> as a new team member.
      </p>
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 4px 0;"><strong>New Member:</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">{{agentName}}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">{{agentEmail}}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        You now have <strong>{{totalAgents}}</strong> agents in your agency.
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Team',
    ctaUrl: '{{frontendUrl}}/account/agency',
    showUnsubscribe: false,
    variables: [
      { name: 'ownerName', description: 'Agency owner name', required: true, example: 'Agency Owner' },
      { name: 'agentName', description: 'New agent\'s name', required: true, example: 'John Agent' },
      { name: 'agentEmail', description: 'New agent\'s email', required: true, example: 'john@example.com' },
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Premium Real Estate' },
      { name: 'totalAgents', description: 'Total agents in agency', required: true, example: '5' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'agent-registration-coupons',
    name: 'Agent Registration Coupons',
    description: 'Sent to agency with agent invitation codes',
    category: 'marketing',
    fromCategory: 'support',
    subject: '🎁 Agent Registration Codes for {{agencyName}}',
    preheaderText: 'Share these codes to invite agents to your agency',
    headerTitle: 'Agent Invitation Codes',
    headerEmoji: '🎫',
    headerGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{ownerName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here are your agent registration codes for <strong>{{agencyName}}</strong>. Share these with agents you'd like to invite to your team.
      </p>
      <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0 0 12px 0;"><strong>Your Invitation Codes:</strong></p>
        {{couponCodesList}}
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;"><strong>How to use:</strong></p>
      <ol style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 4px;">Share a code with the agent you want to invite</li>
        <li style="margin-bottom: 4px;">They enter the code when signing up</li>
        <li>They'll automatically be added to your agency</li>
      </ol>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Agency',
    ctaUrl: '{{frontendUrl}}/account/agency',
    showUnsubscribe: true,
    unsubscribeType: 'marketing',
    footerReason: 'You received this as the owner of {{agencyName}}.',
    variables: [
      { name: 'ownerName', description: 'Agency owner name', required: true, example: 'Agency Owner' },
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Premium Real Estate' },
      { name: 'couponCodesList', description: 'HTML list of coupon codes', required: true, example: '<div>CODE1, CODE2, CODE3</div>' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== EXPIRY & RENEWAL EMAILS =====
  {
    key: 'expiry-reminder',
    name: 'Expiry Reminder',
    description: 'Sent when a featured listing subscription is about to expire, includes a discount coupon',
    category: 'alerts',
    fromCategory: 'alerts',
    subject: 'Your Featured Listing Expires Tomorrow - Save {{discount}}%',
    preheaderText: 'Renew now and save {{discount}}% on your featured listing',
    headerTitle: '{{discount}}% OFF Renewal',
    headerSubtitle: 'Your featured listing expires tomorrow - renew now and save!',
    headerEmoji: '⏰',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{agencyName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        Your featured listing subscription expires on <strong>{{expiryDate}}</strong>.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        Don't lose your premium visibility! Properties with featured status get <strong>5x more views</strong> on average.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Renew now with code <strong style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #0252CD;">{{couponCode}}</strong> to get {{discount}}% off your renewal.
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Renew & Save {{discount}}%',
    ctaUrl: '{{frontendUrl}}/dashboard/promotions?coupon={{couponCode}}',
    showUnsubscribe: false,
    variables: [
      { name: 'agencyName', description: 'Agency or user name', required: true, example: 'Balkan Properties' },
      { name: 'expiryDate', description: 'Subscription expiry date', required: true, example: 'January 15, 2026' },
      { name: 'couponCode', description: 'Discount coupon code', required: true, example: 'RENEW25' },
      { name: 'discount', description: 'Discount percentage', required: true, example: '25' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'auto-renewal-reminder',
    name: 'Auto-Renewal Reminder',
    description: 'Sent 7 days before a subscription auto-renews',
    category: 'notifications',
    fromCategory: 'noreply',
    subject: 'Upcoming renewal: Your {{planName}} subscription renews on {{renewalDate}}',
    preheaderText: '7 days until your subscription renewal',
    headerTitle: 'Subscription Renewal Notice',
    headerSubtitle: '7 days until your renewal',
    headerEmoji: '🔔',
    headerGradient: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        This is a friendly reminder that your <strong>{{planName}}</strong> subscription will automatically renew on <strong>{{renewalDate}}</strong>.
      </p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
        <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">What happens next?</p>
        <ul style="color: #1e3a8a; margin: 0; padding-left: 20px; line-height: 1.8; font-size: 13px;">
          <li>Your payment method will be charged on {{renewalDate}}</li>
          <li>Your subscription will continue uninterrupted</li>
          <li>You'll receive an invoice/receipt via email</li>
        </ul>
      </div>
      <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          <strong>Don't want to renew?</strong> You can cancel your subscription anytime from your account settings. Your access will continue until the end of the current billing period.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Subscription',
    ctaUrl: '{{frontendUrl}}/account',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User name', required: true, example: 'John Doe' },
      { name: 'planName', description: 'Subscription plan name', required: true, example: 'Pro' },
      { name: 'renewalDate', description: 'Auto-renewal date', required: true, example: 'February 1, 2026' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'subscription-invoice',
    name: 'Subscription Invoice',
    description: 'Sent after a subscription payment as an invoice/receipt',
    category: 'transactional',
    fromCategory: 'noreply',
    subject: 'Invoice & Receipt - {{planName}} Subscription',
    preheaderText: 'Your subscription invoice for {{planName}}',
    headerTitle: 'Invoice & Receipt',
    headerSubtitle: 'Thank you for subscribing to BalkanEstate',
    headerEmoji: '🧾',
    headerGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Thank you for your subscription. Here are your invoice details:
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{planName}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Amount:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{amount}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Billing Period:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{billingPeriod}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Order ID:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-family: monospace;">{{orderId}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Start Date:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{startDate}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Next Billing:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{nextBillingDate}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Auto-Renew:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{autoRenewStatus}}</td></tr>
        </table>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Subscription',
    ctaUrl: '{{frontendUrl}}/account',
    showUnsubscribe: false,
    variables: [
      { name: 'userName', description: 'User name', required: true, example: 'John Doe' },
      { name: 'planName', description: 'Subscription plan name', required: true, example: 'Pro' },
      { name: 'amount', description: 'Formatted payment amount', required: true, example: '€29.99' },
      { name: 'billingPeriod', description: 'Billing period text', required: true, example: 'Monthly' },
      { name: 'orderId', description: 'Order/transaction ID', required: true, example: 'ORD-12345' },
      { name: 'startDate', description: 'Subscription start date', required: true, example: 'January 1, 2026' },
      { name: 'nextBillingDate', description: 'Next billing date', required: true, example: 'February 1, 2026' },
      { name: 'autoRenewStatus', description: 'Auto-renew status text', required: true, example: 'Enabled' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== LISTING DIGEST & ALERTS =====
  {
    key: 'new-listings-digest',
    name: 'New Listings Digest',
    description: 'Sent as a digest of multiple new properties matching a saved search',
    category: 'alerts',
    fromCategory: 'alerts',
    subject: '🏠 {{propertyCount}} new properties match "{{searchName}}"',
    preheaderText: '{{propertyCount}} new properties found for your saved search',
    headerTitle: '🏠 {{propertyCount}} New Properties!',
    headerSubtitle: '{{frequencyLabel}} update for "{{searchName}}"',
    headerEmoji: '🏠',
    headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
        Hi <strong>{{recipientName}}</strong>, we found {{propertyCount}} new properties matching your search!
      </p>
      {{propertyCards}}
    `,
    ctaEnabled: true,
    ctaText: 'View All Properties →',
    ctaUrl: '{{frontendUrl}}/search',
    showUnsubscribe: true,
    unsubscribeType: 'propertyAlerts',
    footerReason: 'You\'re receiving this because you have alerts enabled for "{{searchName}}"',
    variables: [
      { name: 'recipientName', description: 'Recipient name', required: true, example: 'John' },
      { name: 'searchName', description: 'Saved search name', required: true, example: 'Apartments in Skopje' },
      { name: 'propertyCount', description: 'Number of properties', required: true, example: '5' },
      { name: 'frequencyLabel', description: 'Frequency label (Daily/Weekly)', required: false, example: 'Daily' },
      { name: 'propertyCards', description: 'HTML property cards', required: true, example: '<div>...</div>' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'saved-search-price-drop',
    name: 'Saved Search Price Drop',
    description: 'Sent when a property in a saved search has a price change',
    category: 'alerts',
    fromCategory: 'alerts',
    subject: '{{subjectText}}',
    preheaderText: '{{previewText}}',
    headerTitle: '{{headlineText}}',
    headerSubtitle: '{{subHeadline}}',
    headerEmoji: '💰',
    headerGradient: '{{headerGradient}}',
    bodyTemplate: `
      <p style="color: #374151; font-size: 15px; margin: 0 0 16px 0;">
        {{introText}}
      </p>
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px 0;">
        From your saved search: "<strong>{{searchName}}</strong>"
      </p>
      {{propertyCard}}
    `,
    ctaEnabled: true,
    ctaText: '{{ctaText}}',
    ctaUrl: '{{frontendUrl}}/property/{{propertyId}}',
    showUnsubscribe: true,
    unsubscribeType: 'priceDrops',
    footerReason: 'Alert from your saved search: "{{searchName}}"',
    variables: [
      { name: 'recipientName', description: 'Recipient name', required: true, example: 'John' },
      { name: 'searchName', description: 'Saved search name', required: true, example: 'Apartments in Skopje' },
      { name: 'headlineText', description: 'Dynamic headline', required: true, example: 'Price Just Dropped!' },
      { name: 'subHeadline', description: 'Price change summary', required: true, example: 'Save €10,000' },
      { name: 'headerGradient', description: 'Header gradient CSS', required: true, example: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
      { name: 'introText', description: 'Intro paragraph HTML', required: true, example: 'Great news!' },
      { name: 'propertyCard', description: 'HTML property card', required: true, example: '<div>...</div>' },
      { name: 'subjectText', description: 'Email subject', required: true, example: 'Price dropped 15%!' },
      { name: 'previewText', description: 'Preview text', required: true, example: 'Save €10,000' },
      { name: 'ctaText', description: 'CTA button text', required: true, example: 'View Property' },
      { name: 'propertyId', description: 'Property ID', required: true, example: '123abc' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== ENTERPRISE =====
  {
    key: 'enterprise-welcome',
    name: 'Enterprise Welcome',
    description: 'Sent when an agency activates an Enterprise subscription',
    category: 'transactional',
    fromCategory: 'noreply',
    subject: '🏢 Welcome to Enterprise, {{agencyName}}!',
    preheaderText: 'Your Enterprise subscription is now active',
    headerTitle: 'Welcome to Enterprise!',
    headerSubtitle: 'Your agency is now powered by BalkanEstate Enterprise',
    headerEmoji: '🏢',
    headerGradient: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{ownerName}}</strong>,
      </p>
      <p style="color: #374151; font-size: 14px; margin: 0 0 24px 0;">
        Congratulations! <strong>{{agencyName}}</strong> is now on the Enterprise plan. Here's what's included:
      </p>
      {{benefitsSection}}
      {{couponCodesList}}
    `,
    ctaEnabled: true,
    ctaText: 'Go to Agency Dashboard',
    ctaUrl: '{{frontendUrl}}/agency/dashboard',
    showUnsubscribe: false,
    variables: [
      { name: 'ownerName', description: 'Agency owner name', required: true, example: 'John Doe' },
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Balkan Properties' },
      { name: 'benefitsSection', description: 'HTML benefits/features section', required: true, example: '<div>...</div>' },
      { name: 'couponCodesList', description: 'HTML coupon codes list', required: false, example: '' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== VIEWING EMAILS =====
  {
    key: 'viewing-confirmation',
    name: 'Viewing Confirmation',
    description: 'Sent to the visitor when they request a property viewing',
    category: 'transactional',
    fromCategory: 'inquiries',
    subject: '📅 Viewing Scheduled: {{propertyTitle}} on {{date}}',
    preheaderText: 'Your viewing has been scheduled for {{date}} at {{timeSlot}}',
    headerTitle: 'Viewing Confirmed!',
    headerSubtitle: 'Your property viewing has been scheduled',
    headerEmoji: '📅',
    headerGradient: 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello <strong>{{visitorName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Your viewing request has been submitted. The property owner will review and confirm your appointment.
      </p>
      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #0369a1; font-size: 16px; margin: 0 0 16px 0;">Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{propertyTitle}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{propertyAddress}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{date}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{timeSlot}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contact:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{sellerName}}</td></tr>
        </table>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          <strong>Note:</strong> The property owner will confirm your viewing. You'll receive another email once confirmed. Please arrive on time and bring a valid ID.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'View Property',
    ctaUrl: '{{frontendUrl}}/property/{{propertyId}}',
    showUnsubscribe: false,
    variables: [
      { name: 'visitorName', description: 'Visitor name', required: true, example: 'John Doe' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern 2BR Apartment' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'City Center, Skopje' },
      { name: 'date', description: 'Viewing date', required: true, example: 'January 15, 2026' },
      { name: 'timeSlot', description: 'Viewing time', required: true, example: '10:00 AM' },
      { name: 'sellerName', description: 'Seller/agent name', required: true, example: 'Jane Smith' },
      { name: 'propertyId', description: 'Property ID', required: true, example: '123abc' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'viewing-notification',
    name: 'Viewing Notification (Seller)',
    description: 'Sent to seller/agent when someone requests a property viewing',
    category: 'notifications',
    fromCategory: 'inquiries',
    subject: '🏠 New Viewing Request: {{propertyTitle}} on {{date}}',
    preheaderText: 'New viewing request from {{visitorName}} for {{date}} at {{timeSlot}}',
    headerTitle: 'New Viewing Request!',
    headerSubtitle: '{{propertyTitle}}',
    headerEmoji: '🏠',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello <strong>{{sellerName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        You have a new viewing request for your property. Please review and respond.
      </p>
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #92400e; font-size: 16px; margin: 0 0 16px 0;">Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{propertyTitle}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{propertyAddress}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{date}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{timeSlot}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Visitor:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{visitorName}} ({{visitorEmail}})</td></tr>
          {{visitorPhoneRow}}
          {{visitorMessageRow}}
        </table>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'Manage Viewings',
    ctaUrl: '{{frontendUrl}}/property/{{propertyId}}',
    showUnsubscribe: false,
    variables: [
      { name: 'sellerName', description: 'Seller/agent name', required: true, example: 'Jane Smith' },
      { name: 'visitorName', description: 'Visitor name', required: true, example: 'John Doe' },
      { name: 'visitorEmail', description: 'Visitor email', required: true, example: 'john@example.com' },
      { name: 'visitorPhoneRow', description: 'HTML row for phone if provided', required: false, example: '' },
      { name: 'visitorMessageRow', description: 'HTML row for message if provided', required: false, example: '' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern 2BR Apartment' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'City Center, Skopje' },
      { name: 'date', description: 'Viewing date', required: true, example: 'January 15, 2026' },
      { name: 'timeSlot', description: 'Viewing time', required: true, example: '10:00 AM' },
      { name: 'propertyId', description: 'Property ID', required: true, example: '123abc' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'viewing-approved',
    name: 'Viewing Approved',
    description: 'Sent to visitor when their viewing request is approved by the seller',
    category: 'transactional',
    fromCategory: 'inquiries',
    subject: '✅ Viewing Confirmed: {{propertyTitle}} on {{date}}',
    preheaderText: 'Great news! Your viewing has been confirmed for {{date}} at {{timeSlot}}',
    headerTitle: 'Viewing Confirmed!',
    headerSubtitle: 'The property owner has approved your visit',
    headerEmoji: '✅',
    headerGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello <strong>{{visitorName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Great news! Your viewing request has been <strong style="color: #059669;">approved</strong>. You're all set to visit the property.
      </p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <h2 style="color: #065f46; font-size: 16px; margin: 0 0 16px 0;">Confirmed Viewing Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{propertyTitle}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{propertyAddress}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{date}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{timeSlot}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contact:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{sellerName}}{{sellerPhoneHtml}}</td></tr>
        </table>
      </div>
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 0 0 16px 0;">
        <p style="color: #92400e; font-size: 13px; margin: 0;">
          <strong>Reminder:</strong> Please arrive on time and bring a valid ID. If you need to cancel, please let the owner know in advance.
        </p>
      </div>
    `,
    ctaEnabled: true,
    ctaText: 'View Property Details',
    ctaUrl: '{{frontendUrl}}/property/{{propertyId}}',
    showUnsubscribe: false,
    variables: [
      { name: 'visitorName', description: 'Visitor name', required: true, example: 'John Doe' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern 2BR Apartment' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'City Center, Skopje' },
      { name: 'date', description: 'Viewing date', required: true, example: 'January 15, 2026' },
      { name: 'timeSlot', description: 'Viewing time', required: true, example: '10:00 AM' },
      { name: 'sellerName', description: 'Seller/agent name', required: true, example: 'Jane Smith' },
      { name: 'sellerPhoneHtml', description: 'HTML for seller phone if available', required: false, example: '' },
      { name: 'propertyId', description: 'Property ID', required: true, example: '123abc' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
  {
    key: 'viewing-rejected',
    name: 'Viewing Rejected',
    description: 'Sent to visitor when their viewing request is declined',
    category: 'transactional',
    fromCategory: 'inquiries',
    subject: 'Viewing Update: {{propertyTitle}}',
    preheaderText: 'Your viewing request for {{propertyTitle}} could not be confirmed',
    headerTitle: 'Viewing Not Available',
    headerSubtitle: 'Unfortunately, this viewing time is not available',
    headerEmoji: '📋',
    headerGradient: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hello <strong>{{visitorName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Unfortunately, your viewing request could not be confirmed at this time.
      </p>
      <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 0 0 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Property:</td><td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">{{propertyTitle}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Address:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{propertyAddress}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested Date:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{date}}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Requested Time:</td><td style="padding: 8px 0; color: #111827; font-size: 14px;">{{timeSlot}}</td></tr>
          {{cancelReasonRow}}
        </table>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">
        Don't worry! You can try requesting a different time or explore other properties.
      </p>
    `,
    ctaEnabled: true,
    ctaText: 'Browse Properties',
    ctaUrl: '{{frontendUrl}}/search',
    showUnsubscribe: false,
    variables: [
      { name: 'visitorName', description: 'Visitor name', required: true, example: 'John Doe' },
      { name: 'propertyTitle', description: 'Property title', required: true, example: 'Modern 2BR Apartment' },
      { name: 'propertyAddress', description: 'Property address', required: true, example: 'City Center, Skopje' },
      { name: 'date', description: 'Requested viewing date', required: true, example: 'January 15, 2026' },
      { name: 'timeSlot', description: 'Requested viewing time', required: true, example: '10:00 AM' },
      { name: 'cancelReasonRow', description: 'HTML row for cancel reason if provided', required: false, example: '' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== PROMOTION =====
  {
    key: 'promotion-coupons',
    name: 'Promotion Coupons Summary',
    description: 'Sent to agency owners with their promotion coupons summary',
    category: 'notifications',
    fromCategory: 'alerts',
    subject: '🎁 Promotion Coupons Summary — {{agencyName}}',
    preheaderText: 'Your promotion coupons summary for {{agencyName}}',
    headerTitle: 'Promotion Coupons',
    headerSubtitle: '{{agencyName}} • Monthly Summary',
    headerEmoji: '🎁',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
        Hello <strong>{{ownerName}}</strong>! 👋
      </p>
      <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Here's your current promotion coupons summary for <strong>{{agencyName}}</strong>.
        Use these coupons to highlight, feature, or boost your agency's property listings!
      </p>
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 24px;">
        <tr>
          <td style="width: 33%; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #111827; font-size: 28px; font-weight: 700; margin: 0;">{{monthlyCoupons}}</p>
            <p style="color: #374151; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Monthly</p>
          </td>
          <td style="width: 33%; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #111827; font-size: 28px; font-weight: 700; margin: 0;">{{availableCoupons}}</p>
            <p style="color: #374151; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Available</p>
          </td>
          <td style="width: 33%; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center;">
            <p style="color: #374151; font-size: 28px; font-weight: 700; margin: 0;">{{usedCoupons}}</p>
            <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0 0; text-transform: uppercase; font-weight: 600;">Used</p>
          </td>
        </tr>
      </table>
      {{couponCodesList}}
    `,
    ctaEnabled: true,
    ctaText: 'Go to Dashboard →',
    ctaUrl: '{{frontendUrl}}/agency/dashboard',
    showUnsubscribe: false,
    variables: [
      { name: 'ownerName', description: 'Agency owner name', required: true, example: 'John Doe' },
      { name: 'agencyName', description: 'Agency name', required: true, example: 'Balkan Properties' },
      { name: 'monthlyCoupons', description: 'Monthly coupon count', required: true, example: '15' },
      { name: 'availableCoupons', description: 'Available coupon count', required: true, example: '12' },
      { name: 'usedCoupons', description: 'Used coupon count', required: true, example: '3' },
      { name: 'couponCodesList', description: 'HTML coupon codes list', required: false, example: '' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },

  // ===== ADMIN EMAILS =====
  {
    key: 'daily-activity-report',
    name: 'Daily Activity Report',
    description: 'Daily admin report with platform statistics',
    category: 'reports',
    fromCategory: 'noreply',
    subject: '📊 Daily Activity Report - {{date}}',
    preheaderText: 'Platform activity summary for {{date}}',
    headerTitle: 'Daily Activity Report',
    headerSubtitle: '{{date}}',
    headerEmoji: '📊',
    headerGradient: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi Admin,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Here's the daily activity summary for <strong>{{date}}</strong>:
      </p>
      {{statsSection}}
      {{alertsSection}}
    `,
    ctaEnabled: true,
    ctaText: 'View Admin Dashboard',
    ctaUrl: '{{frontendUrl}}/admin',
    showUnsubscribe: false,
    variables: [
      { name: 'date', description: 'Report date', required: true, example: 'January 1, 2024' },
      { name: 'statsSection', description: 'HTML stats section', required: true, example: '<div>...</div>' },
      { name: 'alertsSection', description: 'HTML alerts section', required: false, example: '<div>...</div>' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
    ],
    isActive: true,
  },
];

// Function to seed email configurations
export async function seedEmailConfigs(): Promise<void> {
  dbLogger.info('🌱 Seeding email configurations...');

  for (const config of defaultEmailConfigs) {
    try {
      // Use upsert to create or update
      await EmailConfig.findOneAndUpdate(
        { key: config.key },
        {
          $set: config,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      );
      dbLogger.info(`  ✅ ${config.key}`);
    } catch (error) {
      dbLogger.error(`  ❌ Failed to seed ${config.key}:`, error);
    }
  }

  dbLogger.info('✨ Email configuration seeding complete!');
}

// Run seeding if this file is executed directly
if (require.main === module) {
  import('mongoose').then(async (mongoose) => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/balkanestate';
    await mongoose.connect(MONGODB_URI);
    await seedEmailConfigs();
    await mongoose.disconnect();
    process.exit(0);
  });
}
