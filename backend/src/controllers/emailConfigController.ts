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
