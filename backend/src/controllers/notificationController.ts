import { Request, Response } from 'express';
import { IUser } from '../models/User';
import engagementService from '../services/engagementService';
import { NotificationType } from '../models/Notification';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam } from '../utils/validateParams';

/**
 * @desc    Get user's notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as NotificationType | undefined;

    const result = await engagementService.getNotifications(userId, { limit, offset, type });

    res.json({
      notifications: result.notifications,
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    });
  } catch (error: any) {
    apiLogger.error('Get notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const count = await engagementService.getUnreadCount(userId);

    res.json({ count });
  } catch (error: any) {
    apiLogger.error('Get unread count error:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const notificationId = getObjectIdParam(req, res, 'id');
    if (!notificationId) return;

    const success = await engagementService.markAsRead(notificationId, userId);

    if (success) {
      res.json({ success: true, message: 'Notification marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error: any) {
    apiLogger.error('Mark as read error:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const count = await engagementService.markAllAsRead(userId);

    res.json({ success: true, markedCount: count });
  } catch (error: any) {
    apiLogger.error('Mark all as read error:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
};

/**
 * @desc    Mark all notifications of specific types as read
 * @route   PATCH /api/notifications/read-by-types
 * @access  Private
 */
export const markAsReadByTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { types } = req.body;

    if (!Array.isArray(types) || types.length === 0) {
      res.status(400).json({ message: 'types must be a non-empty array' });
      return;
    }

    const count = await engagementService.markAsReadByTypes(userId, types);
    res.json({ success: true, markedCount: count });
  } catch (error: any) {
    apiLogger.error('Mark as read by types error:', error);
    res.status(500).json({ message: 'Error marking notifications as read' });
  }
};

/**
 * @desc    Get unread notification count for specific types
 * @route   GET /api/notifications/unread-count-by-types
 * @access  Private
 */
export const getUnreadCountByTypes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const typesParam = req.query.types as string;

    if (!typesParam) {
      res.status(400).json({ message: 'types query parameter is required' });
      return;
    }

    const types = typesParam.split(',');
    const count = await engagementService.getUnreadCountByTypes(userId, types);
    res.json({ count });
  } catch (error: any) {
    apiLogger.error('Get unread count by types error:', error);
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

/**
 * @desc    Get unread notifications (quick fetch)
 * @route   GET /api/notifications/unread
 * @access  Private
 */
export const getUnreadNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const limit = parseInt(req.query.limit as string) || 10;

    const notifications = await engagementService.getUnreadNotifications(userId, limit);

    res.json({ notifications });
  } catch (error: any) {
    apiLogger.error('Get unread notifications error:', error);
    res.status(500).json({ message: 'Error fetching unread notifications' });
  }
};
