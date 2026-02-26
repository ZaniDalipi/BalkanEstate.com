import { Request, Response } from 'express';
import SiteSettings from '../models/SiteSettings';
import { apiLogger } from '../utils/logger';
import { clearSiteSettingsCache } from '../utils/emailTemplateRenderer';

// Get site settings (singleton)
export const getSiteSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SiteSettings.getSettings();

    res.json({ settings });
  } catch (error) {
    apiLogger.error('Error fetching site settings:', error);
    res.status(500).json({ message: 'Failed to fetch site settings' });
  }
};

// Update site settings (partial update)
export const updateSiteSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const updateData = req.body;
    const userId = (req as any).user?._id;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;

    // Add modification metadata
    updateData.lastModified = new Date();
    if (userId) {
      updateData.modifiedBy = userId;
    }

    const settings = await SiteSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!settings) {
      res.status(404).json({ message: 'Site settings not found' });
      return;
    }

    // Clear cached site settings so emails pick up changes immediately
    clearSiteSettingsCache();

    res.json({
      message: 'Site settings updated successfully',
      settings,
    });
  } catch (error) {
    apiLogger.error('Error updating site settings:', error);
    res.status(500).json({ message: 'Failed to update site settings' });
  }
};

// Reset site settings to defaults
export const resetSiteSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await SiteSettings.deleteOne({});
    const settings = await SiteSettings.getSettings();

    clearSiteSettingsCache();

    res.json({
      message: 'Site settings reset to defaults',
      settings,
    });
  } catch (error) {
    apiLogger.error('Error resetting site settings:', error);
    res.status(500).json({ message: 'Failed to reset site settings' });
  }
};

// Upload email logo (placeholder)
export const uploadEmailLogo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { logoUrl } = req.body;
    const userId = (req as any).user?._id;

    if (!logoUrl) {
      res.status(400).json({ message: 'Logo URL is required' });
      return;
    }

    const settings = await SiteSettings.findOneAndUpdate(
      {},
      {
        $set: {
          emailLogoUrl: logoUrl,
          lastModified: new Date(),
          ...(userId && { modifiedBy: userId }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!settings) {
      res.status(404).json({ message: 'Site settings not found' });
      return;
    }

    res.json({
      message: 'Email logo updated successfully',
      settings,
    });
  } catch (error) {
    apiLogger.error('Error uploading email logo:', error);
    res.status(500).json({ message: 'Failed to upload email logo' });
  }
};
