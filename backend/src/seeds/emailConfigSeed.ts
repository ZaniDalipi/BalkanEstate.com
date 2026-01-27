import EmailConfig from '../models/EmailConfig';

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
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Thanks for signing up! Please verify your email address by clicking the button below.
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        This link will expire in <strong>24 hours</strong>.
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
        <p style="color: #374151; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">{{propertyTitle}}</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">{{propertyAddress}}</p>
        <div style="display: inline-block; margin-bottom: 8px;">
          <span style="color: #9ca3af; font-size: 16px; text-decoration: line-through;">{{oldPrice}}</span>
          <span style="color: #dc2626; font-size: 24px; font-weight: 700; margin-left: 12px;">{{newPrice}}</span>
        </div>
        <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin: 0;">Save {{savings}} ({{percentDrop}}% off)</p>
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
  {
    key: 'monthly-coupon',
    name: 'Monthly Promotion Coupon',
    description: 'Monthly promotion coupon for Pro and Agency members',
    category: 'marketing',
    fromCategory: 'support',
    subject: '🎁 Your Monthly Promotion Coupon is Ready!',
    preheaderText: 'Use your exclusive coupon to boost your listings',
    headerTitle: 'Your Monthly Coupon',
    headerEmoji: '🎁',
    headerGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    bodyTemplate: `
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px 0;">
        Hi <strong>{{userName}}</strong>,
      </p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0;">
        Your monthly promotion coupon is here! Use it to get free promotion credits for your listings.
      </p>
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0;">Your Coupon Code:</p>
        <p style="font-family: monospace; font-size: 28px; font-weight: 700; color: #78350f; background: #fff; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 0 0 8px 0;">{{couponCode}}</p>
        <p style="color: #92400e; font-size: 13px; margin: 0;">Valid until: {{expiryDate}}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
        <strong>Coupon Details:</strong>
      </p>
      <ul style="color: #6b7280; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 4px;">{{creditsAmount}} promotion credits</li>
        <li style="margin-bottom: 4px;">Use for Boost or Featured promotions</li>
        <li>One-time use only</li>
      </ul>
    `,
    ctaEnabled: true,
    ctaText: 'Use Coupon Now',
    ctaUrl: '{{frontendUrl}}/account/listings',
    showUnsubscribe: true,
    unsubscribeType: 'marketing',
    footerReason: 'You\'re receiving this email as part of your Pro/Agency membership benefits.',
    variables: [
      { name: 'userName', description: 'User\'s name', required: true, example: 'John Doe' },
      { name: 'couponCode', description: 'Coupon code', required: true, example: 'PRO-JAN-2024-ABC123' },
      { name: 'expiryDate', description: 'Coupon expiry date', required: true, example: 'January 31, 2024' },
      { name: 'creditsAmount', description: 'Number of credits', required: true, example: '3' },
      { name: 'frontendUrl', description: 'Frontend base URL', required: true, example: 'https://balkanestate.com' },
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
  console.log('🌱 Seeding email configurations...');

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
      console.log(`  ✅ ${config.key}`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${config.key}:`, error);
    }
  }

  console.log('✨ Email configuration seeding complete!');
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
