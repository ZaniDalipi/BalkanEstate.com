import Viewing from '../models/Viewing';
import User from '../models/User';
import emailService from '../services/emailService';
import { getSocketInstance } from '../utils/socketInstance';

/**
 * Viewing Reminder Worker
 * Sends automatic reminders before scheduled viewings:
 * - 24 hours before: Reminder email to both parties
 * - 1 hour before: Final reminder email to both parties
 */

interface ViewingWithPopulated {
  _id: any;
  propertyId: {
    _id: string;
    title?: string;
    address: string;
    city: string;
    imageUrl?: string;
  };
  agentId: {
    _id: string;
    name: string;
    email: string;
  };
  buyerId: {
    _id: string;
    name: string;
    email: string;
  };
  startTime: Date;
  endTime: Date;
  notes?: string;
  meetingLocation?: string;
}

/**
 * Send 24-hour reminder emails
 */
async function send24HourReminders(): Promise<number> {
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  // Find viewings starting in approximately 24 hours that haven't received 24h reminder
  const viewings = await Viewing.find({
    startTime: { $gte: twentyThreeHoursFromNow, $lte: twentyFourHoursFromNow },
    status: { $in: ['scheduled', 'rescheduled'] },
    reminder24hSent: false,
  })
    .populate('propertyId', 'title address city imageUrl')
    .populate('agentId', 'name email')
    .populate('buyerId', 'name email');

  let sentCount = 0;

  for (const viewing of viewings) {
    try {
      const v = viewing as unknown as ViewingWithPopulated;
      await send24HourReminderEmail(v);

      viewing.reminder24hSent = true;
      viewing.reminder24hSentAt = new Date();
      await viewing.save();

      // Emit socket notification
      emitReminderNotification(v, '24h');

      sentCount++;
      console.log(`📧 24h reminder sent for viewing ${viewing._id}`);
    } catch (error) {
      console.error(`❌ Failed to send 24h reminder for viewing ${viewing._id}:`, error);
    }
  }

  return sentCount;
}

/**
 * Send 1-hour reminder emails
 */
async function send1HourReminders(): Promise<number> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const fiftyMinutesFromNow = new Date(now.getTime() + 50 * 60 * 1000);

  // Find viewings starting in approximately 1 hour that haven't received 1h reminder
  const viewings = await Viewing.find({
    startTime: { $gte: fiftyMinutesFromNow, $lte: oneHourFromNow },
    status: { $in: ['scheduled', 'rescheduled'] },
    reminder1hSent: false,
  })
    .populate('propertyId', 'title address city imageUrl')
    .populate('agentId', 'name email')
    .populate('buyerId', 'name email');

  let sentCount = 0;

  for (const viewing of viewings) {
    try {
      const v = viewing as unknown as ViewingWithPopulated;
      await send1HourReminderEmail(v);

      viewing.reminder1hSent = true;
      viewing.reminder1hSentAt = new Date();
      await viewing.save();

      // Emit socket notification
      emitReminderNotification(v, '1h');

      sentCount++;
      console.log(`📧 1h reminder sent for viewing ${viewing._id}`);
    } catch (error) {
      console.error(`❌ Failed to send 1h reminder for viewing ${viewing._id}:`, error);
    }
  }

  return sentCount;
}

/**
 * Send 24-hour reminder email to both agent and buyer
 */
async function send24HourReminderEmail(viewing: ViewingWithPopulated): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
  const property = viewing.propertyId;
  const agent = viewing.agentId;
  const buyer = viewing.buyerId;

  // Email to buyer
  const buyerHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Viewing Reminder - Tomorrow</h1>
        <p>Hi ${buyer.name},</p>
        <p>This is a reminder that you have a property viewing scheduled for <strong>tomorrow</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Address:</strong> ${property.address}, ${property.city}</p>
          <p><strong>Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${viewing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Agent:</strong> ${agent.name}</p>
          ${viewing.meetingLocation ? `<p><strong>Meeting Point:</strong> ${viewing.meetingLocation}</p>` : ''}
        </div>
        <p>If you need to reschedule or cancel, please do so as soon as possible.</p>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/viewings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Details</a>
        </p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: buyer.email,
    subject: `Reminder: Viewing tomorrow - ${property.title || property.address}`,
    html: buyerHtml,
  });

  // Email to agent
  const agentHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Viewing Reminder - Tomorrow</h1>
        <p>Hi ${agent.name},</p>
        <p>This is a reminder that you have a property viewing scheduled for <strong>tomorrow</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Date:</strong> ${viewing.startTime.toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${viewing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Buyer:</strong> ${buyer.name}</p>
          ${viewing.notes ? `<p><strong>Buyer Notes:</strong> ${viewing.notes}</p>` : ''}
        </div>
        <p style="margin-top: 20px;">
          <a href="${frontendUrl}/viewings" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">View Calendar</a>
        </p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: agent.email,
    subject: `Reminder: Viewing tomorrow - ${property.title || property.address}`,
    html: agentHtml,
  });
}

/**
 * Send 1-hour reminder email to both agent and buyer
 */
async function send1HourReminderEmail(viewing: ViewingWithPopulated): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'https://balkanestate.com';
  const property = viewing.propertyId;
  const agent = viewing.agentId;
  const buyer = viewing.buyerId;

  // Email to buyer
  const buyerHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Final Reminder - Viewing in 1 Hour</h1>
        <p>Hi ${buyer.name},</p>
        <p>Your property viewing is starting in <strong>1 hour</strong>!</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Address:</strong> ${property.address}, ${property.city}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Agent:</strong> ${agent.name}</p>
          ${viewing.meetingLocation ? `<p><strong>Meeting Point:</strong> ${viewing.meetingLocation}</p>` : ''}
        </div>
        <p>Please make sure you arrive on time. Safe travels!</p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: buyer.email,
    subject: `Starting Soon: Viewing in 1 hour - ${property.title || property.address}`,
    html: buyerHtml,
  });

  // Email to agent
  const agentHtml = `
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">Final Reminder - Viewing in 1 Hour</h1>
        <p>Hi ${agent.name},</p>
        <p>You have a property viewing starting in <strong>1 hour</strong>!</p>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Viewing Details</h3>
          <p><strong>Property:</strong> ${property.title || property.address}</p>
          <p><strong>Time:</strong> ${viewing.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Buyer:</strong> ${buyer.name}</p>
          ${viewing.notes ? `<p><strong>Buyer Notes:</strong> ${viewing.notes}</p>` : ''}
        </div>
        <p>Please ensure the property is ready for the viewing.</p>
      </body>
    </html>
  `;

  await emailService.sendEmail({
    to: agent.email,
    subject: `Starting Soon: Viewing in 1 hour - ${property.title || property.address}`,
    html: agentHtml,
  });
}

/**
 * Emit socket notification for viewing reminder
 */
function emitReminderNotification(viewing: ViewingWithPopulated, type: '24h' | '1h'): void {
  const io = getSocketInstance();
  if (!io) return;

  const notification = {
    type: `viewing:reminder:${type}`,
    viewing: {
      _id: viewing._id.toString(),
      propertyId: viewing.propertyId._id,
      propertyTitle: viewing.propertyId.title || viewing.propertyId.address,
      startTime: viewing.startTime,
      endTime: viewing.endTime,
    },
  };

  // Emit to agent
  io.emit(`viewing:${viewing.agentId._id}`, notification);

  // Emit to buyer
  io.emit(`viewing:${viewing.buyerId._id}`, notification);
}

/**
 * Run all reminder checks
 */
export async function runReminderChecks(): Promise<void> {
  try {
    console.log('🔔 Running viewing reminder checks...');

    const [sent24h, sent1h] = await Promise.all([
      send24HourReminders(),
      send1HourReminders(),
    ]);

    console.log(`✅ Reminder checks complete: ${sent24h} 24h reminders, ${sent1h} 1h reminders sent`);
  } catch (error) {
    console.error('❌ Error running reminder checks:', error);
  }
}

/**
 * Schedule the viewing reminder worker
 * Runs every 10 minutes to check for viewings needing reminders
 */
export function startViewingReminderWorker(): void {
  // Run every 10 minutes
  const TEN_MINUTES = 10 * 60 * 1000;

  // Run immediately on startup
  runReminderChecks();

  // Then run every 10 minutes
  setInterval(() => {
    runReminderChecks();
  }, TEN_MINUTES);

  console.log('✅ Viewing reminder worker started (every 10 minutes)');
}

export default {
  runReminderChecks,
  startViewingReminderWorker,
};
