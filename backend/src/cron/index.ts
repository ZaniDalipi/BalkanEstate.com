import * as cron from 'node-cron';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PromotionCoupon from '../models/PromotionCoupon';
import emailService from '../services/emailService';
import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';
import { runWeeklyStatsJobs } from '../jobs/weeklyStatsJob';
import { processNewListingAlerts, processPriceDropAlerts } from '../jobs/propertyAlertsJob';

let checkExpiringTask: cron.ScheduledTask | null = null;
let updateExpiredTask: cron.ScheduledTask | null = null;
let userSubscriptionTask: cron.ScheduledTask | null = null;
let subscriptionReminderTask: cron.ScheduledTask | null = null;
let weeklyStatsTask: cron.ScheduledTask | null = null;
let instantAlertsTask: cron.ScheduledTask | null = null;
let dailyAlertsTask: cron.ScheduledTask | null = null;
let weeklyAlertsTask: cron.ScheduledTask | null = null;
let priceDropAlertsTask: cron.ScheduledTask | null = null;

export const startCronJobs = () => {
  // Check for subscriptions expiring in 1 day - runs daily at 10 AM
  checkExpiringTask = cron.schedule('0 10 * * *', async () => {
    try {
      console.log('🔍 Checking expiring subscriptions...');
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
        console.log('✅ Sent reminder to', agency.name);
      }
    } catch (error) {
      console.error('Expiry cron error:', error);
    }
  });

  // Update expired subscriptions - runs hourly
  updateExpiredTask = cron.schedule('0 * * * *', async () => {
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
      console.log('✅ Updated', expired.length, 'expired subscriptions');
    } catch (error) {
      console.error('Expiry update cron error:', error);
    }
  });

  // Update expired user subscriptions - runs every 6 hours
  userSubscriptionTask = cron.schedule('0 */6 * * *', async () => {
    try {
      console.log('🔄 Checking and updating expired user subscriptions...');
      const count = await updateExpiredSubscriptions();
      console.log(`✅ Processed ${count} expired user subscriptions`);
    } catch (error) {
      console.error('User subscription expiry cron error:', error);
    }
  });

  // Send subscription renewal reminders - runs daily at 9 AM
  subscriptionReminderTask = cron.schedule('0 9 * * *', async () => {
    try {
      console.log('📧 Sending subscription renewal reminders...');
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find subscriptions expiring in the next 3 days
      const expiringSubscriptions = await Subscription.find({
        status: 'active',
        autoRenewing: false, // Only for those not auto-renewing
        expirationDate: { $gte: today, $lte: threeDaysFromNow },
      }).populate('userId');

      let remindersSent = 0;
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
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${user.email}:`, emailError);
        }
      }

      console.log(`✅ Sent ${remindersSent} subscription renewal reminders`);
    } catch (error) {
      console.error('Subscription reminder cron error:', error);
    }
  });

  // Send weekly statistics to Pro members and agencies - runs every Monday at 9 AM UTC
  weeklyStatsTask = cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('📊 Starting weekly statistics email job...');
      await runWeeklyStatsJobs();
      console.log('✅ Weekly statistics emails sent');
    } catch (error) {
      console.error('Weekly stats cron error:', error);
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
      console.error('Instant alerts cron error:', error);
    }
  });

  // Daily digest alerts - runs daily at 8 AM UTC
  dailyAlertsTask = cron.schedule('0 8 * * *', async () => {
    try {
      console.log('📬 Processing daily property alerts...');
      await processNewListingAlerts('daily');
      console.log('✅ Daily alerts sent');
    } catch (error) {
      console.error('Daily alerts cron error:', error);
    }
  });

  // Weekly digest alerts - runs every Sunday at 8 AM UTC
  weeklyAlertsTask = cron.schedule('0 8 * * 0', async () => {
    try {
      console.log('📬 Processing weekly property alerts...');
      await processNewListingAlerts('weekly');
      console.log('✅ Weekly alerts sent');
    } catch (error) {
      console.error('Weekly alerts cron error:', error);
    }
  });

  // Price drop alerts - runs every hour
  priceDropAlertsTask = cron.schedule('30 * * * *', async () => {
    try {
      await processPriceDropAlerts();
    } catch (error) {
      console.error('Price drop alerts cron error:', error);
    }
  });

  console.log('🕐 All cron jobs started (subscription checks, weekly stats, property alerts)');
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
  console.log('🛑 All cron jobs stopped');
};
