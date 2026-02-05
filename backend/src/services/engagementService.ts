/**
 * Engagement Service
 *
 * Handles view milestones and engagement notifications for property listings.
 * Sends fun, encouraging messages when listings reach view thresholds.
 */

import mongoose from 'mongoose';
import Notification, { NotificationType, NotificationPriority } from '../models/Notification';
import Property from '../models/Property';
import User from '../models/User';
import emailService from './emailService';
import { apiLogger } from '../utils/logger';

// ============================================================================
// Configuration & Thresholds
// ============================================================================

/**
 * View milestones for promoted listings (higher thresholds)
 * These users are paying, so celebrate their success!
 */
const PROMOTED_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * View milestones for non-promoted listings (50% of promoted thresholds)
 * Encourage them to promote for even more views!
 */
const NON_PROMOTED_MILESTONES = [25, 50, 100, 250, 500, 1000, 2500, 5000];

/**
 * Minimum time between milestone notifications (in hours)
 * Prevents spamming the user
 */
const NOTIFICATION_COOLDOWN_HOURS = 24;

// ============================================================================
// Fun Message Templates
// ============================================================================

interface MessageTemplate {
  title: string;
  message: string;
  icon: string;
}

/**
 * Fun messages for promoted listings reaching milestones
 */
const PROMOTED_MESSAGES: Record<number, MessageTemplate[]> = {
  50: [
    { title: "You're on fire! 🔥", message: "Your promoted listing just hit 50 views! The promotion is already paying off!", icon: "fire" },
    { title: "Fifty and fabulous! ✨", message: "50 potential buyers have seen your listing! Keep that momentum going!", icon: "sparkles" },
  ],
  100: [
    { title: "Triple digits! 🎉", message: "100 views and counting! Your listing is stealing the spotlight!", icon: "trophy" },
    { title: "Century club! 💯", message: "Welcome to the 100 club! Your promoted listing is a crowd favorite!", icon: "star" },
  ],
  250: [
    { title: "Quarter thousand! 🚀", message: "250 views! Your listing is basically famous now. Time to practice your autograph!", icon: "rocket" },
    { title: "Views are pouring in! 🌊", message: "250 people can't be wrong! Your listing is making waves!", icon: "chart" },
  ],
  500: [
    { title: "Half a thousand! 🏆", message: "500 views! Your listing is officially a local celebrity!", icon: "trophy" },
    { title: "Unstoppable! 💪", message: "500 eyes on your property! At this rate, you'll need a velvet rope!", icon: "fire" },
  ],
  1000: [
    { title: "LEGENDARY! 🎊", message: "1,000 VIEWS! Your listing has achieved legendary status! Expect calls!", icon: "crown" },
    { title: "The thousand club! 👑", message: "1K views! You're officially in the big leagues. Pop the champagne!", icon: "sparkles" },
  ],
  2500: [
    { title: "Viral vibes! 🌟", message: "2,500 views! Your listing is the talk of the town (literally)!", icon: "star" },
  ],
  5000: [
    { title: "SUPERSTAR! ⭐", message: "5,000 views! Your listing should have its own fan club by now!", icon: "crown" },
  ],
  10000: [
    { title: "ICON STATUS! 🏅", message: "10,000 VIEWS! Your listing is a phenomenon! Real estate royalty!", icon: "trophy" },
  ],
};

/**
 * Fun messages for non-promoted listings (encourage promotion)
 */
const NON_PROMOTED_MESSAGES: Record<number, MessageTemplate[]> = {
  25: [
    { title: "Getting noticed! 👀", message: "25 views already! Imagine 5x more with promotion! Your listing has potential!", icon: "eye" },
    { title: "Heads are turning! 🔄", message: "25 people checked out your listing! Promote it to reach 125+ views!", icon: "trending" },
  ],
  50: [
    { title: "Halfway to triple digits! 📈", message: "50 views without promotion! Promote now and watch it explode to 250+!", icon: "chart" },
    { title: "Organic superstar! 🌱", message: "50 views purely organically! Promoted listings get 5x more. Just saying... 😉", icon: "sparkles" },
  ],
  100: [
    { title: "Natural talent! 🎯", message: "100 views with no promotion! You're leaving views on the table. Promote for 500+!", icon: "target" },
    { title: "Hidden gem alert! 💎", message: "100 people found your hidden gem! Promote it and let 500+ discover it!", icon: "gem" },
  ],
  250: [
    { title: "Seriously impressive! 🏅", message: "250 organic views! Imagine 1,250+ with promotion. Your listing deserves the spotlight!", icon: "medal" },
  ],
  500: [
    { title: "You're doing this on hard mode! 💪", message: "500 views without help! Promote and hit 2,500+. You've earned it!", icon: "muscle" },
  ],
  1000: [
    { title: "Organic legend! 🌟", message: "1,000 views unpromoted?! You're a natural! Promote and go viral with 5,000+!", icon: "star" },
  ],
  2500: [
    { title: "Unstoppable force! 🚀", message: "2,500 organic views! With promotion, you could hit 10,000+. World domination awaits!", icon: "rocket" },
  ],
  5000: [
    { title: "Mythical status! 🦄", message: "5,000 views without promotion?! You're a unicorn! Imagine the possibilities with a boost!", icon: "unicorn" },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a random message template for a milestone
 */
function getRandomMessage(messages: MessageTemplate[]): MessageTemplate {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

/**
 * Find the milestone that was just crossed
 */
function findCrossedMilestone(currentViews: number, milestones: number[]): number | null {
  // Sort milestones in descending order and find the highest crossed one
  const sortedMilestones = [...milestones].sort((a, b) => b - a);

  for (const milestone of sortedMilestones) {
    if (currentViews >= milestone && currentViews < milestone + 10) {
      // Just crossed this milestone (within 10 views of it)
      return milestone;
    }
  }

  return null;
}

/**
 * Check if user has received a notification for this milestone recently
 */
async function hasRecentMilestoneNotification(
  userId: mongoose.Types.ObjectId,
  propertyId: string,
  milestone: number
): Promise<boolean> {
  const cooldownTime = new Date(Date.now() - NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000);

  const existingNotification = await Notification.findOne({
    userId,
    type: { $in: ['listing_milestone', 'promotion_suggestion', 'promotion_success'] },
    'data.propertyId': propertyId,
    'data.milestone': milestone,
    createdAt: { $gte: cooldownTime },
  });

  return !!existingNotification;
}

// ============================================================================
// Main Service Functions
// ============================================================================

export interface MilestoneCheckResult {
  notificationSent: boolean;
  milestone?: number;
  isPromoted: boolean;
  notification?: any;
}

/**
 * Check if a property has crossed a view milestone and send notification
 */
export async function checkViewMilestone(
  propertyId: string,
  currentViews: number,
  isPromoted: boolean
): Promise<MilestoneCheckResult> {
  try {
    // Get the property details
    const property = await Property.findById(propertyId).select('title sellerId');
    if (!property || !property.sellerId) {
      return { notificationSent: false, isPromoted };
    }

    // Get the user
    const user = await User.findById(property.sellerId).select('email name notificationPreferences');
    if (!user) {
      return { notificationSent: false, isPromoted };
    }

    // Determine which milestones to check
    const milestones = isPromoted ? PROMOTED_MILESTONES : NON_PROMOTED_MILESTONES;
    const milestone = findCrossedMilestone(currentViews, milestones);

    if (!milestone) {
      return { notificationSent: false, isPromoted };
    }

    // Check if we've already sent a notification for this milestone
    const hasRecent = await hasRecentMilestoneNotification(
      property.sellerId as mongoose.Types.ObjectId,
      propertyId,
      milestone
    );

    if (hasRecent) {
      return { notificationSent: false, isPromoted, milestone };
    }

    // Get the appropriate message template
    const messageTemplates = isPromoted
      ? PROMOTED_MESSAGES[milestone]
      : NON_PROMOTED_MESSAGES[milestone];

    if (!messageTemplates || messageTemplates.length === 0) {
      return { notificationSent: false, isPromoted, milestone };
    }

    const template = getRandomMessage(messageTemplates);
    const notificationType: NotificationType = isPromoted ? 'promotion_success' : 'promotion_suggestion';
    const priority: NotificationPriority = milestone >= 500 ? 'high' : 'normal';

    // Create the notification
    const notification = await Notification.create({
      userId: property.sellerId,
      type: notificationType,
      title: template.title,
      message: template.message,
      icon: template.icon,
      priority,
      data: {
        propertyId,
        propertyTitle: property.title || 'Your listing',
        viewCount: currentViews,
        milestone,
        actionUrl: `/property/${propertyId}`,
        actionLabel: isPromoted ? 'View Stats' : 'Promote Now',
      },
    });

    // Send email notification (if user has email notifications enabled)
    await sendMilestoneEmail(user, property, template, currentViews, milestone, isPromoted);

    apiLogger.info(`🎉 Milestone notification sent: ${milestone} views for property ${propertyId}`);

    return {
      notificationSent: true,
      milestone,
      isPromoted,
      notification,
    };
  } catch (error) {
    apiLogger.error('Error checking view milestone:', error);
    return { notificationSent: false, isPromoted };
  }
}

/**
 * Send milestone email notification
 */
async function sendMilestoneEmail(
  user: any,
  property: any,
  template: MessageTemplate,
  viewCount: number,
  milestone: number,
  isPromoted: boolean
): Promise<void> {
  try {
    const propertyTitle = property.title || 'Your listing';
    const userName = user.name || 'there';

    const ctaButton = isPromoted
      ? `<a href="${process.env.APP_URL || 'https://balkanestate.com'}/analytics" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">View Your Stats</a>`
      : `<a href="${process.env.APP_URL || 'https://balkanestate.com'}/property/${property._id}" style="display: inline-block; background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px;">Promote Now - Get 5x More Views!</a>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${isPromoted ? '#8B5CF6, #6366F1' : '#F59E0B, #EF4444'}); padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${template.title}</h1>
        </div>

        <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="font-size: 18px; margin-bottom: 8px;">Hey ${userName}! 👋</p>

          <p style="font-size: 16px; color: #4b5563;">${template.message}</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your listing</p>
            <p style="margin: 8px 0; font-size: 18px; font-weight: bold; color: #1f2937;">"${propertyTitle}"</p>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: ${isPromoted ? '#8B5CF6' : '#F59E0B'};">${viewCount.toLocaleString()} views</p>
          </div>

          ${!isPromoted ? `
          <div style="background: linear-gradient(135deg, #FEF3C7, #FDE68A); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400E; font-size: 14px;">
              <strong>💡 Pro tip:</strong> Promoted listings get an average of 5x more views!
              Your listing is already popular - imagine what it could do with a boost!
            </p>
          </div>
          ` : ''}

          <div style="text-align: center;">
            ${ctaButton}
          </div>

          <p style="margin-top: 32px; font-size: 14px; color: #9ca3af; text-align: center;">
            Keep up the great work! 🏠✨
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>BalkanEstate.com - Find Your Dream Home in the Balkans</p>
          <p>You're receiving this because your listing reached ${milestone} views.</p>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: user.email,
      subject: `${template.title} - "${propertyTitle}" hit ${milestone} views!`,
      html,
      text: `${template.message} Your listing "${propertyTitle}" has reached ${viewCount} views!`,
    });

    // Update notification as email sent
    await Notification.updateOne(
      { userId: user._id, 'data.propertyId': property._id, 'data.milestone': milestone },
      { emailSent: true, emailSentAt: new Date() }
    );
  } catch (error) {
    apiLogger.error('Error sending milestone email:', error);
    // Don't throw - email failure shouldn't break the notification
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string, limit: number = 20): Promise<any[]> {
  return Notification.find({ userId, isRead: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(
  userId: string,
  options: { limit?: number; offset?: number; type?: NotificationType } = {}
): Promise<{ notifications: any[]; total: number }> {
  const { limit = 20, offset = 0, type } = options;

  const query: any = { userId };
  if (type) query.type = type;

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
  ]);

  return { notifications, total };
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  const result = await Notification.updateOne(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, isRead: false });
}

export default {
  checkViewMilestone,
  getUnreadNotifications,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
