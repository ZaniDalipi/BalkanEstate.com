import { Request, Response } from 'express';
import Property from '../models/Property';
import User from '../models/User';
import Viewing from '../models/Viewing';
import { sendViewingConfirmation, sendViewingNotification } from '../services/emailService';
import { apiLogger } from '../utils/logger';

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
    const { propertyId } = req.params;

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
      });
      return;
    }

    // Get existing bookings for this property (next 14 days)
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
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
    res.status(500).json({ message: 'Error fetching availability', error: error.message });
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

    // Validate required fields
    if (!propertyId || !date || !timeSlot || !visitorName || !visitorEmail) {
      res.status(400).json({ message: 'Property ID, date, time slot, name, and email are required' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(visitorEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Validate date is in the future
    const viewingDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (viewingDate < now) {
      res.status(400).json({ message: 'Viewing date must be in the future' });
      return;
    }

    // Find the property
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ message: 'Property not found' });
      return;
    }

    if (property.status === 'sold') {
      res.status(400).json({ message: 'This property is no longer available' });
      return;
    }

    // Check if the slot is available (day of week)
    const va = property.visitAvailability;
    if (va && va.enabled) {
      const dayOfWeek = viewingDate.getDay();
      if (!va.days.includes(dayOfWeek)) {
        res.status(400).json({ message: 'The selected day is not available for viewings' });
        return;
      }

      // Validate time slot is within range
      const slots = generateTimeSlots(va.startTime, va.endTime, va.slotDurationMinutes);
      if (!slots.includes(timeSlot)) {
        res.status(400).json({ message: 'The selected time slot is not available' });
        return;
      }
    }

    // Check for duplicate booking (same property, date, time)
    const dateStr = viewingDate.toISOString().split('T')[0];
    const existingViewing = await Viewing.findOne({
      propertyId,
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

    // Find the seller
    const seller = await User.findById(property.sellerId);
    if (!seller) {
      res.status(404).json({ message: 'Property owner not found' });
      return;
    }

    // Create the viewing
    const viewing = await Viewing.create({
      propertyId: property._id,
      sellerId: property.sellerId,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim().toLowerCase(),
      visitorPhone: visitorPhone?.trim(),
      visitorMessage: visitorMessage?.trim(),
      date: new Date(`${dateStr}T00:00:00.000Z`),
      timeSlot,
      status: 'pending',
    });

    // Increment inquiries count on property
    await Property.findByIdAndUpdate(propertyId, { $inc: { inquiries: 1 } });

    // Build location string
    const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
    const formattedDate = viewingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Send confirmation email to visitor
    try {
      await sendViewingConfirmation({
        visitorEmail: visitorEmail.trim().toLowerCase(),
        visitorName: visitorName.trim(),
        propertyTitle: property.title || `${property.propertyType} in ${property.city}`,
        propertyAddress: location,
        date: formattedDate,
        timeSlot,
        sellerName: seller.name,
        propertyId: String(property._id),
      });
    } catch (emailError) {
      apiLogger.error('Failed to send viewing confirmation email to visitor:', emailError);
    }

    // Send notification email to seller
    try {
      await sendViewingNotification({
        sellerEmail: seller.email,
        sellerName: seller.name,
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail.trim().toLowerCase(),
        visitorPhone: visitorPhone?.trim(),
        visitorMessage: visitorMessage?.trim(),
        propertyTitle: property.title || `${property.propertyType} in ${property.city}`,
        propertyAddress: location,
        date: formattedDate,
        timeSlot,
        propertyId: String(property._id),
      });
    } catch (emailError) {
      apiLogger.error('Failed to send viewing notification email to seller:', emailError);
    }

    apiLogger.info(`[viewingController] Viewing scheduled: ${visitorEmail} for ${property.title || property._id} on ${formattedDate} at ${timeSlot} (ID: ${viewing._id})`);

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
    apiLogger.error('Schedule viewing error:', error);
    res.status(500).json({ message: 'Error scheduling viewing', error: error.message });
  }
};
