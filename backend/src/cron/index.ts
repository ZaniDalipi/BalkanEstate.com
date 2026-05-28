import * as cron from 'node-cron';
import mongoose from 'mongoose';
import { cronLogger } from '../utils/logger';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PromotionCoupon from '../models/PromotionCoupon';
import SubscriptionEvent from '../models/SubscriptionEvent';
import emailService from '../services/emailService';
import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';
import { runWeeklyStatsJobs } from '../jobs/weeklyStatsJob';
import { processNewListingAlerts, processPriceDropAlerts } from '../jobs/propertyAlertsJob';
import { sendHotHourRecommendations, cleanupOldPatterns } from '../services/proBuyerEmailService';
import { processMonthlyCouponRefresh } from '../services/monthlyCouponService';
import { fetchAndStoreNews, cleanupOldNews } from '../services/newsService';
import { startPropertyStatsJob, stopPropertyStatsJob } from '../jobs/computePropertyStatsJob';
import { processExpiredRentals } from '../jobs/rentalExpiryJob';
import { processListingIngest, processDeferredListingReplay } from '../jobs/listingIngestJob';
import { runScoreFullRefresh } from '../jobs/scoreBackfillJob';

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
let agencySubscriptionExpiryTask: cron.ScheduledTask | null = null;
let subscriptionReminderTask: cron.ScheduledTask | null = null;
let weeklyStatsTask: cron.ScheduledTask | null = null;
let instantAlertsTask: cron.ScheduledTask | null = null;
let dailyAlertsTask: cron.ScheduledTask | null = null;
let weeklyAlertsTask: cron.ScheduledTask | null = null;
let priceDropAlertsTask: cron.ScheduledTask | null = null;
let proBuyerHotHoursTask: cron.ScheduledTask | null = null;
let activityCleanupTask: cron.ScheduledTask | null = null;
let newsFetchTask: cron.ScheduledTask | null = null;
let newsCleanupTask: cron.ScheduledTask | null = null;
let rentalExpiryTask: cron.ScheduledTask | null = null;
let listingIngestTask: cron.ScheduledTask | null = null;
let deferredReplayTask: cron.ScheduledTask | null = null;
let scoreRefreshTask: cron.ScheduledTask | null = null;

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

  // Auto-expire agency subscriptions - runs every 6 hours (offset by 3 hours from user subscription check)
  agencySubscriptionExpiryTask = cron.schedule('0 3,9,15,21 * * *', async () => {
    await withDbConnection('agency subscription expiry', async () => {
      try {
        cronLogger.info('🏢 Checking and updating expired agency subscriptions...');
        const now = new Date();

        const expiredAgencies = await Agency.find({
          'subscription.status': { $in: ['active', 'trial'] },
          'subscription.expiresAt': { $lt: now },
        });

        let processed = 0;
        for (const agency of expiredAgencies) {
          agency.subscription.status = 'expired';
          agency.markModified('subscription');
          await agency.save();

          // Update owner user record
          const owner = await User.findById(agency.ownerId);
          if (owner) {
            owner.isSubscribed = false;
            owner.subscriptionStatus = 'expired';
            await owner.save();
          }

          // Audit trail
          try {
            await SubscriptionEvent.create({
              subscriptionId: agency._id,
              userId: agency.ownerId,
              eventType: 'subscription_expired',
              store: 'web',
              previousStatus: 'active',
              newStatus: 'expired',
              metadata: {
                agencyId: String(agency._id),
                agencyName: agency.name,
                expiredAt: now,
                autoExpired: true,
              },
            });
          } catch (eventErr) {
            cronLogger.error(`Failed to create event for agency ${agency._id}:`, eventErr);
          }

          processed++;
        }

        if (processed > 0) {
          cronLogger.info(`✅ Auto-expired ${processed} agency subscriptions`);
        }
      } catch (error) {
        cronLogger.error('Agency subscription expiry cron error:', error);
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

  // Fetch real estate news every 4 hours (at minute 20)
  newsFetchTask = cron.schedule('20 */4 * * *', async () => {
    await withDbConnection('news fetch', async () => {
      try {
        const count = await fetchAndStoreNews();
        cronLogger.info(`📰 News fetch cron completed: ${count} new articles`);
      } catch (error) {
        cronLogger.error('News fetch cron error:', error);
      }
    });
  });

  // Cleanup old news articles daily at 3 AM (older than 3 months)
  newsCleanupTask = cron.schedule('0 3 * * *', async () => {
    await withDbConnection('news cleanup', async () => {
      try {
        const count = await cleanupOldNews(3);
        cronLogger.info(`🗑️ News cleanup cron completed: ${count} old articles removed`);
      } catch (error) {
        cronLogger.error('News cleanup cron error:', error);
      }
    });
  });

  // ===============================
  // RENTAL EXPIRY AUTO-RELEASE
  // ===============================

  // Auto-release expired rentals - runs hourly at minute 45
  // When a property's rentedUntil date has passed, automatically marks it as available for rent
  rentalExpiryTask = cron.schedule('45 * * * *', async () => {
    await withDbConnection('rental expiry check', async () => {
      try {
        cronLogger.info('🏠 Checking for expired rentals to auto-release...');
        const count = await processExpiredRentals();
        if (count > 0) {
          cronLogger.info(`✅ Auto-released ${count} expired rental(s)`);
        }
      } catch (error) {
        cronLogger.error('Rental expiry cron error:', error);
      }
    });
  });

  // Pre-computed property stats (hourly)
  startPropertyStatsJob();

  // Universal listings ingestion: pull from every enabled ListingSource every 6 hours (at minute 30).
  // Adapters internally apply robots.txt + per-host rate limits.
  listingIngestTask = cron.schedule('30 */6 * * *', async () => {
    await withDbConnection('listing ingest', async () => {
      await processListingIngest();
    });
  });

  // Replay deferred listings (those skipped because their owning user hit the
  // monthly limit). Runs hourly on the 1st of each month — month-boundary
  // logic resets the user's counter on first save, so we just keep retrying.
  deferredReplayTask = cron.schedule('15 * 1 * *', async () => {
    await withDbConnection('deferred listing replay', async () => {
      await processDeferredListingReplay();
    });
  });

  // ===============================
  // SCORE REFRESH
  // ===============================

  // Refresh all agent and agency composite scores every Monday at 03:00 UTC.
  // Catches drift for records updated outside the pre-save hook (e.g. admin bulk ops).
  scoreRefreshTask = cron.schedule('0 3 * * 1', async () => {
    await withDbConnection('score refresh', async () => {
      try {
        cronLogger.info('📊 Weekly score refresh starting...');
        const result = await runScoreFullRefresh();
        cronLogger.info(`📊 Weekly score refresh done — agents: ${result.agentsUpdated}, agencies: ${result.agenciesUpdated}, errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
          cronLogger.warn(`⚠️ Score refresh errors: ${result.errors.join('; ')}`);
        }
      } catch (error) {
        cronLogger.error('Score refresh cron error:', error);
      }
    });
  });

  cronLogger.info('🕐 All cron jobs started (subscription checks, weekly stats, property alerts, pro buyer emails, monthly coupons, news fetch, property stats, rental expiry, listing ingest, deferred replay, score refresh)');
};

export const stopCronJobs = () => {
  if (checkExpiringTask) checkExpiringTask.stop();
  if (updateExpiredTask) updateExpiredTask.stop();
  if (userSubscriptionTask) userSubscriptionTask.stop();
  if (agencySubscriptionExpiryTask) agencySubscriptionExpiryTask.stop();
  if (subscriptionReminderTask) subscriptionReminderTask.stop();
  if (weeklyStatsTask) weeklyStatsTask.stop();
  if (instantAlertsTask) instantAlertsTask.stop();
  if (dailyAlertsTask) dailyAlertsTask.stop();
  if (weeklyAlertsTask) weeklyAlertsTask.stop();
  if (priceDropAlertsTask) priceDropAlertsTask.stop();
  if (proBuyerHotHoursTask) proBuyerHotHoursTask.stop();
  if (activityCleanupTask) activityCleanupTask.stop();
  if (monthlyCouponTask) monthlyCouponTask.stop();
  if (newsFetchTask) newsFetchTask.stop();
  if (newsCleanupTask) newsCleanupTask.stop();
  if (rentalExpiryTask) rentalExpiryTask.stop();
  if (listingIngestTask) listingIngestTask.stop();
  if (deferredReplayTask) deferredReplayTask.stop();
  if (scoreRefreshTask) scoreRefreshTask.stop();
  stopPropertyStatsJob();
  cronLogger.info('🛑 All cron jobs stopped');
};
