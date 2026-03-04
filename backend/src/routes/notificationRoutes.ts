import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  getUnreadCountByTypes,
  markAsRead,
  markAllAsRead,
  markAsReadByTypes,
  getUnreadNotifications,
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/notifications - Get all notifications with pagination
router.get('/', getNotifications);

// GET /api/notifications/unread - Get unread notifications
router.get('/unread', getUnreadNotifications);

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', getUnreadCount);

// GET /api/notifications/unread-count-by-types - Get unread count for specific types
router.get('/unread-count-by-types', getUnreadCountByTypes);

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllAsRead);

// PATCH /api/notifications/read-by-types - Mark all of specific types as read
router.patch('/read-by-types', markAsReadByTypes);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', markAsRead);

export default router;
