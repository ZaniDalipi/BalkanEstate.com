import { Request, Response } from 'express';
import { getAppStoreService } from '../services/appStoreService';
import Subscription from '../models/Subscription';
import SubscriptionEvent from '../models/SubscriptionEvent';
import PaymentRecord from '../models/PaymentRecord';
import Product from '../models/Product';

/**
 * App Store Server Notifications v2 webhook handler
 * @route POST /api/webhooks/app-store
 */
export const handleAppStoreNotification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { signedPayload } = req.body;

    if (!signedPayload) {
      res.status(400).json({ message: 'Missing signed payload' });
      return;
    }

    // Get the App Store service
    const appStoreService = getAppStoreService();

    // Verify the signature
    const isValid = appStoreService.verifyNotificationSignature(signedPayload);
    if (!isValid) {
      console.error('Invalid App Store notification signature');
      res.status(401).json({ message: 'Invalid signature' });
      return;
    }

    // Decode the notification
    const notification = appStoreService.decodeNotification(signedPayload);

    console.log('App Store notification received:', notification);

    const { notificationType, subtype, data } = notification;

    // Extract transaction info from the signed transaction
    const signedTransactionInfo = data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      res.status(400).json({ message: 'Missing transaction info' });
      return;
    }

    const appStoreService2 = getAppStoreService();
    const transactionData = appStoreService2.decodeNotification(signedTransactionInfo);

    const {
      transactionId: _transactionId,
      originalTransactionId,
      productId,
      purchaseDate: _purchaseDate,
      expiresDate: _expiresDate,
      price: _price,
      currency: _currency,
    } = transactionData;

    // Find the subscription
    let subscription = await Subscription.findOne({
      store: 'apple',
      transactionId: originalTransactionId,
    });

    // Find the product
    const product = await Product.findOne({
      appStoreProductId: productId,
    });

    if (!product) {
      console.error(`Product not found for App Store ID: ${productId}`);
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Process different notification types
    switch (notificationType) {
      case 'SUBSCRIBED':
        await handleSubscriptionPurchased(transactionData, product);
        break;

      case 'DID_RENEW':
        await handleSubscriptionRenewed(subscription, transactionData, product);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        await handleRenewalStatusChanged(subscription, transactionData, subtype);
        break;

      case 'DID_FAIL_TO_RENEW':
        await handleRenewalFailed(subscription, subtype);
        break;

      case 'GRACE_PERIOD_EXPIRED':
        await handleGracePeriodExpired(subscription);
        break;

      case 'EXPIRED':
        await handleSubscriptionExpired(subscription, subtype);
        break;

      case 'REFUND':
        await handleSubscriptionRefunded(subscription, transactionData);
        break;

      case 'REVOKE':
        await handleSubscriptionRevoked(subscription);
        break;

      case 'RENEWAL_EXTENDED':
        await handleRenewalExtended(subscription, transactionData);
        break;

      case 'PRICE_INCREASE':
        await handlePriceIncrease(subscription, transactionData);
        break;

      default:
        console.log(`Unhandled notification type: ${notificationType}`);
    }

    // Log the event
    if (subscription) {
      await SubscriptionEvent.create({
        subscriptionId: subscription._id,
        userId: subscription.userId,
        eventType: appStoreService.parseNotificationType(notificationType).toLowerCase(),
        store: 'apple',
        notificationId: notification.notificationUUID || undefined,
        rawNotification: notification,
        createdAt: new Date(),
      });
    }

    // Acknowledge the notification
    res.status(200).json({ message: 'Notification processed successfully' });
  } catch (error: any) {
    console.error('Error processing App Store notification:', error);
    res.status(500).json({ message: 'Error processing notification', error: error.message });
  }
};

/**
 * Handle new subscription purchase
 */
async function handleSubscriptionPurchased(
  transactionData: any,
  product: any
): Promise<void> {
  try {
    const startDate = new Date(transactionData.purchaseDate);
    const expirationDate = new Date(transactionData.expiresDate);

    // Create new subscription
    const subscription = await Subscription.create({
      userId: null, // TODO: Link to user via app account token
      store: 'apple',
      productId: product.productId,
      appStoreProductId: product.appStoreProductId,
      transactionId: transactionData.originalTransactionId,
      receiptData: transactionData.transactionId,
      startDate: startDate,
      expirationDate: expirationDate,
      renewalDate: expirationDate,
      status: 'active',
      autoRenewing: true,
      price: transactionData.price || product.price,
      currency: transactionData.currency || product.currency,
      environment: transactionData.environment,
    });

    // Create payment record
    await PaymentRecord.create({
      userId: subscription.userId,
      subscriptionId: subscription._id,
      store: 'apple',
      storeTransactionId: transactionData.transactionId,
      transactionType: 'charge',
      transactionDate: startDate,
      amount: transactionData.price || product.price,
      currency: transactionData.currency || product.currency,
      status: 'completed',
      productId: product.productId,
    });

    console.log(`New App Store subscription created: ${subscription._id}`);
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
  transactionData: any,
  product: any
): Promise<void> {
  if (!subscription) return;

  const expirationDate = new Date(transactionData.expiresDate);

  subscription.expirationDate = expirationDate;
  subscription.renewalDate = expirationDate;
  subscription.status = 'active';
  subscription.receiptData = transactionData.transactionId;
  await subscription.save();

  // Create payment record for renewal
  await PaymentRecord.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    store: 'apple',
    storeTransactionId: transactionData.transactionId,
    transactionType: 'charge',
    transactionDate: new Date(),
    amount: transactionData.price || product.price,
    currency: transactionData.currency || product.currency,
    status: 'completed',
    productId: product.productId,
  });

  console.log(`Subscription renewed: ${subscription._id}`);
}

/**
 * Handle renewal status changed
 */
async function handleRenewalStatusChanged(
  subscription: any,
  transactionData: any,
  subtype: string
): Promise<void> {
  if (!subscription) return;

  if (subtype === 'AUTO_RENEW_DISABLED') {
    subscription.autoRenewing = false;
    subscription.willCancelAt = subscription.expirationDate;
  } else if (subtype === 'AUTO_RENEW_ENABLED') {
    subscription.autoRenewing = true;
    subscription.willCancelAt = undefined;
  }

  await subscription.save();
  console.log(`Renewal status changed for subscription: ${subscription._id}`);
}

/**
 * Handle renewal failed
 */
async function handleRenewalFailed(subscription: any, subtype: string): Promise<void> {
  if (!subscription) return;

  if (subtype === 'GRACE_PERIOD') {
    subscription.status = 'grace';
    // Grace period typically 16 days for App Store
    const gracePeriodEnd = new Date(subscription.expirationDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 16);
    subscription.gracePeriodEndDate = gracePeriodEnd;
  } else {
    subscription.status = 'expired';
  }

  await subscription.save();
  console.log(`Renewal failed for subscription: ${subscription._id}`);
}

/**
 * Handle grace period expired
 */
async function handleGracePeriodExpired(subscription: any): Promise<void> {
  if (!subscription) return;

  subscription.status = 'expired';
  subscription.gracePeriodEndDate = undefined;
  await subscription.save();

  console.log(`Grace period expired for subscription: ${subscription._id}`);
}

/**
 * Handle subscription expired
 */
async function handleSubscriptionExpired(subscription: any, subtype: string): Promise<void> {
  if (!subscription) return;

  subscription.status = 'expired';
  await subscription.save();

  console.log(`Subscription expired: ${subscription._id} (${subtype})`);
}

/**
 * Handle subscription refunded
 */
async function handleSubscriptionRefunded(
  subscription: any,
  transactionData: any
): Promise<void> {
  if (!subscription) return;

  subscription.status = 'refunded';
  subscription.refundedAt = new Date();
  await subscription.save();

  // Create refund payment record
  await PaymentRecord.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    store: 'apple',
    storeTransactionId: transactionData.transactionId + '_refund',
    transactionType: 'refund',
    transactionDate: new Date(),
    amount: -(transactionData.price || subscription.price),
    currency: transactionData.currency || subscription.currency,
    status: 'completed',
    productId: subscription.productId,
  });

  console.log(`Subscription refunded: ${subscription._id}`);
}

/**
 * Handle subscription revoked
 */
async function handleSubscriptionRevoked(subscription: any): Promise<void> {
  if (!subscription) return;

  subscription.status = 'refunded';
  subscription.refundedAt = new Date();
  await subscription.save();

  console.log(`Subscription revoked: ${subscription._id}`);
}

/**
 * Handle renewal extended
 */
async function handleRenewalExtended(subscription: any, transactionData: any): Promise<void> {
  if (!subscription) return;

  const expirationDate = new Date(transactionData.expiresDate);
  subscription.expirationDate = expirationDate;
  subscription.renewalDate = expirationDate;
  await subscription.save();

  console.log(`Renewal extended for subscription: ${subscription._id}`);
}

/**
 * Handle price increase
 */
async function handlePriceIncrease(subscription: any, transactionData: any): Promise<void> {
  if (!subscription) return;

  subscription.price = transactionData.price;
  await subscription.save();

  console.log(`Price increased for subscription: ${subscription._id}`);
}
