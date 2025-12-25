import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
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

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', markAllAsRead);

// PATCH /api/notifications/:id/read - Mark single notification as read
router.patch('/:id/read', markAsRead);

export default router;
