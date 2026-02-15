import { Request, Response } from 'express';
import { activityLogger } from '../services/activityLogger';
import { ActivityCategory, ActivitySeverity } from '../models/ActivityLog';

/**
 * @desc    Get activity logs with filters
 * @route   GET /api/admin/activity-logs
 * @access  Private/Admin
 */
export const getActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      severity,
      userId,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await activityLogger.getLogs({
      category: category as ActivityCategory | undefined,
      severity: severity as ActivitySeverity | undefined,
      userId: userId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 100), // Cap at 100
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activity logs',
    });
  }
};

/**
 * @desc    Get daily summary of activity
 * @route   GET /api/admin/activity-logs/summary
 * @access  Private/Admin
 */
export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await activityLogger.getDailySummary();

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching activity summary',
    });
  }
};

/**
 * @desc    Get activity logs for a specific user
 * @route   GET /api/admin/activity-logs/user/:userId
 * @access  Private/Admin
 */
export const getUserActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    const result = await activityLogger.getLogs({
      userId,
      page: parseInt(page as string, 10),
      limit: Math.min(parseInt(limit as string, 10), 100),
    });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity logs',
    });
  }
};

export default {
  getActivityLogs,
  getDailySummary,
  getUserActivityLogs,
};
