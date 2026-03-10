import { Request, Response } from 'express';
import SystemSettings from '../models/SystemSettings';
import { adminLogger } from '../utils/logger';

// @desc    Get system settings
// @route   GET /api/admin/system-settings
// @access  Private/Admin
export const getSystemSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ settings });
  } catch (error: any) {
    adminLogger.error('Get system settings error:', error);
    res.status(500).json({ message: 'Error fetching system settings' });
  }
};

// @desc    Update system settings
// @route   PATCH /api/admin/system-settings
// @access  Private/Admin
export const updateSystemSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = req.body;

    // Remove fields that shouldn't be set directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;
    delete updates.__v;

    const settings = await SystemSettings.getSettings();

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        (settings as any)[key] = updates[key];
      }
    });

    settings.lastModified = new Date();
    if ((req as any).user?._id) {
      settings.modifiedBy = (req as any).user._id;
    }

    await settings.save();

    res.json({
      message: 'System settings updated successfully',
      settings,
    });
  } catch (error: any) {
    adminLogger.error('Update system settings error:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({ message: 'Validation error', errors });
      return;
    }

    res.status(500).json({ message: 'Error updating system settings' });
  }
};

// @desc    Reset system settings to defaults
// @route   POST /api/admin/system-settings/reset
// @access  Private/Admin
export const resetSystemSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    await SystemSettings.deleteMany({});
    const settings = await SystemSettings.getSettings();
    res.json({
      message: 'System settings reset to defaults',
      settings,
    });
  } catch (error: any) {
    adminLogger.error('Reset system settings error:', error);
    res.status(500).json({ message: 'Error resetting system settings' });
  }
};
