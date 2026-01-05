import mongoose from 'mongoose';
import Viewing, { IViewing, ViewingStatus } from '../models/Viewing';
import ViewingSchedule, { IViewingSchedule, IWorkingDay } from '../models/ViewingSchedule';
import Property from '../models/Property';
import User from '../models/User';
import emailService from './emailService';
import { getSocketInstance } from '../utils/socketInstance';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

interface AvailableSlot extends TimeSlot {
  formatted: string; // Human readable format
}

interface BookViewingParams {
  propertyId: string;
  buyerId: string;
  startTime: Date;
  notes?: string;
}

interface RescheduleParams {
  viewingId: string;
  userId: string;
  newStartTime: Date;
  reason?: string;
}

interface CancelParams {
  viewingId: string;
  userId: string;
  reason?: string;
}

/**
 * Get or create a viewing schedule for a user
 */
export async function getOrCreateSchedule(userId: string): Promise<IViewingSchedule> {
  let schedule = await ViewingSchedule.findOne({ userId });

  if (!schedule) {
    schedule = await ViewingSchedule.create({ userId });
  }

  return schedule;
}

/**
 * Update a user's viewing schedule settings
 */
export async function updateSchedule(
  userId: string,
  updates: Partial<IViewingSchedule>
): Promise<IViewingSchedule> {
  const schedule = await getOrCreateSchedule(userId);

  // Only allow updating specific fields
  const allowedUpdates = [
    'workingDays',
    'timezone',
    'viewingDuration',
    'bufferTime',
    'maxViewingsPerDay',
    'advanceBookingDays',
    'minimumNotice',
    'blockedDates',
    'autoConfirm',
    'requireApproval',
    'notifyByEmail',
    'notifyBySms',
  ];

  allowedUpdates.forEach((field) => {
    if (updates[field as keyof IViewingSchedule] !== undefined) {
      (schedule as any)[field] = updates[field as keyof IViewingSchedule];
    }
  });

  await schedule.save();
  return schedule;
}

/**
 * Add a blocked date to the schedule
 */
export async function addBlockedDate(
  userId: string,
  date: Date,
  reason?: string
): Promise<IViewingSchedule> {
  const schedule = await getOrCreateSchedule(userId);

  // Check if date is already blocked
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  const exists = schedule.blockedDates.some((blocked) => {
    const blockedStart = new Date(blocked.date);
    blockedStart.setHours(0, 0, 0, 0);
    return blockedStart.getTime() === dateStart.getTime();
  });

  if (!exists) {
    schedule.blockedDates.push({ date: dateStart, reason });
    await schedule.save();
  }

  return schedule;
}

/**
 * Remove a blocked date from the schedule
 */
export async function removeBlockedDate(
  userId: string,
  date: Date
): Promise<IViewingSchedule> {
  const schedule = await getOrCreateSchedule(userId);

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);

  schedule.blockedDates = schedule.blockedDates.filter((blocked) => {
    const blockedStart = new Date(blocked.date);
    blockedStart.setHours(0, 0, 0, 0);
    return blockedStart.getTime() !== dateStart.getTime();
  });

  await schedule.save();
  return schedule;
}

/**
 * Get the day name from a date
 */
function getDayName(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Parse time string (HH:mm) to minutes from midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get available time slots for a property on a specific date
 */
export async function getAvailableSlots(
  propertyId: string,
  date: Date
): Promise<AvailableSlot[]> {
  const property = await Property.findById(propertyId);
  if (!property) {
    throw new Error('Property not found');
  }

  const agentId = property.sellerId.toString();
  const schedule = await getOrCreateSchedule(agentId);

  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);

  const now = new Date();

  // Check if date is in the past
  if (queryDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return [];
  }

  // Check if date is too far in the future
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + schedule.advanceBookingDays);
  if (queryDate > maxDate) {
    return [];
  }

  // Check if date is blocked
  const isBlocked = schedule.blockedDates.some((blocked) => {
    const blockedDate = new Date(blocked.date);
    blockedDate.setHours(0, 0, 0, 0);
    return blockedDate.getTime() === queryDate.getTime();
  });

  if (isBlocked) {
    return [];
  }

  // Get working day config
  const dayName = getDayName(queryDate);
  const workingDay = schedule.workingDays.find((d) => d.day === dayName);

  if (!workingDay || !workingDay.enabled || workingDay.slots.length === 0) {
    return [];
  }

  // Get existing viewings for this agent on this date
  const dayStart = new Date(queryDate);
  const dayEnd = new Date(queryDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existingViewings = await Viewing.find({
    agentId,
    startTime: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['scheduled', 'rescheduled'] },
  }).sort({ startTime: 1 });

  // Check max viewings per day
  if (schedule.maxViewingsPerDay > 0 && existingViewings.length >= schedule.maxViewingsPerDay) {
    return [];
  }

  const availableSlots: AvailableSlot[] = [];
  const viewingDuration = schedule.viewingDuration;
  const bufferTime = schedule.bufferTime;
  const totalSlotDuration = viewingDuration + bufferTime;

  // Calculate minimum booking time (now + minimumNotice hours)
  const minimumBookingTime = new Date(now.getTime() + schedule.minimumNotice * 60 * 60 * 1000);

  // Generate slots for each working period
  for (const slot of workingDay.slots) {
    const slotStartMinutes = timeToMinutes(slot.start);
    const slotEndMinutes = timeToMinutes(slot.end);

    // Generate potential time slots
    for (let minutes = slotStartMinutes; minutes + viewingDuration <= slotEndMinutes; minutes += totalSlotDuration) {
      const slotStart = new Date(queryDate);
      slotStart.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + viewingDuration);

      // Skip if slot is before minimum booking time
      if (slotStart < minimumBookingTime) {
        continue;
      }

      // Check for conflicts with existing viewings (including buffer time)
      const hasConflict = existingViewings.some((viewing) => {
        const viewingStart = new Date(viewing.startTime);
        const viewingEndWithBuffer = new Date(viewing.endTime);
        viewingEndWithBuffer.setMinutes(viewingEndWithBuffer.getMinutes() + bufferTime);

        // Check if slot overlaps with viewing (including buffer)
        return (
          (slotStart >= viewingStart && slotStart < viewingEndWithBuffer) ||
          (slotEnd > viewingStart && slotEnd <= viewingEndWithBuffer) ||
          (slotStart <= viewingStart && slotEnd >= viewingEndWithBuffer)
        );
      });

      if (!hasConflict) {
        availableSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          formatted: `${slotStart.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })} - ${slotEnd.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })}`,
        });
      }
    }
  }

  return availableSlots;
}

/**
 * Book a viewing appointment
 */
export async function bookViewing(params: BookViewingParams): Promise<IViewing> {
  const { propertyId, buyerId, startTime, notes } = params;

  // Get property and validate
  const property = await Property.findById(propertyId).populate('sellerId', 'name email');
  if (!property) {
    throw new Error('Property not found');
  }

  const agentId = property.sellerId._id.toString();

  // Prevent booking own property
  if (agentId === buyerId) {
    throw new Error('You cannot book a viewing for your own property');
  }

  // Get schedule for validation
  const schedule = await getOrCreateSchedule(agentId);

  // Validate time slot is available
  const slotDate = new Date(startTime);
  const availableSlots = await getAvailableSlots(propertyId, slotDate);

  const isSlotAvailable = availableSlots.some((slot) => {
    return slot.startTime.getTime() === new Date(startTime).getTime();
  });

  if (!isSlotAvailable) {
    throw new Error('Selected time slot is not available');
  }

  // Check for duplicate booking
  const existingBooking = await Viewing.findOne({
    propertyId,
    buyerId,
    status: { $in: ['scheduled', 'rescheduled'] },
    startTime: { $gte: new Date() },
  });

  if (existingBooking) {
    throw new Error('You already have a scheduled viewing for this property');
  }

  // Calculate end time
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + schedule.viewingDuration);

  // Create the viewing
  const viewing = await Viewing.create({
    propertyId,
    agentId,
    buyerId,
    startTime,
    endTime,
    notes,
    status: schedule.autoConfirm ? 'scheduled' : 'scheduled', // Future: add 'pending' status for approval workflow
  });

  // Populate for response and notifications
  await viewing.populate([
    { path: 'propertyId', select: 'title address city imageUrl' },
    { path: 'agentId', select: 'name email' },
    { path: 'buyerId', select: 'name email' },
  ]);

  // Send confirmation emails
  const agent = property.sellerId as any;
  const buyer = await User.findById(buyerId).select('name email');

  if (agent && agent.email && schedule.notifyByEmail) {
    await sendViewingBookedEmailToAgent(viewing, agent, buyer);
  }

  if (buyer && buyer.email) {
    await sendViewingBookedEmailToBuyer(viewing, agent, buyer, property);
  }

  // Emit socket event
  emitViewingEvent('viewing:booked', {
    viewing: viewing.toObject(),
    agentId,
    buyerId,
  });

  return viewing;
}

/**
 * Reschedule a viewing
 */
export async function rescheduleViewing(params: RescheduleParams): Promise<IViewing> {
  const { viewingId, userId, newStartTime, reason } = params;

  const viewing = await Viewing.findById(viewingId).populate([
    { path: 'propertyId', select: 'title address city imageUrl' },
    { path: 'agentId', select: 'name email' },
    { path: 'buyerId', select: 'name email' },
  ]);

  if (!viewing) {
    throw new Error('Viewing not found');
  }

  // Check if user is authorized
  const isAgent = viewing.agentId._id.toString() === userId;
  const isBuyer = viewing.buyerId._id.toString() === userId;

  if (!isAgent && !isBuyer) {
    throw new Error('Not authorized to reschedule this viewing');
  }

  // Check if viewing can be rescheduled
  if (!['scheduled', 'rescheduled'].includes(viewing.status)) {
    throw new Error('This viewing cannot be rescheduled');
  }

  // Validate new time slot
  const availableSlots = await getAvailableSlots(
    viewing.propertyId._id.toString(),
    new Date(newStartTime)
  );

  const isSlotAvailable = availableSlots.some((slot) => {
    return slot.startTime.getTime() === new Date(newStartTime).getTime();
  });

  if (!isSlotAvailable) {
    throw new Error('Selected time slot is not available');
  }

  // Get schedule for duration
  const schedule = await getOrCreateSchedule(viewing.agentId._id.toString());

  // Update the viewing
  const oldStartTime = viewing.startTime;
  viewing.startTime = new Date(newStartTime);
  viewing.endTime = new Date(newStartTime);
  viewing.endTime.setMinutes(viewing.endTime.getMinutes() + schedule.viewingDuration);
  viewing.status = 'rescheduled';
  viewing.reminder24hSent = false;
  viewing.reminder1hSent = false;

  await viewing.save();

  // Send notification emails
  const agent = viewing.agentId as any;
  const buyer = viewing.buyerId as any;
  const property = viewing.propertyId as any;

  await sendViewingRescheduledEmail(viewing, agent, buyer, property, oldStartTime, isAgent ? 'agent' : 'buyer');

  // Emit socket event
  emitViewingEvent('viewing:rescheduled', {
    viewing: viewing.toObject(),
    agentId: agent._id.toString(),
    buyerId: buyer._id.toString(),
    rescheduledBy: isAgent ? 'agent' : 'buyer',
  });

  return viewing;
}

/**
 * Cancel a viewing
 */
export async function cancelViewing(params: CancelParams): Promise<IViewing> {
  const { viewingId, userId, reason } = params;

  const viewing = await Viewing.findById(viewingId).populate([
    { path: 'propertyId', select: 'title address city imageUrl' },
    { path: 'agentId', select: 'name email' },
    { path: 'buyerId', select: 'name email' },
  ]);

  if (!viewing) {
    throw new Error('Viewing not found');
  }

  // Check if user is authorized
  const isAgent = viewing.agentId._id.toString() === userId;
  const isBuyer = viewing.buyerId._id.toString() === userId;

  if (!isAgent && !isBuyer) {
    throw new Error('Not authorized to cancel this viewing');
  }

  // Check if viewing can be cancelled
  if (!['scheduled', 'rescheduled'].includes(viewing.status)) {
    throw new Error('This viewing cannot be cancelled');
  }

  // Update the viewing
  viewing.status = 'cancelled';
  viewing.cancelledBy = isAgent ? 'agent' : 'buyer';
  viewing.cancellationReason = reason;

  await viewing.save();

  // Send cancellation emails
  const agent = viewing.agentId as any;
  const buyer = viewing.buyerId as any;
  const property = viewing.propertyId as any;

  await sendViewingCancelledEmail(viewing, agent, buyer, property, isAgent ? 'agent' : 'buyer');

  // Emit socket event
  emitViewingEvent('viewing:cancelled', {
    viewing: viewing.toObject(),
    agentId: agent._id.toString(),
    buyerId: buyer._id.toString(),
    cancelledBy: isAgent ? 'agent' : 'buyer',
  });

  return viewing;
}

/**
 * Mark viewing as completed
 */
export async function completeViewing(
  viewingId: string,
  agentId: string,
  agentNotes?: string
): Promise<IViewing> {
  const viewing = await Viewing.findById(viewingId);

  if (!viewing) {
    throw new Error('Viewing not found');
  }

  if (viewing.agentId.toString() !== agentId) {
    throw new Error('Not authorized to complete this viewing');
  }

  if (!['scheduled', 'rescheduled'].includes(viewing.status)) {
    throw new Error('This viewing cannot be marked as completed');
  }

  viewing.status = 'completed';
  if (agentNotes) {
    viewing.agentNotes = agentNotes;
  }

  await viewing.save();

  // Emit socket event
  emitViewingEvent('viewing:completed', {
    viewingId: viewing._id.toString(),
    agentId,
    buyerId: viewing.buyerId.toString(),
  });

  return viewing;
}

/**
 * Add buyer feedback to a completed viewing
 */
export async function addViewingFeedback(
  viewingId: string,
  buyerId: string,
  feedback: { rating?: number; interested: boolean; comments?: string }
): Promise<IViewing> {
  const viewing = await Viewing.findById(viewingId);

  if (!viewing) {
    throw new Error('Viewing not found');
  }

  if (viewing.buyerId.toString() !== buyerId) {
    throw new Error('Not authorized to add feedback to this viewing');
  }

  if (viewing.status !== 'completed') {
    throw new Error('Can only add feedback to completed viewings');
  }

  viewing.buyerFeedback = feedback;
  await viewing.save();

  return viewing;
}

/**
 * Get viewings for a user (as agent or buyer)
 */
export async function getUserViewings(
  userId: string,
  options: {
    role?: 'agent' | 'buyer' | 'all';
    status?: ViewingStatus[];
    upcoming?: boolean;
    limit?: number;
  } = {}
): Promise<IViewing[]> {
  const { role = 'all', status, upcoming = false, limit = 50 } = options;

  const query: any = {};

  // Filter by role
  if (role === 'agent') {
    query.agentId = userId;
  } else if (role === 'buyer') {
    query.buyerId = userId;
  } else {
    query.$or = [{ agentId: userId }, { buyerId: userId }];
  }

  // Filter by status
  if (status && status.length > 0) {
    query.status = { $in: status };
  }

  // Filter upcoming only
  if (upcoming) {
    query.startTime = { $gte: new Date() };
  }

  const viewings = await Viewing.find(query)
    .populate('propertyId', 'title address city imageUrl price')
    .populate('agentId', 'name email avatarUrl')
    .populate('buyerId', 'name email avatarUrl')
    .sort({ startTime: upcoming ? 1 : -1 })
    .limit(limit);

  return viewings;
}

/**
 * Get viewings for a specific property
 */
export async function getPropertyViewings(
  propertyId: string,
  options: {
    status?: ViewingStatus[];
    upcoming?: boolean;
  } = {}
): Promise<IViewing[]> {
  const { status, upcoming = false } = options;

  const query: any = { propertyId };

  if (status && status.length > 0) {
    query.status = { $in: status };
  }

  if (upcoming) {
    query.startTime = { $gte: new Date() };
  }

  const viewings = await Viewing.find(query)
    .populate('buyerId', 'name email avatarUrl')
    .sort({ startTime: upcoming ? 1 : -1 });

  return viewings;
}

/**
 * Get agent's calendar view (all viewings in a date range)
 */
export async function getAgentCalendar(
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<IViewing[]> {
  const viewings = await Viewing.find({
    agentId,
    startTime: { $gte: startDate, $lte: endDate },
    status: { $in: ['scheduled', 'rescheduled', 'completed'] },
  })
    .populate('propertyId', 'title address city imageUrl')
    .populate('buyerId', 'name email avatarUrl phone')
    .sort({ startTime: 1 });

  return viewings;
}

// --- Email Helper Functions ---

async function sendViewingBookedEmailToAgent(
  viewing: IViewing,
  agent: any,
  buyer: any
): Promise<void> {
  const property = viewing.propertyId as any;
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Viewing Booked</h1>
        <p>Hi ${agent.name},</p>
        <p>A viewing has been scheduled for your property.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${viewing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Buyer:</strong> ${buyer?.name || 'N/A'}</p>
          ${viewing.notes ? `<p><strong>Notes:</strong> ${viewing.notes}</p>` : ''}
        </div>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/viewings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View My Calendar</a>
        </p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: agent.email,
    subject: `New viewing scheduled - ${property.title || property.address}`,
    html,
  });
}

async function sendViewingBookedEmailToBuyer(
  viewing: IViewing,
  agent: any,
  buyer: any,
  property: any
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #16a34a;">Viewing Confirmed!</h1>
        <p>Hi ${buyer.name},</p>
        <p>Your property viewing has been confirmed.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Address:</strong> ${property.address}, ${property.city}</p>
          <p><strong>Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${viewing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Agent:</strong> ${agent?.name || 'N/A'}</p>
        </div>
        <p>We'll send you a reminder before your viewing.</p>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/viewings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View My Viewings</a>
        </p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: buyer.email,
    subject: `Viewing confirmed - ${property.title || property.address}`,
    html,
  });
}

async function sendViewingRescheduledEmail(
  viewing: IViewing,
  agent: any,
  buyer: any,
  property: any,
  oldStartTime: Date,
  rescheduledBy: 'agent' | 'buyer'
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
  const recipient = rescheduledBy === 'agent' ? buyer : agent;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Viewing Rescheduled</h1>
        <p>Hi ${recipient.name},</p>
        <p>A viewing has been rescheduled by the ${rescheduledBy}.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">New Schedule</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Old Date:</strong> <s>${oldStartTime.toLocaleDateString()} at ${oldStartTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</s></p>
          <p><strong>New Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>New Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${viewing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/viewings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Details</a>
        </p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: recipient.email,
    subject: `Viewing rescheduled - ${property.title || property.address}`,
    html,
  });
}

async function sendViewingCancelledEmail(
  viewing: IViewing,
  agent: any,
  buyer: any,
  property: any,
  cancelledBy: 'agent' | 'buyer'
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
  const recipient = cancelledBy === 'agent' ? buyer : agent;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">Viewing Cancelled</h1>
        <p>Hi ${recipient.name},</p>
        <p>A viewing has been cancelled by the ${cancelledBy}.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Cancelled Viewing</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          ${viewing.cancellationReason ? `<p><strong>Reason:</strong> ${viewing.cancellationReason}</p>` : ''}
        </div>
        ${cancelledBy === 'agent' ? `
        <p>You can book a new viewing for this property or explore other properties.</p>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/property/${property._id}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Property</a>
        </p>
        ` : ''}
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: recipient.email,
    subject: `Viewing cancelled - ${property.title || property.address}`,
    html,
  });
}

// --- Socket Helper ---

function emitViewingEvent(event: string, data: any): void {
  const io = getSocketInstance();
  if (io) {
    // Emit to both agent and buyer
    if (data.agentId) {
      io.emit(`viewing:${data.agentId}`, { event, data });
    }
    if (data.buyerId) {
      io.emit(`viewing:${data.buyerId}`, { event, data });
    }
    console.log(`📅 Emitted ${event} to users`);
  }
}

export default {
  getOrCreateSchedule,
  updateSchedule,
  addBlockedDate,
  removeBlockedDate,
  getAvailableSlots,
  bookViewing,
  rescheduleViewing,
  cancelViewing,
  completeViewing,
  addViewingFeedback,
  getUserViewings,
  getPropertyViewings,
  getAgentCalendar,
};
