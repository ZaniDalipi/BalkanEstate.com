import * as cron from 'node-cron';
import AgencyFeaturedSubscription from '../models/AgencyFeaturedSubscription';
import Agency from '../models/Agency';
import User from '../models/User';
import Subscription from '../models/Subscription';
import PromotionCoupon from '../models/PromotionCoupon';
import emailService from '../services/emailService';
import { updateExpiredSubscriptions } from '../services/subscriptionPaymentService';

let checkExpiringTask: cron.ScheduledTask | null = null;
let updateExpiredTask: cron.ScheduledTask | null = null;
let userSubscriptionTask: cron.ScheduledTask | null = null;
let subscriptionReminderTask: cron.ScheduledTask | null = null;

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

  console.log('🕐 Subscription cron jobs started');
};

export const stopCronJobs = () => {
  if (checkExpiringTask) checkExpiringTask.stop();
  if (updateExpiredTask) updateExpiredTask.stop();
  if (userSubscriptionTask) userSubscriptionTask.stop();
  if (subscriptionReminderTask) subscriptionReminderTask.stop();
  console.log('🛑 Subscription cron jobs stopped');
};
