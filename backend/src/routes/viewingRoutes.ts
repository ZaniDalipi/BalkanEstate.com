import express from 'express';
import {
  getSchedule,
  updateSchedule,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlots,
  bookViewing,
  rescheduleViewing,
  cancelViewing,
  completeViewing,
  addFeedback,
  getMyViewings,
  getViewing,
  getPropertyViewings,
  getCalendar,
  markNoShow,
} from '../controllers/viewingController';
import { protect, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/available/:propertyId', optionalAuth, getAvailableSlots);

// Protected routes
router.use(protect);

// Schedule management
router.get('/schedule', getSchedule);
router.put('/schedule', updateSchedule);
router.post('/schedule/blocked-dates', addBlockedDate);
router.delete('/schedule/blocked-dates', removeBlockedDate);

// Calendar view
router.get('/calendar', getCalendar);

// Viewing management
router.get('/', getMyViewings);
router.post('/book', bookViewing);
router.get('/property/:propertyId', getPropertyViewings);
router.get('/:id', getViewing);
router.put('/:id/reschedule', rescheduleViewing);
router.put('/:id/cancel', cancelViewing);
router.put('/:id/complete', completeViewing);
router.put('/:id/no-show', markNoShow);
router.post('/:id/feedback', addFeedback);

export default router;
