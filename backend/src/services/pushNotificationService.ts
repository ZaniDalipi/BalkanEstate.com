/**
 * Push Notification Service
 *
 * Handles Web Push API integration using the VAPID protocol.
 * Manages push subscriptions and sends push notifications to users' devices.
 */

import webpush from 'web-push';
import PushSubscription, { IPushSubscription } from '../models/PushSubscription';
import { INotification, NotificationPriority } from '../models/Notification';
import { apiLogger } from '../utils/logger';

// ============================================================================
// VAPID Configuration
// ============================================================================

// Read VAPID_SUBJECT at module level (it has a safe default and never changes)
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@balkanestateai.com';

let isConfigured = false;

/**
 * Initialize web-push with VAPID credentials.
 * Called once at server startup, after dotenv has loaded env vars.
 */
export function initializePushService(): void {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

  if (!vapidPublicKey || !vapidPrivateKey) {
    apiLogger.warn('⚠️  Push notifications disabled: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY not set');
    return;
  }

  // Sanity-check key format: VAPID keys are base64url-encoded EC keys
  // Public key (uncompressed P-256): 65 bytes → ~87 base64url chars
  // Private key (P-256 scalar): 32 bytes → ~43 base64url chars
  const isValidBase64url = (s: string) => /^[A-Za-z0-9_-]+=*$/.test(s);
  if (!isValidBase64url(vapidPublicKey) || vapidPublicKey.length < 80) {
    apiLogger.error('❌ VAPID_PUBLIC_KEY format looks invalid — expected a base64url-encoded P-256 public key (~87 chars)');
    return;
  }
  if (!isValidBase64url(vapidPrivateKey) || vapidPrivateKey.length < 40) {
    apiLogger.error('❌ VAPID_PRIVATE_KEY format looks invalid — expected a base64url-encoded 32-byte scalar (~43 chars)');
    return;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
    apiLogger.info('✅ Push notification service initialized');
  } catch (error) {
    apiLogger.error('❌ Failed to initialize push notification service:', error);
  }
}

/**
 * Get the VAPID public key for client-side subscription.
 */
export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || '';
}

// ============================================================================
// Subscription Management
// ============================================================================

/**
 * Save or update a push subscription for a user.
 */
export async function saveSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<IPushSubscription> {
  // Upsert: update if endpoint exists, create if not
  const result = await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  apiLogger.info(`Push subscription saved for user ${userId}`);
  return result;
}

/**
 * Remove a push subscription by endpoint.
 */
export async function removeSubscription(userId: string, endpoint: string): Promise<boolean> {
  const result = await PushSubscription.deleteOne({ userId, endpoint });
  return result.deletedCount > 0;
}

/**
 * Remove all push subscriptions for a user.
 */
export async function removeAllSubscriptions(userId: string): Promise<number> {
  const result = await PushSubscription.deleteMany({ userId });
  return result.deletedCount;
}

/**
 * Get all push subscriptions for a user.
 */
export async function getUserSubscriptions(userId: string) {
  return PushSubscription.find({ userId }).lean();
}

/**
 * Check if a user has any active push subscriptions.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const count = await PushSubscription.countDocuments({ userId });
  return count > 0;
}

// ============================================================================
// Push Notification Sending
// ============================================================================

/** Map notification priority to TTL (time-to-live in seconds) */
function getTTLForPriority(priority: NotificationPriority): number {
  switch (priority) {
    case 'urgent': return 86400;  // 24 hours
    case 'high': return 43200;    // 12 hours
    case 'normal': return 14400;  // 4 hours
    case 'low': return 3600;      // 1 hour
    default: return 14400;
  }
}

/** Map notification priority to web push urgency */
function getUrgencyForPriority(priority: NotificationPriority): webpush.Urgency {
  switch (priority) {
    case 'urgent': return 'very-low'; // web-push urgency is inverted: very-low = highest battery priority
    case 'high': return 'high';
    case 'normal': return 'normal';
    case 'low': return 'low';
    default: return 'normal';
  }
}

/** Build the push payload from a notification document */
function buildPushPayload(notification: INotification): string {
  return JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: `${notification.type}-${notification._id}`,
    data: {
      notificationId: String(notification._id),
      type: notification.type,
      actionUrl: notification.data?.actionUrl || '/',
      propertyId: notification.data?.propertyId,
      conversationId: notification.data?.conversationId,
      agencyId: notification.data?.agencyId,
    },
    requireInteraction: notification.priority === 'urgent' || notification.priority === 'high',
  });
}

/**
 * Send push notification to all of a user's subscribed devices.
 * Automatically cleans up expired/invalid subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  notification: INotification
): Promise<{ sent: number; failed: number }> {
  if (!isConfigured) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await getUserSubscriptions(userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const payload = buildPushPayload(notification);
  const options: webpush.RequestOptions = {
    TTL: getTTLForPriority(notification.priority),
    urgency: getUrgencyForPriority(notification.priority),
  };

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          payload,
          options
        );
        sent++;
      } catch (error: any) {
        failed++;
        // 404 or 410 means the subscription is no longer valid
        if (error.statusCode === 404 || error.statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          apiLogger.error(`Push send failed for endpoint ${sub.endpoint.slice(0, 50)}...`, error.message);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: expiredEndpoints } });
    apiLogger.info(`Cleaned up ${expiredEndpoints.length} expired push subscriptions`);
  }

  return { sent, failed };
}

export default {
  initializePushService,
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  removeAllSubscriptions,
  getUserSubscriptions,
  hasActiveSubscription,
  sendPushToUser,
};
