/**
 * Braintree Webhook Controller
 *
 * Handles webhook notifications from Braintree for post-settlement events.
 *
 * NOTE: Subscription activation happens synchronously in processBraintreePayment
 * (paymentController.ts), NOT via webhooks. This controller only handles:
 * - Settlement declines (rare edge case)
 * - Disputes
 */

import { Request, Response } from 'express';
import { braintreeService } from '../services/braintreeService';
import Subscription from '../models/Subscription';
import User from '../models/User';
import { paymentLogger } from '../utils/logger';

/**
 * @desc    Handle Braintree webhook notifications
 * @route   POST /api/payments/braintree/webhook
 * @access  Public (verified with Braintree signature)
 */
export const handleBraintreeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.body.bt_signature;
    const payload = req.body.bt_payload;

    if (!signature || !payload) {
      paymentLogger.error('Braintree webhook: Missing signature or payload');
      res.status(400).json({ error: 'Missing bt_signature or bt_payload' });
      return;
    }

    const notification = await braintreeService.parseWebhook(signature, payload);
    if (!notification) {
      paymentLogger.error('Braintree webhook: Failed to parse/verify notification');
      res.status(400).json({ error: 'Invalid webhook notification' });
      return;
    }

    paymentLogger.info(`Braintree webhook received: ${notification.kind}`);

    switch (notification.kind) {
      case 'transaction_settlement_declined':
        await handleSettlementDeclined(notification);
        break;

      case 'dispute_opened':
        await handleDisputeOpened(notification);
        break;

      case 'dispute_won':
        paymentLogger.info(`Braintree dispute won: ${notification.dispute?.id}`);
        break;

      case 'dispute_lost':
        await handleDisputeLost(notification);
        break;

      default:
        paymentLogger.info(`Braintree webhook: Unhandled kind: ${notification.kind}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    paymentLogger.error('Braintree webhook error:', error);
    res.status(200).json({ received: true });
  }
};

/**
 * Handle settlement decline — the authorized transaction failed to settle.
 * This is rare but means the payment ultimately didn't go through.
 */
async function handleSettlementDeclined(notification: any): Promise<void> {
  const transaction = notification.transaction;
  if (!transaction) return;

  const transactionId = transaction.id;
  paymentLogger.warn(`Braintree settlement declined: ${transactionId}`);

  const subscription = await Subscription.findOne({
    store: 'braintree',
    transactionId,
  });

  if (subscription) {
    subscription.status = 'canceled';
    subscription.canceledAt = new Date();
    subscription.cancellationReason = 'Payment settlement declined';
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      user.isSubscribed = false;
      user.subscriptionStatus = 'canceled';
      await user.save();
    }

    paymentLogger.warn(`Braintree: Subscription ${subscription._id} canceled due to settlement decline`);
  }
}

/**
 * Handle dispute opened — flag for review
 */
async function handleDisputeOpened(notification: any): Promise<void> {
  const dispute = notification.dispute;
  if (!dispute) return;

  paymentLogger.warn(`Braintree dispute opened: ${dispute.id}, transaction: ${dispute.transaction?.id}, reason: ${dispute.reason}`);
}

/**
 * Handle dispute lost — cancel subscription
 */
async function handleDisputeLost(notification: any): Promise<void> {
  const dispute = notification.dispute;
  if (!dispute?.transaction?.id) return;

  const transactionId = dispute.transaction.id;
  paymentLogger.warn(`Braintree dispute lost: ${dispute.id}, transaction: ${transactionId}`);

  const subscription = await Subscription.findOne({
    store: 'braintree',
    transactionId,
  });

  if (subscription) {
    subscription.status = 'refunded';
    subscription.canceledAt = new Date();
    subscription.cancellationReason = 'Dispute lost';
    await subscription.save();

    const user = await User.findById(subscription.userId);
    if (user) {
      user.isSubscribed = false;
      user.subscriptionStatus = 'canceled';
      await user.save();
    }

    paymentLogger.warn(`Braintree: Subscription ${subscription._id} refunded due to lost dispute`);
  }
}

export default {
  handleBraintreeWebhook,
};
