import { Request, Response } from 'express';
import { getGooglePlayService } from '../services/googlePlayService';
import Subscription from '../models/Subscription';
import SubscriptionEvent from '../models/SubscriptionEvent';
import PaymentRecord from '../models/PaymentRecord';
import Product from '../models/Product';


/**
 * Google Play Real-Time Developer Notifications (RTDN) webhook handler
 * @route POST /api/webhooks/google-play
 */
export const handleGooglePlayNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Google sends notifications via Cloud Pub/Sub
    const pubsubMessage = req.body.message;

    if (!pubsubMessage || !pubsubMessage.data) {
      res.status(400).json({ message: 'Invalid Pub/Sub message' });
      return;
    }

    // Decode the base64-encoded data
    const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    console.log('Google Play notification received:', notification);

    // Extract notification details
    const { subscriptionNotification, testNotification } = notification;

    // Handle test notifications
    if (testNotification) {
      console.log('Google Play test notification received');
      res.status(200).json({ message: 'Test notification received' });
      return;
    }

    if (!subscriptionNotification) {
      res.status(400).json({ message: 'No subscription notification data' });
      return;
    }

    const {
      notificationType,
      purchaseToken,
      subscriptionId,
    } = subscriptionNotification;

    // Get the Google Play service
    const googlePlayService = getGooglePlayService();

    // Parse notification type
    const eventType = googlePlayService.parseNotificationType(notificationType);

    // Validate the purchase with Google Play API
    const purchaseData = await googlePlayService.validateSubscription(
      subscriptionId,
      purchaseToken
    );

    // Find the subscription in our database
    let subscription = await Subscription.findOne({
      store: 'google',
      purchaseToken: purchaseToken,
    });

    // Find the product
    const product = await Product.findOne({
      googlePlayProductId: subscriptionId,
    });

    if (!product) {
      console.error(`Product not found for Google Play ID: ${subscriptionId}`);
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Process different notification types
    switch (notificationType) {
      case 4: // SUBSCRIPTION_PURCHASED
        await handleSubscriptionPurchased(purchaseData, product, purchaseToken);
        break;

      case 2: // SUBSCRIPTION_RENEWED
        await handleSubscriptionRenewed(subscription, purchaseData, product);
        break;

      case 3: // SUBSCRIPTION_CANCELED
        await handleSubscriptionCanceled(subscription, purchaseData);
        break;

      case 13: // SUBSCRIPTION_EXPIRED
        await handleSubscriptionExpired(subscription);
        break;

      case 6: // SUBSCRIPTION_IN_GRACE_PERIOD
        await handleSubscriptionGracePeriod(subscription, purchaseData);
        break;

      case 1: // SUBSCRIPTION_RECOVERED
        await handleSubscriptionRecovered(subscription, purchaseData);
        break;

      case 12: // SUBSCRIPTION_REVOKED
        await handleSubscriptionRevoked(subscription, purchaseData);
        break;

      case 10: // SUBSCRIPTION_PAUSED
        await handleSubscriptionPaused(subscription);
        break;

      case 7: // SUBSCRIPTION_RESTARTED
        await handleSubscriptionRestarted(subscription, purchaseData);
        break;

      default:
        console.log(`Unhandled notification type: ${notificationType}`);
    }

    // Log the event
    if (subscription) {
      await SubscriptionEvent.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        eventType: eventType.toLowerCase().replace(/_/g, '_'),
        store: 'google',
        notificationId: pubsubMessage.messageId || undefined,
        rawNotification: notification,
        createdAt: new Date(),
      });
    }

    // Acknowledge the notification
    res.status(200).json({ message: 'Notification processed successfully' });
  } catch (error: any) {
    console.error('Error processing Google Play notification:', error);
    res.status(500).json({ message: 'Error processing notification', error: error.message });
  }
};

/**
 * Handle new subscription purchase
 */
async function handleSubscriptionPurchased(
  purchaseData: any,
  product: any,
  purchaseToken: string
): Promise<void> {
  try {
    // Find user by some identifier (you'll need to implement user linking)
    // For now, we'll create a placeholder
    const orderId = purchaseData.orderId;

    // Calculate dates
    const startDate = new Date(parseInt(purchaseData.startTimeMillis));
    const expirationDate = new Date(parseInt(purchaseData.expiryTimeMillis));

    // Create new subscription
    const subscription = await Subscription.create({
      userId: null, // TODO: Link to user
      store: 'google',
      productId: product.productId,
      googlePlayProductId: product.googlePlayProductId,
      purchaseToken: purchaseToken,
      transactionId: orderId,
      startDate: startDate,
      expirationDate: expirationDate,
      renewalDate: expirationDate,
      status: 'active',
      autoRenewing: purchaseData.autoRenewing,
      price: parseInt(purchaseData.priceAmountMicros) / 1000000,
      currency: purchaseData.priceCurrencyCode,
      country: purchaseData.countryCode,
      isAcknowledged: purchaseData.acknowledgementState === 1,
    });

    // Create payment record
    await PaymentRecord.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      store: 'google',
      storeTransactionId: orderId,
      transactionType: 'charge',
      transactionDate: startDate,
      amount: parseInt(purchaseData.priceAmountMicros) / 1000000,
      currency: purchaseData.priceCurrencyCode,
      status: 'completed',
      productId: product.productId,
      country: purchaseData.countryCode,
    });

    console.log(`New Google Play subscription created: ${subscription._id}`);
  } catch (error) {
    console.error('Error handling subscription purchase:', error);
    throw error;
  }
}

/**
 * Handle subscription renewal
 */
async function handleSubscriptionRenewed(
  subscription: any,
  purchaseData: any,
  product: any
): Promise<void> {
  if (!subscription) return;

  const expirationDate = new Date(parseInt(purchaseData.expiryTimeMillis));

  subscription.expirationDate = expirationDate;
  subscription.renewalDate = expirationDate;
  subscription.status = 'active';
  subscription.autoRenewing = purchaseData.autoRenewing;
  await subscription.save();

  // Create payment record for renewal
  await PaymentRecord.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    store: 'google',
    storeTransactionId: purchaseData.orderId,
    transactionType: 'charge',
    transactionDate: new Date(),
    amount: parseInt(purchaseData.priceAmountMicros) / 1000000,
    currency: purchaseData.priceCurrencyCode,
    status: 'completed',
    productId: product.productId,
  });

  console.log(`Subscription renewed: ${subscription._id}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionCanceled(
  subscription: any,
  purchaseData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'canceled';
  subscription.autoRenewing = false;
  subscription.canceledAt = new Date(
    parseInt(purchaseData.userCancellationTimeMillis || Date.now())
  );
  subscription.cancellationReason = purchaseData.cancelReason?.toString();
  await subscription.save();

  console.log(`Subscription canceled: ${subscription._id}`);
}

/**
 * Handle subscription expiration
 */
async function handleSubscriptionExpired(subscription: any): Promise<void> {
  if (!subscription) return;

  subscription.status = 'expired';
  await subscription.save();

  console.log(`Subscription expired: ${subscription._id}`);
}

/**
 * Handle subscription in grace period
 */
async function handleSubscriptionGracePeriod(
  subscription: any,
  purchaseData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'grace';
  subscription.gracePeriodEndDate = new Date(parseInt(purchaseData.expiryTimeMillis));
  await subscription.save();

  console.log(`Subscription in grace period: ${subscription._id}`);
}

/**
 * Handle subscription recovered from grace period
 */
async function handleSubscriptionRecovered(
  subscription: any,
  purchaseData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'active';
  subscription.gracePeriodEndDate = undefined;
  subscription.expirationDate = new Date(parseInt(purchaseData.expiryTimeMillis));
  await subscription.save();

  console.log(`Subscription recovered: ${subscription._id}`);
}

/**
 * Handle subscription revoked (refunded)
 */
async function handleSubscriptionRevoked(
  subscription: any,
  purchaseData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'refunded';
  subscription.refundedAt = new Date();
  await subscription.save();

  // Create refund payment record
  await PaymentRecord.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    store: 'google',
    storeTransactionId: purchaseData.orderId + '_refund',
    transactionType: 'refund',
    transactionDate: new Date(),
    amount: -(parseInt(purchaseData.priceAmountMicros) / 1000000),
    currency: purchaseData.priceCurrencyCode,
    status: 'completed',
    productId: subscription.productId,
  });

  console.log(`Subscription refunded: ${subscription._id}`);
}

/**
 * Handle subscription paused
 */
async function handleSubscriptionPaused(subscription: any): Promise<void> {
  if (!subscription) return;

  subscription.status = 'paused';
  subscription.pausedAt = new Date();
  await subscription.save();

  console.log(`Subscription paused: ${subscription._id}`);
}

/**
 * Handle subscription restarted
 */
async function handleSubscriptionRestarted(
  subscription: any,
  purchaseData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'active';
  subscription.pausedAt = undefined;
  subscription.expirationDate = new Date(parseInt(purchaseData.expiryTimeMillis));
  await subscription.save();

  console.log(`Subscription restarted: ${subscription._id}`);
}
