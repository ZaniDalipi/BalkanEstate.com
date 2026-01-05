import { Request, Response } from 'express';
import { IUser } from '../models/User';
import viewingService from '../services/viewingService';

// @desc    Get user's viewing schedule settings
// @route   GET /api/viewings/schedule
// @access  Private
export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const schedule = await viewingService.getOrCreateSchedule(userId);

    res.json({ schedule });
  } catch (error: any) {
    console.error('Get schedule error:', error);
    res.status(500).json({ message: 'Error fetching schedule', error: error.message });
  }
};

// @desc    Update user's viewing schedule settings
// @route   PUT /api/viewings/schedule
// @access  Private
export const updateSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const schedule = await viewingService.updateSchedule(userId, req.body);

    res.json({ schedule });
  } catch (error: any) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: 'Error updating schedule', error: error.message });
  }
};

// @desc    Add a blocked date to schedule
// @route   POST /api/viewings/schedule/blocked-dates
// @access  Private
export const addBlockedDate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { date, reason } = req.body;

    if (!date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const schedule = await viewingService.addBlockedDate(userId, new Date(date), reason);

    res.json({ schedule });
  } catch (error: any) {
    console.error('Add blocked date error:', error);
    res.status(500).json({ message: 'Error adding blocked date', error: error.message });
  }
};

// @desc    Remove a blocked date from schedule
// @route   DELETE /api/viewings/schedule/blocked-dates
// @access  Private
export const removeBlockedDate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { date } = req.body;

    if (!date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const schedule = await viewingService.removeBlockedDate(userId, new Date(date));

    res.json({ schedule });
  } catch (error: any) {
    console.error('Remove blocked date error:', error);
    res.status(500).json({ message: 'Error removing blocked date', error: error.message });
  }
};

// @desc    Get available time slots for a property on a specific date
// @route   GET /api/viewings/available/:propertyId
// @access  Public
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ message: 'Date query parameter is required' });
      return;
    }

    const slots = await viewingService.getAvailableSlots(propertyId, new Date(date));

    res.json({ slots });
  } catch (error: any) {
    console.error('Get available slots error:', error);
    res.status(error.message === 'Property not found' ? 404 : 500).json({
      message: error.message || 'Error fetching available slots',
    });
  }
};

// @desc    Book a viewing appointment
// @route   POST /api/viewings/book
// @access  Private
export const bookViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { propertyId, startTime, notes } = req.body;

    if (!propertyId || !startTime) {
      res.status(400).json({ message: 'Property ID and start time are required' });
      return;
    }

    const buyerId = String((req.user as IUser)._id);

    const viewing = await viewingService.bookViewing({
      propertyId,
      buyerId,
      startTime: new Date(startTime),
      notes,
    });

    res.status(201).json({ viewing });
  } catch (error: any) {
    console.error('Book viewing error:', error);

    // Handle specific errors
    const errorMessages = [
      'Property not found',
      'You cannot book a viewing for your own property',
      'Selected time slot is not available',
      'You already have a scheduled viewing for this property',
    ];

    const statusCode = errorMessages.includes(error.message) ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error booking viewing' });
  }
};

// @desc    Reschedule a viewing
// @route   PUT /api/viewings/:id/reschedule
// @access  Private
export const rescheduleViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { newStartTime, reason } = req.body;

    if (!newStartTime) {
      res.status(400).json({ message: 'New start time is required' });
      return;
    }

    const userId = String((req.user as IUser)._id);

    const viewing = await viewingService.rescheduleViewing({
      viewingId: id,
      userId,
      newStartTime: new Date(newStartTime),
      reason,
    });

    res.json({ viewing });
  } catch (error: any) {
    console.error('Reschedule viewing error:', error);

    const errorMessages = [
      'Viewing not found',
      'Not authorized to reschedule this viewing',
      'This viewing cannot be rescheduled',
      'Selected time slot is not available',
    ];

    const statusCode = error.message === 'Viewing not found' ? 404 :
                       errorMessages.includes(error.message) ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Error rescheduling viewing' });
  }
};

// @desc    Cancel a viewing
// @route   PUT /api/viewings/:id/cancel
// @access  Private
export const cancelViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { reason } = req.body;

    const userId = String((req.user as IUser)._id);

    const viewing = await viewingService.cancelViewing({
      viewingId: id,
      userId,
      reason,
    });

    res.json({ viewing, message: 'Viewing cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel viewing error:', error);

    const statusCode = error.message === 'Viewing not found' ? 404 :
                       error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ message: error.message || 'Error cancelling viewing' });
  }
};

// @desc    Mark viewing as completed
// @route   PUT /api/viewings/:id/complete
// @access  Private (Agent only)
export const completeViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { agentNotes } = req.body;

    const agentId = String((req.user as IUser)._id);

    const viewing = await viewingService.completeViewing(id, agentId, agentNotes);

    res.json({ viewing, message: 'Viewing marked as completed' });
  } catch (error: any) {
    console.error('Complete viewing error:', error);

    const statusCode = error.message === 'Viewing not found' ? 404 :
                       error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ message: error.message || 'Error completing viewing' });
  }
};

// @desc    Add feedback to a completed viewing
// @route   POST /api/viewings/:id/feedback
// @access  Private (Buyer only)
export const addFeedback = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const { rating, interested, comments } = req.body;

    if (typeof interested !== 'boolean') {
      res.status(400).json({ message: 'Interested field is required' });
      return;
    }

    const buyerId = String((req.user as IUser)._id);

    const viewing = await viewingService.addViewingFeedback(id, buyerId, {
      rating,
      interested,
      comments,
    });

    res.json({ viewing, message: 'Feedback added successfully' });
  } catch (error: any) {
    console.error('Add feedback error:', error);

    const statusCode = error.message === 'Viewing not found' ? 404 :
                       error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ message: error.message || 'Error adding feedback' });
  }
};

// @desc    Get user's viewings
// @route   GET /api/viewings
// @access  Private
export const getMyViewings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const userId = String((req.user as IUser)._id);
    const { role, status, upcoming, limit } = req.query;

    const viewings = await viewingService.getUserViewings(userId, {
      role: role as 'agent' | 'buyer' | 'all' | undefined,
      status: status ? (status as string).split(',') as any : undefined,
      upcoming: upcoming === 'true',
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ viewings });
  } catch (error: any) {
    console.error('Get my viewings error:', error);
    res.status(500).json({ message: 'Error fetching viewings', error: error.message });
  }
};

// @desc    Get a single viewing by ID
// @route   GET /api/viewings/:id
// @access  Private
export const getViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const userId = String((req.user as IUser)._id);

    const viewings = await viewingService.getUserViewings(userId, {});
    const viewing = viewings.find((v) => String(v._id) === id);

    if (!viewing) {
      res.status(404).json({ message: 'Viewing not found' });
      return;
    }

    res.json({ viewing });
  } catch (error: any) {
    console.error('Get viewing error:', error);
    res.status(500).json({ message: 'Error fetching viewing', error: error.message });
  }
};

// @desc    Get viewings for a specific property (seller/agent only)
// @route   GET /api/viewings/property/:propertyId
// @access  Private
export const getPropertyViewings = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { propertyId } = req.params;
    const { status, upcoming } = req.query;

    // TODO: Add authorization check to ensure user owns the property
    const viewings = await viewingService.getPropertyViewings(propertyId, {
      status: status ? (status as string).split(',') as any : undefined,
      upcoming: upcoming === 'true',
    });

    res.json({ viewings });
  } catch (error: any) {
    console.error('Get property viewings error:', error);
    res.status(500).json({ message: 'Error fetching property viewings', error: error.message });
  }
};

// @desc    Get agent's calendar view
// @route   GET /api/viewings/calendar
// @access  Private
export const getCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Start and end dates are required' });
      return;
    }

    const agentId = String((req.user as IUser)._id);

    const viewings = await viewingService.getAgentCalendar(
      agentId,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    // Also get the schedule for blocked dates
    const schedule = await viewingService.getOrCreateSchedule(agentId);

    res.json({ viewings, schedule });
  } catch (error: any) {
    console.error('Get calendar error:', error);
    res.status(500).json({ message: 'Error fetching calendar', error: error.message });
  }
};

// @desc    Mark viewing as no-show
// @route   PUT /api/viewings/:id/no-show
// @access  Private (Agent only)
export const markNoShow = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { id } = req.params;
    const agentId = String((req.user as IUser)._id);

    // Use the viewing service to get and update
    const viewings = await viewingService.getUserViewings(agentId, { role: 'agent' });
    const viewing = viewings.find((v) => String(v._id) === id);

    if (!viewing) {
      res.status(404).json({ message: 'Viewing not found' });
      return;
    }

    if (viewing.agentId._id.toString() !== agentId) {
      res.status(403).json({ message: 'Not authorized to modify this viewing' });
      return;
    }

    // Import Viewing model directly to update
    const Viewing = require('../models/Viewing').default;
    const updatedViewing = await Viewing.findByIdAndUpdate(
      id,
      { status: 'no_show' },
      { new: true }
    );

    res.json({ viewing: updatedViewing, message: 'Viewing marked as no-show' });
  } catch (error: any) {
    console.error('Mark no-show error:', error);
    res.status(500).json({ message: 'Error marking no-show', error: error.message });
  }
};
