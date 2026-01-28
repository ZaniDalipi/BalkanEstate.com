import { Request, Response } from 'express';
import EmailConfig, { IEmailConfig } from '../models/EmailConfig';
import { seedEmailConfigs } from '../seeds/emailConfigSeed';
import emailService from '../services/emailService';

// Get all email configurations
export const getAllEmailConfigs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, isActive, search } = req.query;

    // Build query
    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (isActive !== undefined && isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const configs = await EmailConfig.find(query)
      .sort({ category: 1, name: 1 })
      .lean();

    // Get category counts
    const categoryCounts = await EmailConfig.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const categoryStats = categoryCounts.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    res.json({
      configs,
      total: configs.length,
      categoryStats,
    });
  } catch (error) {
    console.error('Error fetching email configs:', error);
    res.status(500).json({ message: 'Failed to fetch email configurations' });
  }
};

// Get single email configuration
export const getEmailConfigByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    const config = await EmailConfig.findOne({ key }).lean();

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    res.json({ config });
  } catch (error) {
    console.error('Error fetching email config:', error);
    res.status(500).json({ message: 'Failed to fetch email configuration' });
  }
};

// Update email configuration
export const updateEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const updateData = req.body;
    const userId = (req as any).user?._id;

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.key;
    delete updateData.createdAt;

    // Add modification metadata
    updateData.lastModified = new Date();
    if (userId) {
      updateData.modifiedBy = userId;
    }

    const config = await EmailConfig.findOneAndUpdate(
      { key },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    res.json({
      message: 'Email configuration updated successfully',
      config,
    });
  } catch (error) {
    console.error('Error updating email config:', error);
    res.status(500).json({ message: 'Failed to update email configuration' });
  }
};

// Toggle email active status
export const toggleEmailStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const userId = (req as any).user?._id;

    const config = await EmailConfig.findOne({ key });

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    config.isActive = !config.isActive;
    config.lastModified = new Date();
    if (userId) {
      config.modifiedBy = userId;
    }

    await config.save();

    res.json({
      message: `Email ${config.isActive ? 'enabled' : 'disabled'} successfully`,
      config,
    });
  } catch (error) {
    console.error('Error toggling email status:', error);
    res.status(500).json({ message: 'Failed to toggle email status' });
  }
};

// Reset email configuration to default
export const resetEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    // Import default configs
    const { defaultEmailConfigs } = await import('../seeds/emailConfigSeed');

    const defaultConfig = defaultEmailConfigs.find((c) => c.key === key);

    if (!defaultConfig) {
      res.status(404).json({ message: 'Default configuration not found for this email' });
      return;
    }

    const config = await EmailConfig.findOneAndUpdate(
      { key },
      { $set: { ...defaultConfig, lastModified: new Date() } },
      { new: true, runValidators: true }
    );

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    res.json({
      message: 'Email configuration reset to default',
      config,
    });
  } catch (error) {
    console.error('Error resetting email config:', error);
    res.status(500).json({ message: 'Failed to reset email configuration' });
  }
};

// Reset all email configurations to defaults
export const resetAllEmailConfigs = async (_req: Request, res: Response): Promise<void> => {
  try {
    await seedEmailConfigs();

    res.json({
      message: 'All email configurations reset to defaults',
    });
  } catch (error) {
    console.error('Error resetting all email configs:', error);
    res.status(500).json({ message: 'Failed to reset email configurations' });
  }
};

// Send test email
export const sendTestEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { testEmail, testVariables } = req.body;

    if (!testEmail) {
      res.status(400).json({ message: 'Test email address is required' });
      return;
    }

    const config = await EmailConfig.findOne({ key });

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    // Build variables with test data
    const variables: Record<string, string> = {};
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    // Set default values from variable examples
    for (const variable of config.variables) {
      variables[variable.name] = testVariables?.[variable.name] || variable.example;
    }

    // Always include frontendUrl
    variables.frontendUrl = frontendUrl;

    // Generate email HTML from template
    const html = generateEmailHtml(config, variables);
    const subject = replaceVariables(config.subject, variables);

    // Send test email
    await emailService.sendEmail({
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html,
      category: config.fromCategory as any,
    });

    res.json({
      message: `Test email sent successfully to ${testEmail}`,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Failed to send test email', error: String(error) });
  }
};

// Preview email HTML
export const previewEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { testVariables } = req.body;

    const config = await EmailConfig.findOne({ key });

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    // Build variables with test data
    const variables: Record<string, string> = {};
    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    // Set default values from variable examples
    for (const variable of config.variables) {
      variables[variable.name] = testVariables?.[variable.name] || variable.example;
    }

    // Always include frontendUrl
    variables.frontendUrl = frontendUrl;

    // Generate email HTML
    const html = generateEmailHtml(config, variables);
    const subject = replaceVariables(config.subject, variables);

    res.json({
      subject,
      html,
      preheaderText: replaceVariables(config.preheaderText || '', variables),
    });
  } catch (error) {
    console.error('Error previewing email:', error);
    res.status(500).json({ message: 'Failed to generate email preview' });
  }
};

// Get email categories with counts
export const getEmailCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await EmailConfig.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching email categories:', error);
    res.status(500).json({ message: 'Failed to fetch email categories' });
  }
};

// Create new email configuration
export const createEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const configData = req.body;
    const userId = (req as any).user?._id;

    // Validate required fields
    if (!configData.key || !configData.name || !configData.subject || !configData.bodyTemplate) {
      res.status(400).json({
        message: 'Missing required fields: key, name, subject, bodyTemplate are required',
      });
      return;
    }

    // Check if key already exists
    const existing = await EmailConfig.findOne({ key: configData.key });
    if (existing) {
      res.status(409).json({ message: 'Email configuration with this key already exists' });
      return;
    }

    // Sanitize key (lowercase, alphanumeric with dashes)
    configData.key = configData.key.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // Set defaults
    configData.isActive = configData.isActive ?? true;
    configData.category = configData.category || 'transactional';
    configData.fromCategory = configData.fromCategory || 'noreply';
    configData.headerTitle = configData.headerTitle || configData.name;
    configData.headerGradient = configData.headerGradient || 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)';
    configData.showUnsubscribe = configData.showUnsubscribe ?? false;
    configData.ctaEnabled = configData.ctaEnabled ?? false;
    configData.variables = configData.variables || [];
    configData.lastModified = new Date();

    if (userId) {
      configData.modifiedBy = userId;
    }

    const config = await EmailConfig.create(configData);

    res.status(201).json({
      message: 'Email configuration created successfully',
      config,
    });
  } catch (error) {
    console.error('Error creating email config:', error);
    res.status(500).json({ message: 'Failed to create email configuration' });
  }
};

// Delete email configuration
export const deleteEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;

    // Check if this is a system email (from seed data)
    const { defaultEmailConfigs } = await import('../seeds/emailConfigSeed');
    const isSystemEmail = defaultEmailConfigs.some((c) => c.key === key);

    if (isSystemEmail) {
      res.status(403).json({
        message: 'Cannot delete system email templates. You can disable them instead.',
      });
      return;
    }

    const config = await EmailConfig.findOneAndDelete({ key });

    if (!config) {
      res.status(404).json({ message: 'Email configuration not found' });
      return;
    }

    res.json({
      message: 'Email configuration deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting email config:', error);
    res.status(500).json({ message: 'Failed to delete email configuration' });
  }
};

// Duplicate an existing email configuration
export const duplicateEmailConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { newKey, newName } = req.body;
    const userId = (req as any).user?._id;

    if (!newKey || !newName) {
      res.status(400).json({ message: 'newKey and newName are required' });
      return;
    }

    // Check if source exists
    const source = await EmailConfig.findOne({ key }).lean();
    if (!source) {
      res.status(404).json({ message: 'Source email configuration not found' });
      return;
    }

    // Check if new key already exists
    const existing = await EmailConfig.findOne({ key: newKey });
    if (existing) {
      res.status(409).json({ message: 'Email configuration with this key already exists' });
      return;
    }

    // Create duplicate
    const duplicateData = {
      ...source,
      _id: undefined,
      key: newKey.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      name: newName,
      lastModified: new Date(),
      modifiedBy: userId,
      createdAt: undefined,
      updatedAt: undefined,
    };

    const config = await EmailConfig.create(duplicateData);

    res.status(201).json({
      message: 'Email configuration duplicated successfully',
      config,
    });
  } catch (error) {
    console.error('Error duplicating email config:', error);
    res.status(500).json({ message: 'Failed to duplicate email configuration' });
  }
};

// Helper function to replace variables in a string
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  // Remove any remaining conditional blocks (simple implementation)
  result = result.replace(/\{\{#if\s+\w+\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  return result;
}

// Helper function to generate full email HTML from config
function generateEmailHtml(config: IEmailConfig, variables: Record<string, string>): string {
  const frontendUrl = variables.frontendUrl || process.env.FRONTEND_URL || 'https://balkanestate.com';
  const year = new Date().getFullYear();

  // Replace variables in all template parts
  const headerTitle = replaceVariables(config.headerTitle, variables);
  const headerSubtitle = config.headerSubtitle ? replaceVariables(config.headerSubtitle, variables) : '';
  const bodyContent = replaceVariables(config.bodyTemplate, variables);
  const ctaText = config.ctaText ? replaceVariables(config.ctaText, variables) : '';
  const ctaUrl = config.ctaUrl ? replaceVariables(config.ctaUrl, variables) : '';
  const footerReason = config.footerReason ? replaceVariables(config.footerReason, variables) : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${config.preheaderText ? `<meta name="x-apple-data-detectors" content="none">` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  ${config.preheaderText ? `
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${replaceVariables(config.preheaderText, variables)}
  </div>
  ` : ''}

  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: ${config.headerGradient || 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)'}; padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
        ${config.headerEmoji ? `${config.headerEmoji} ` : ''}${headerTitle}
      </h1>
      ${headerSubtitle ? `<p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">${headerSubtitle}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="padding: 24px;">
      ${bodyContent}

      ${config.ctaEnabled && ctaText && ctaUrl ? `
      <!-- CTA Button -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${ctaUrl}"
           style="display: inline-block; background: ${config.headerGradient || 'linear-gradient(135deg, #0252CD 0%, #0369a1 100%)'}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          ${ctaText}
        </a>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      ${footerReason ? `<p style="color: #6b7280; font-size: 12px; margin: 0 0 12px 0;">${footerReason}</p>` : ''}
      ${config.showUnsubscribe ? `
      <p style="color: #9ca3af; font-size: 11px; margin: 0 0 8px 0;">
        <a href="${frontendUrl}/settings/notifications" style="color: #9ca3af; text-decoration: underline;">Manage email preferences</a>
      </p>
      ` : ''}
      <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0 0;">
        &copy; ${year} BalkanEstate<sup>AI</sup>. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// =============================================================================
// Preview New Minimalistic Templates
// =============================================================================

import {
  getPromoTemplate,
  getTransactionalTemplate,
  getReportTemplate,
  getPropertyAlertTemplate,
} from '../templates/emailTemplates';

/**
 * Preview new minimalistic email templates with 3D house graphics
 */
export const previewMinimalisticTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { templateType } = req.params;
    const testData = req.body || {};

    let html = '';
    let subject = '';

    const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

    switch (templateType) {
      case 'promo':
      case 'promotional':
        subject = testData.subject || 'Special Offer: Get 25% OFF Your Featured Listing';
        html = getPromoTemplate({
          title: testData.title || '25% OFF Featured Listing',
          subtitle: testData.subtitle || 'Limited time offer for new members',
          greeting: testData.greeting || 'Hi John,',
          bodyParagraphs: testData.bodyParagraphs || [
            'We have a special offer just for you!',
            'Get <strong>25% off</strong> your first featured listing and start attracting more buyers today.',
            'This offer expires in 48 hours, so act fast!',
          ],
          ctaText: testData.ctaText || 'Claim Your Discount',
          ctaUrl: testData.ctaUrl || `${frontendUrl}/dashboard/promotions`,
          houseStyle: testData.houseStyle || 'modern',
          badge: testData.badge || 'Limited Offer',
          unsubscribeUrl: `${frontendUrl}/unsubscribe`,
          preferencesUrl: `${frontendUrl}/settings/notifications`,
        });
        break;

      case 'welcome':
        subject = testData.subject || 'Welcome to BalkanEstate! Claim Your FREE Week';
        html = getPromoTemplate({
          title: '1 Week FREE Featured Listing',
          subtitle: 'Welcome to BalkanEstate! Start showcasing your properties today.',
          greeting: 'Hi New Agent,',
          bodyParagraphs: [
            'Thank you for joining BalkanEstate! To help you get started, we\'re giving you a special welcome gift.',
            'Use code <strong style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; color: #0252CD;">WELCOME100</strong> to get 1 week of featured listing absolutely free.',
            'This offer is valid until December 31, 2026. Don\'t miss out!',
          ],
          ctaText: 'Claim Your Free Week',
          ctaUrl: `${frontendUrl}/dashboard/promotions?coupon=WELCOME100`,
          houseStyle: 'modern',
          badge: 'Welcome Gift',
        });
        break;

      case 'transactional':
        subject = testData.subject || 'Your Password Has Been Reset';
        html = getTransactionalTemplate({
          greeting: testData.greeting || 'Hi John,',
          bodyParagraphs: testData.bodyParagraphs || [
            'Your password has been successfully reset.',
            'If you did not request this change, please contact our support team immediately.',
            'You can now log in with your new password.',
          ],
          ctaText: testData.ctaText || 'Log In Now',
          ctaUrl: testData.ctaUrl || `${frontendUrl}/login`,
        });
        break;

      case 'report':
      case 'stats':
        subject = testData.subject || 'Your Weekly Performance Report';
        html = getReportTemplate({
          title: testData.title || 'Weekly Performance Report',
          period: testData.period || 'Jan 20 - Jan 26, 2026',
          greeting: testData.greeting || 'Hi John,',
          stats: testData.stats || [
            { value: '1,234', label: 'Views', change: 12, color: '#0369a1' },
            { value: '45', label: 'Inquiries', change: -5, color: '#16a34a' },
            { value: '89', label: 'Saves', change: 23, color: '#d97706' },
          ],
          highlights: testData.highlights || [
            'Your "Modern Villa in Ohrid" got 3x more views this week',
            'You responded to inquiries 2x faster than average',
            'Consider promoting your top property for more visibility',
          ],
          ctaText: testData.ctaText || 'View Full Analytics',
          ctaUrl: testData.ctaUrl || `${frontendUrl}/dashboard/analytics`,
        });
        break;

      case 'property-alert':
      case 'alert':
        subject = testData.subject || '3 New Properties Match Your Search';
        html = getPropertyAlertTemplate({
          recipientName: testData.recipientName || 'John',
          searchName: testData.searchName || 'Apartments in Skopje',
          properties: testData.properties || [
            {
              title: 'Modern 2BR Apartment',
              address: 'City Center, Skopje',
              price: 85000,
              beds: 2,
              baths: 1,
              sqft: 750,
              url: `${frontendUrl}/property/123`,
              badge: 'New',
            },
            {
              title: 'Luxury Penthouse',
              address: 'Vodno District, Skopje',
              price: 195000,
              beds: 3,
              baths: 2,
              sqft: 1200,
              url: `${frontendUrl}/property/456`,
            },
            {
              title: 'Cozy Studio',
              address: 'Aerodrom, Skopje',
              price: 45000,
              beds: 1,
              baths: 1,
              sqft: 400,
              url: `${frontendUrl}/property/789`,
              badge: 'Price Drop',
            },
          ],
          viewAllUrl: `${frontendUrl}/saved-searches`,
        });
        break;

      case 'villa':
        subject = 'Luxury Villa Promotion';
        html = getPromoTemplate({
          title: 'Exclusive Villa Listings',
          subtitle: 'Discover luxury living in the Balkans',
          greeting: 'Dear Valued Client,',
          bodyParagraphs: [
            'We have curated the finest villa properties just for you.',
            'From lakefront retreats to mountain escapes, find your dream home.',
            'Schedule a private viewing today.',
          ],
          ctaText: 'Browse Luxury Villas',
          ctaUrl: `${frontendUrl}/search?type=villa`,
          houseStyle: 'villa',
          badge: 'Luxury Collection',
          badgeColor: '#f59e0b',
        });
        break;

      case 'apartment':
        subject = 'New Apartment Listings';
        html = getPromoTemplate({
          title: 'City Living Awaits',
          subtitle: 'Modern apartments in prime locations',
          greeting: 'Hi there,',
          bodyParagraphs: [
            'Looking for the perfect urban home?',
            'We have new apartments in the best neighborhoods.',
            'From studios to penthouses, find your ideal space.',
          ],
          ctaText: 'View Apartments',
          ctaUrl: `${frontendUrl}/search?type=apartment`,
          houseStyle: 'apartment',
          badge: 'New Listings',
        });
        break;

      default:
        res.status(400).json({
          message: `Unknown template type: ${templateType}`,
          availableTypes: [
            'promo',
            'promotional',
            'welcome',
            'transactional',
            'report',
            'stats',
            'property-alert',
            'alert',
            'villa',
            'apartment',
          ],
        });
        return;
    }

    res.json({
      templateType,
      subject,
      html,
    });
  } catch (error) {
    console.error('Error previewing minimalistic template:', error);
    res.status(500).json({ message: 'Failed to generate template preview' });
  }
};
