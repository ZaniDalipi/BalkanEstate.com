import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { cronLogger } from '../utils/logger';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PromotionCoupon from '../models/PromotionCoupon';
import emailService from '../services/emailService';
import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';
import { runWeeklyStatsJobs } from '../jobs/weeklyStatsJob';
import { processNewListingAlerts, processPriceDropAlerts } from '../jobs/propertyAlertsJob';
import { sendHotHourRecommendations, cleanupOldPatterns } from '../services/proBuyerEmailService';
import { processMonthlyCouponRefresh } from '../services/monthlyCouponService';
import { processExpiredRentals } from '../jobs/rentalAvailabilityJob';

// Helper to check if MongoDB is connected before running a job
const isMongoConnected = (): boolean => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

// Wrapper to run cron jobs only when DB is connected
const withDbConnection = async (jobName: string, job: () => Promise<void>): Promise<void> => {
  if (!isMongoConnected()) {
    cronLogger.info(`⏭️ Skipping ${jobName} - MongoDB not connected`);
    return;
  }
  await job();
};

let checkExpiringTask: cron.ScheduledTask | null = null;
let monthlyCouponTask: cron.ScheduledTask | null = null;
let updateExpiredTask: cron.ScheduledTask | null = null;
let userSubscriptionTask: cron.ScheduledTask | null = null;
let subscriptionReminderTask: cron.ScheduledTask | null = null;
let weeklyStatsTask: cron.ScheduledTask | null = null;
let instantAlertsTask: cron.ScheduledTask | null = null;
let dailyAlertsTask: cron.ScheduledTask | null = null;
let weeklyAlertsTask: cron.ScheduledTask | null = null;
let priceDropAlertsTask: cron.ScheduledTask | null = null;
let proBuyerHotHoursTask: cron.ScheduledTask | null = null;
let activityCleanupTask: cron.ScheduledTask | null = null;
let rentalAvailabilityTask: cron.ScheduledTask | null = null;

export const startCronJobs = () => {
  // Check for subscriptions expiring in 1 day - runs daily at 10 AM
  checkExpiringTask = cron.schedule('0 10 * * *', async () => {
    await withDbConnection('expiring subscriptions check', async () => {
      try {
        cronLogger.info('🔍 Checking expiring subscriptions...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiring = await AgencyFeaturedSubscription.find({
          status: { $in: ['active', 'trial'] },
          currentPeriodEnd: { $gte: today, $lte: tomorrow },
        });

        for (const sub of expiring) {
          const agency = await Agency.findById(sub.agencyId);
          const user = await User.findById(sub.userId);
          if (!agency || !user?.email) continue;

          const couponCode = 'RENEW20-' + agency.slug.toUpperCase().substring(0, 10) + '-' + Date.now().toString().substring(8);
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 7);

          await new PromotionCoupon({
            code: couponCode,
            description: '20% renewal discount for ' + agency.name,
            discountType: 'percentage',
            discountValue: 20,
            validFrom: new Date(),
            validUntil: expiryDate,
            status: 'active',
            maxUsesPerUser: 1,
            maxTotalUses: 1,
            applicableTiers: ['featured'],
            isPublic: false,
          }).save();

          await emailService.sendExpiryReminder(user.email, agency.name, sub.currentPeriodEnd, couponCode, 20);
          cronLogger.info('✅ Sent reminder to', agency.name);
        }
      } catch (error) {
        cronLogger.error('Expiry cron error:', error);
      }
    });
  });

  // Update expired subscriptions - runs hourly
  updateExpiredTask = cron.schedule('0 * * * *', async () => {
    await withDbConnection('expired subscriptions update', async () => {
      try {
        const now = new Date();
        const expired = await AgencyFeaturedSubscription.find({
          status: { $in: ['active', 'trial'] },
          currentPeriodEnd: { $lt: now },
        });

        for (const sub of expired) {
          sub.status = 'expired';
          await sub.save();

          const agency = await Agency.findById(sub.agencyId);
          if (agency?.isFeatured) {
            agency.isFeatured = false;
            agency.featuredEndDate = now;
            await agency.save();
          }
        }
        cronLogger.info('✅ Updated', expired.length, 'expired subscriptions');
      } catch (error) {
        cronLogger.error('Expiry update cron error:', error);
      }
    });
  });

  // Update expired user subscriptions - runs every 6 hours
  userSubscriptionTask = cron.schedule('0 */6 * * *', async () => {
    await withDbConnection('user subscription expiry', async () => {
      try {
        cronLogger.info('🔄 Checking and updating expired user subscriptions...');
        const count = await updateExpiredSubscriptions();
        cronLogger.info(`✅ Processed ${count} expired user subscriptions`);
      } catch (error) {
        cronLogger.error('User subscription expiry cron error:', error);
      }
    });
  });

  // Send subscription renewal reminders - runs daily at 9 AM
  // Sends reminders 7 days before expiration/renewal for both auto-renewing and non-auto-renewing
  subscriptionReminderTask = cron.schedule('0 9 * * *', async () => {
    try {
      cronLogger.info('📧 Sending subscription renewal reminders...');

      // Calculate date ranges
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 7 days from now (for auto-renewing subscriptions - renewal notice)
      const sevenDaysStart = new Date();
      sevenDaysStart.setDate(sevenDaysStart.getDate() + 7);
      sevenDaysStart.setHours(0, 0, 0, 0);

      const sevenDaysEnd = new Date(sevenDaysStart);
      sevenDaysEnd.setHours(23, 59, 59, 999);

      // 3 days from now (for non-auto-renewing - expiry warning)
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      let remindersSent = 0;

      // 1. Send "your subscription will renew" reminders for auto-renewing subscriptions (7 days before)
      const autoRenewingSubscriptions = await Subscription.find({
        status: 'active',
        autoRenewing: true,
        expirationDate: { $gte: sevenDaysStart, $lte: sevenDaysEnd },
        renewalReminderSent: { $ne: true }, // Don't send duplicate reminders
      }).populate('userId', 'name email');

      for (const sub of autoRenewingSubscriptions) {
        const user = sub.userId as any;
        if (!user?.email) continue;

        try {
          await emailService.sendAutoRenewalReminder(
            user.email,
            user.name || 'Customer',
            sub.expirationDate,
            sub.productId || 'subscription'
          );
          // Mark reminder as sent
          sub.renewalReminderSent = true;
          await sub.save();
          remindersSent++;
        } catch (emailError) {
          cronLogger.error(`Failed to send auto-renewal reminder to ${user.email}:`, emailError);
        }
      }

      // 2. Send "your subscription is expiring" reminders for non-auto-renewing subscriptions (3 days before)
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        autoRenewing: false,
        expirationDate: { $gte: today, $lte: threeDaysFromNow },
        expiryReminderSent: { $ne: true }, // Don't send duplicate reminders
      }).populate('userId', 'name email');

      for (const sub of expiringSubscriptions) {
        const user = sub.userId as any;
        if (!user?.email) continue;

        try {
          await emailService.sendSubscriptionRenewalReminder(
            user.email,
            user.name || 'Customer',
            sub.expirationDate,
            sub.productId || 'subscription'
          );
          // Mark reminder as sent
          sub.expiryReminderSent = true;
          await sub.save();
          remindersSent++;
        } catch (emailError) {
          cronLogger.error(`Failed to send expiry reminder to ${user.email}:`, emailError);
        }
      }

      cronLogger.info(`✅ Sent ${remindersSent} subscription reminders (auto-renewal: ${autoRenewingSubscriptions.length}, expiring: ${expiringSubscriptions.length})`);
    } catch (error) {
      cronLogger.error('Subscription reminder cron error:', error);
    }
  });

  // Send weekly statistics to Pro members and agencies - runs every Monday at 9 AM UTC
  weeklyStatsTask = cron.schedule('0 9 * * 1', async () => {
    try {
      cronLogger.info('📊 Starting weekly statistics email job...');
      await runWeeklyStatsJobs();
      cronLogger.info('✅ Weekly statistics emails sent');
    } catch (error) {
      cronLogger.error('Weekly stats cron error:', error);
    }
  });

  // ===============================
  // PROPERTY ALERTS
  // ===============================

  // Instant alerts - runs every 15 minutes
  instantAlertsTask = cron.schedule('*/15 * * * *', async () => {
    try {
      await processNewListingAlerts('instant');
    } catch (error) {
      cronLogger.error('Instant alerts cron error:', error);
    }
  });

  // Daily digest alerts - runs daily at 8 AM UTC
  dailyAlertsTask = cron.schedule('0 8 * * *', async () => {
    try {
      cronLogger.info('📬 Processing daily property alerts...');
      await processNewListingAlerts('daily');
      cronLogger.info('✅ Daily alerts sent');
    } catch (error) {
      cronLogger.error('Daily alerts cron error:', error);
    }
  });

  // Weekly digest alerts - runs every Sunday at 8 AM UTC
  weeklyAlertsTask = cron.schedule('0 8 * * 0', async () => {
    try {
      cronLogger.info('📬 Processing weekly property alerts...');
      await processNewListingAlerts('weekly');
      cronLogger.info('✅ Weekly alerts sent');
    } catch (error) {
      cronLogger.error('Weekly alerts cron error:', error);
    }
  });

  // Price drop alerts - runs every hour
  priceDropAlertsTask = cron.schedule('30 * * * *', async () => {
    try {
      await processPriceDropAlerts();
    } catch (error) {
      cronLogger.error('Price drop alerts cron error:', error);
    }
  });

  // ===============================
  // PRO BUYER EMAILS
  // ===============================

  // Pro buyer hot hours recommendations - runs every hour
  // Sends personalized property recommendations during user's most active hours
  proBuyerHotHoursTask = cron.schedule('0 * * * *', async () => {
    try {
      cronLogger.info('🔥 Processing pro buyer hot hour recommendations...');
      const stats = await sendHotHourRecommendations();
      cronLogger.info(`✅ Hot hour emails: ${stats.sent} sent, ${stats.skipped} skipped, ${stats.errors} errors`);
    } catch (error) {
      cronLogger.error('Pro buyer hot hours cron error:', error);
    }
  });

  // Cleanup old activity patterns - runs daily at midnight
  activityCleanupTask = cron.schedule('0 0 * * *', async () => {
    try {
      cronLogger.info('🧹 Cleaning up old activity patterns...');
      cleanupOldPatterns();
      cronLogger.info('✅ Activity patterns cleanup complete');
    } catch (error) {
      cronLogger.error('Activity cleanup cron error:', error);
    }
  });

  // ===============================
  // RENTAL AVAILABILITY AUTOMATION
  // ===============================

  // Auto-transition expired rentals back to active - runs every hour
  // When a property's rentedUntil date has passed, it is automatically
  // moved from 'rented' to 'active' status with availableFrom set to the day after rentedUntil
  rentalAvailabilityTask = cron.schedule('0 * * * *', async () => {
    await withDbConnection('rental availability check', async () => {
      try {
        cronLogger.info('🏠 Checking for expired rental periods...');
        const result = await processExpiredRentals();
        cronLogger.info(`✅ Rental availability check: ${result.transitioned} transitioned, ${result.errors} errors`);
      } catch (error) {
        cronLogger.error('Rental availability cron error:', error);
      }
    });
  });

  // ===============================
  // MONTHLY COUPON REFRESH
  // ===============================

  // Monthly promotion coupon refresh - runs on the 1st of every month at 9:00 AM UTC
  // Refreshes promotion coupons for all Pro and Enterprise users and sends email notifications
  monthlyCouponTask = cron.schedule('0 9 1 * *', async () => {
    try {
      cronLogger.info('🎟️ Starting monthly promotion coupon refresh...');
      const result = await processMonthlyCouponRefresh();
      cronLogger.info(`✅ Monthly coupon refresh completed:`);
      cronLogger.info(`   - Pro users refreshed: ${result.usersRefreshed}`);
      cronLogger.info(`   - Agencies refreshed: ${result.agenciesRefreshed}`);
      cronLogger.info(`   - Emails sent: ${result.emailsSent}`);
      if (result.errors.length > 0) {
        cronLogger.warn(`⚠️ ${result.errors.length} errors occurred during refresh`);
      }
    } catch (error) {
      cronLogger.error('Monthly coupon cron error:', error);
    }
  });

  cronLogger.info('🕐 All cron jobs started (subscription checks, weekly stats, property alerts, pro buyer emails, rental availability, monthly coupons)');
};

export const stopCronJobs = () => {
  if (checkExpiringTask) checkExpiringTask.stop();
  if (updateExpiredTask) updateExpiredTask.stop();
  if (userSubscriptionTask) userSubscriptionTask.stop();
  if (subscriptionReminderTask) subscriptionReminderTask.stop();
  if (weeklyStatsTask) weeklyStatsTask.stop();
  if (instantAlertsTask) instantAlertsTask.stop();
  if (dailyAlertsTask) dailyAlertsTask.stop();
  if (weeklyAlertsTask) weeklyAlertsTask.stop();
  if (priceDropAlertsTask) priceDropAlertsTask.stop();
  if (proBuyerHotHoursTask) proBuyerHotHoursTask.stop();
  if (activityCleanupTask) activityCleanupTask.stop();
  if (monthlyCouponTask) monthlyCouponTask.stop();
  if (rentalAvailabilityTask) rentalAvailabilityTask.stop();
  cronLogger.info('🛑 All cron jobs stopped');
};
