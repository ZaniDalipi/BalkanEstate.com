import { Request, Response } from 'express';
import Property from '../models/Property';
import User from '../models/User';
import Viewing from '../models/Viewing';
import { sendViewingConfirmation, sendViewingNotification, sendViewingApproved, sendViewingRejected } from '../services/emailService';
import { createNotificationWithPush } from '../services/engagementService';
import { apiLogger } from '../utils/logger';
import { getObjectIdParam, isValidObjectId } from '../utils/validateParams';
import { resolveId } from '../utils/idObfuscation';

/** Validate HH:MM time slot format */
const TIME_SLOT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validate YYYY-MM-DD date format */
const DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** Maximum allowed string lengths for visitor fields */
const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Generate time slots based on property's visit availability
 */
function generateTimeSlots(startTime: string, endTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let m = startMinutes; m + durationMinutes <= endMinutes; m += durationMinutes) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

/**
 * @desc    Get available viewing slots for a property
 * @route   GET /api/viewings/availability/:propertyId
 * @access  Public
 */
export const getViewingAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = getObjectIdParam(req, res, 'propertyId');
    if (!propertyId) return;

    const property = await Property.findById(propertyId).select('visitAvailability status');
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    const va = property.visitAvailability;
    if (!va || !va.enabled) {
      // Return default availability if not configured
      res.json({
        enabled: false,
        days: [1, 2, 3, 4, 5],
        timeSlots: generateTimeSlots('09:00', '18:00', 30),
        slotDurationMinutes: 30,
        notes: '',
        bookedSlots: [],
      });
      return;
    }

    // Get existing bookings for this property (next 21 days to match frontend range)
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
    const existingViewings = await Viewing.find({
      propertyId,
      date: { $gte: now, $lte: twoWeeksLater },
      status: { $in: ['pending', 'confirmed'] },
    }).select('date timeSlot');

    // Build a set of booked slots for quick lookup
    const bookedSlots = new Set(
      existingViewings.map(v => `${v.date.toISOString().split('T')[0]}_${v.timeSlot}`)
    );

    res.json({
      enabled: true,
      days: va.days,
      timeSlots: generateTimeSlots(va.startTime, va.endTime, va.slotDurationMinutes),
      slotDurationMinutes: va.slotDurationMinutes,
      notes: va.notes || '',
      bookedSlots: Array.from(bookedSlots),
    });
  } catch (error: any) {
    apiLogger.error('Get viewing availability error:', error);
    res.status(500).json({ message: 'Error fetching availability' });
  }
};

/**
 * @desc    Schedule a viewing for a property
 * @route   POST /api/viewings
 * @access  Public (rate limited)
 */
export const scheduleViewing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId, date, timeSlot, visitorName, visitorEmail, visitorPhone, visitorMessage } = req.body;

    // ── Validate required fields ──
    if (!propertyId || !date || !timeSlot || !visitorName || !visitorEmail) {
      res.status(400).json({ message: 'Property ID, date, time slot, name, and email are required' });
      return;
    }

    // ── Resolve propertyId (supports raw hex ObjectIds and obfuscated encoded IDs) ──
    const resolvedPropertyId = typeof propertyId === 'string' ? resolveId(propertyId) : null;
    if (!resolvedPropertyId || !isValidObjectId(resolvedPropertyId)) {
      res.status(400).json({ message: 'Invalid property ID format' });
      return;
    }

    // ── Validate and sanitize string field lengths ──
    if (typeof visitorName !== 'string' || visitorName.trim().length === 0 || visitorName.length > MAX_NAME_LENGTH) {
      res.status(400).json({ message: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` });
      return;
    }
    if (typeof visitorEmail !== 'string' || visitorEmail.length > MAX_EMAIL_LENGTH) {
      res.status(400).json({ message: 'Invalid email' });
      return;
    }
    if (visitorPhone != null && (typeof visitorPhone !== 'string' || visitorPhone.length > MAX_PHONE_LENGTH)) {
      res.status(400).json({ message: `Phone must be at most ${MAX_PHONE_LENGTH} characters` });
      return;
    }
    if (visitorMessage != null && (typeof visitorMessage !== 'string' || visitorMessage.length > MAX_MESSAGE_LENGTH)) {
      res.status(400).json({ message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters` });
      return;
    }

    // ── Validate email format ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // ── Validate date format and value ──
    if (typeof date !== 'string' || !DATE_REGEX.test(date)) {
      res.status(400).json({ message: 'Invalid date format. Expected YYYY-MM-DD' });
      return;
    }
    const viewingDate = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(viewingDate.getTime())) {
      res.status(400).json({ message: 'Invalid date value' });
      return;
    }
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    if (viewingDate < now) {
      res.status(400).json({ message: 'Viewing date must be in the future' });
      return;
    }

    // ── Validate time slot format ──
    if (typeof timeSlot !== 'string' || !TIME_SLOT_REGEX.test(timeSlot)) {
      res.status(400).json({ message: 'Invalid time slot format. Expected HH:MM' });
      return;
    }

    // ── Find the property ──
    const property = await Property.findById(resolvedPropertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.status === 'sold') {
      res.status(400).json({ message: 'This property is no longer available' });
      return;
    }

    // ── Check day-of-week and time slot against visit availability ──
    const va = property.visitAvailability;
    if (va && va.enabled) {
      const dayOfWeek = viewingDate.getUTCDay();
      if (!va.days.includes(dayOfWeek)) {
        res.status(400).json({ message: 'The selected day is not available for viewings' });
        return;
      }

      const slots = generateTimeSlots(va.startTime, va.endTime, va.slotDurationMinutes);
      if (!slots.includes(timeSlot)) {
        res.status(400).json({ message: 'The selected time slot is not available' });
        return;
      }
    }

    // ── Check for duplicate booking (same property, date, time) ──
    const dateStr = date; // Already validated as YYYY-MM-DD
    const existingViewing = await Viewing.findOne({
      propertyId: resolvedPropertyId,
      date: {
        $gte: new Date(`${dateStr}T00:00:00.000Z`),
        $lt: new Date(`${dateStr}T23:59:59.999Z`),
      },
      timeSlot,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingViewing) {
      res.status(409).json({ message: 'This time slot is already booked. Please select a different time.' });
      return;
    }

    // ── Find the seller ──
    const seller = await User.findById(property.sellerId);
    if (!seller) {
      res.status(404).json({ message: 'Property owner not found' });
      return;
    }

    // ── Create the viewing ──
    const trimmedName = visitorName.trim();
    const trimmedEmail = visitorEmail.trim().toLowerCase();
    const trimmedPhone = visitorPhone?.trim() || undefined;
    const trimmedMessage = visitorMessage?.trim() || undefined;

    const viewing = await Viewing.create({
      propertyId: property._id,
      sellerId: property.sellerId,
      visitorName: trimmedName,
      visitorEmail: trimmedEmail,
      visitorPhone: trimmedPhone,
      visitorMessage: trimmedMessage,
      date: new Date(`${dateStr}T00:00:00.000Z`),
      timeSlot,
      status: 'pending',
    });

    // Increment inquiries count (fire-and-forget — don't fail the request if this errors)
    Property.findByIdAndUpdate(resolvedPropertyId, { $inc: { inquiries: 1 } }).catch(err =>
      apiLogger.error(`Failed to increment inquiries for property ${resolvedPropertyId}:`, err)
    );

    // ── Send notification emails (non-blocking) ──
    const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
    const propertyTitle = property.title || `${property.propertyType} in ${property.city}`;

    // ── Create in-app notification + push for the seller ──
    createNotificationWithPush({
      userId: property.sellerId,
      type: 'new_viewing',
      title: 'New Viewing Request',
      message: `${trimmedName} requested a viewing for ${propertyTitle}.`,
      icon: 'calendar',
      priority: 'high',
      data: {
        propertyId: String(property._id),
        propertyTitle,
        viewingId: String(viewing._id),
        visitorName: trimmedName,
        actionUrl: '/seller?tab=viewings',
        actionLabel: 'View Requests',
      },
    }).catch(err => apiLogger.error('Failed to create new viewing notification:', err));
    const formattedDate = viewingDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    // Send emails in parallel without blocking the response
    Promise.allSettled([
      sendViewingConfirmation({
        visitorEmail: trimmedEmail,
        visitorName: trimmedName,
        propertyTitle,
        propertyAddress: location,
        date: formattedDate,
        timeSlot,
        sellerName: seller.name,
        propertyId: String(property._id),
      }),
      sendViewingNotification({
        sellerEmail: seller.email,
        sellerName: seller.name,
        visitorName: trimmedName,
        visitorEmail: trimmedEmail,
        visitorPhone: trimmedPhone,
        visitorMessage: trimmedMessage,
        propertyTitle,
        propertyAddress: location,
        date: formattedDate,
        timeSlot,
        propertyId: String(property._id),
      }),
    ]).then(results => {
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          apiLogger.error(`Failed to send viewing ${i === 0 ? 'confirmation' : 'notification'} email:`, result.reason);
        }
      });
    });

    apiLogger.info(`[viewingController] Viewing scheduled: ${trimmedEmail} for ${propertyTitle} on ${formattedDate} at ${timeSlot} (ID: ${viewing._id})`);

    res.status(201).json({
      message: 'Viewing scheduled successfully',
      viewing: {
        id: viewing._id,
        date: dateStr,
        timeSlot,
        status: 'pending',
      },
    });
  } catch (error: any) {
    apiLogger.error('Schedule viewing error:', { message: error.message, stack: error.stack, name: error.name });
    res.status(500).json({ message: 'Error scheduling viewing. Please try again later.' });
  }
};

/**
 * @desc    Get all viewing requests for the authenticated seller/agent
 * @route   GET /api/viewings/seller
 * @access  Private (seller/agent)
 */
export const getSellerViewings = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const { status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const filter: any = { sellerId };
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status as string)) {
      filter.status = status;
    }

    const [viewings, total] = await Promise.all([
      Viewing.find(filter)
        .populate('propertyId', 'title propertyType city country address imageUrl price listingType')
        .sort({ date: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Viewing.countDocuments(filter),
    ]);

    // Also return counts by status for the tabs
    const [pendingCount, confirmedCount, cancelledCount, completedCount] = await Promise.all([
      Viewing.countDocuments({ sellerId, status: 'pending' }),
      Viewing.countDocuments({ sellerId, status: 'confirmed' }),
      Viewing.countDocuments({ sellerId, status: 'cancelled' }),
      Viewing.countDocuments({ sellerId, status: 'completed' }),
    ]);

    res.json({
      viewings: viewings.map(v => ({
        id: v._id,
        property: v.propertyId,
        visitorName: v.visitorName,
        visitorEmail: v.visitorEmail,
        visitorPhone: v.visitorPhone,
        visitorMessage: v.visitorMessage,
        date: v.date,
        timeSlot: v.timeSlot,
        status: v.status,
        cancelledBy: v.cancelledBy,
        cancelReason: v.cancelReason,
        createdAt: v.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      counts: {
        pending: pendingCount,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
        completed: completedCount,
        total: pendingCount + confirmedCount + cancelledCount + completedCount,
      },
    });
  } catch (error: any) {
    apiLogger.error('Get seller viewings error:', error);
    res.status(500).json({ message: 'Error fetching viewings' });
  }
};

/**
 * @desc    Update viewing status (approve/reject/complete)
 * @route   PATCH /api/viewings/:viewingId/status
 * @access  Private (seller/agent who owns the property)
 */
export const updateViewingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const sellerId = req.user?._id;
    if (!sellerId) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const viewingId = getObjectIdParam(req, res, 'viewingId');
    if (!viewingId) return;
    const { status, cancelReason } = req.body;

    if (!status || !['confirmed', 'cancelled', 'completed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status. Must be: confirmed, cancelled, or completed' });
      return;
    }

    const viewing = await Viewing.findById(viewingId);
    if (!viewing) {
      res.status(404).json({ message: 'Viewing not found' });
      return;
    }

    // Verify the seller owns this viewing
    if (String(viewing.sellerId) !== String(sellerId)) {
      res.status(403).json({ message: 'You do not have permission to manage this viewing' });
      return;
    }

    // Validate state transitions
    if (viewing.status === 'completed') {
      res.status(400).json({ message: 'Cannot change status of a completed viewing' });
      return;
    }
    if (viewing.status === 'cancelled') {
      res.status(400).json({ message: 'Cannot change status of a cancelled viewing' });
      return;
    }

    const oldStatus = viewing.status;
    viewing.status = status;
    if (status === 'cancelled') {
      viewing.cancelledBy = 'seller';
      viewing.cancelReason = cancelReason?.trim() || undefined;
    }
    await viewing.save();

    // Get property details for the email
    const property = await Property.findById(viewing.propertyId).select('title propertyType city country address');
    const propertyTitle = property?.title || `${property?.propertyType || 'Property'} in ${property?.city || 'Unknown'}`;
    const location = property ? [property.address, property.city, property.country].filter(Boolean).join(', ') : '';

    const viewingDate = new Date(viewing.date);
    const formattedDate = viewingDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const sellerName = req.user?.name || 'Property Owner';

    // ── Create in-app notification + push for the seller ──
    if (status === 'confirmed' || status === 'cancelled') {
      createNotificationWithPush({
        userId: sellerId,
        type: status === 'confirmed' ? 'viewing_approved' : 'viewing_declined',
        title: status === 'confirmed' ? 'Viewing Approved' : 'Viewing Declined',
        message: status === 'confirmed'
          ? `You approved ${viewing.visitorName}'s viewing for ${propertyTitle} on ${formattedDate} at ${viewing.timeSlot}.`
          : `You declined ${viewing.visitorName}'s viewing for ${propertyTitle} on ${formattedDate}.`,
        icon: status === 'confirmed' ? 'check-circle' : 'x-circle',
        priority: 'normal',
        data: {
          propertyId: String(viewing.propertyId),
          propertyTitle,
          viewingId: String(viewing._id),
          visitorName: viewing.visitorName,
          date: formattedDate,
          timeSlot: viewing.timeSlot,
        },
      }).catch(err => apiLogger.error('Failed to create viewing notification:', err));
    }

    // ── Send email notifications (non-blocking — don't delay the response) ──
    if (status === 'confirmed' && oldStatus === 'pending') {
      sendViewingApproved({
        visitorEmail: viewing.visitorEmail,
        visitorName: viewing.visitorName,
        propertyTitle,
        propertyAddress: location,
        date: formattedDate,
        timeSlot: viewing.timeSlot,
        sellerName,
        sellerPhone: req.user?.phone,
        propertyId: String(viewing.propertyId),
      }).catch(err => apiLogger.error('Failed to send viewing approved email:', err));
    } else if (status === 'cancelled') {
      sendViewingRejected({
        visitorEmail: viewing.visitorEmail,
        visitorName: viewing.visitorName,
        propertyTitle,
        propertyAddress: location,
        date: formattedDate,
        timeSlot: viewing.timeSlot,
        sellerName,
        cancelReason: cancelReason?.trim(),
        propertyId: String(viewing.propertyId),
      }).catch(err => apiLogger.error('Failed to send viewing rejected email:', err));
    }

    apiLogger.info(`[viewingController] Viewing ${viewingId} status updated: ${oldStatus} → ${status} by seller ${sellerId}`);

    res.json({
      message: `Viewing ${status === 'confirmed' ? 'approved' : status === 'cancelled' ? 'declined' : 'completed'} successfully`,
      viewing: {
        id: viewing._id,
        status: viewing.status,
      },
    });
  } catch (error: any) {
    apiLogger.error('Update viewing status error:', error);
    res.status(500).json({ message: 'Error updating viewing status' });
  }
};
