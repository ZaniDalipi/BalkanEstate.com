/**
 * PaySera Webhook Controller
 *
 * Handles callback notifications from PaySera payment gateway.
 * Processes successful payments and updates subscriptions.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { payseraService } from '../services/payseraService';
import { grantPaidPeriod } from '../services/subscriptions/grantPaidPeriod';
import User from '../models/User';
import Product from '../models/Product';
import DiscountCode from '../models/DiscountCode';
import { paymentLogger } from '../utils/logger';
import { getParam } from '../utils/validateParams';

/**
 * PaySera callback status codes
 */
const PAYSERA_STATUS = {
  NOT_EXECUTED: 0,
  EXECUTED: 1,
  ACCEPTED_NOT_EXECUTED: 2,
  ADDITIONAL_INFO_NEEDED: 3,
};

/**
 * @desc    Handle PaySera webhook callback
 * @route   POST /api/payments/paysera/webhook
 * @access  Public (verified with signature)
 */
export const handlePayseraWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, ss1 } = req.query;

    // Validate required parameters
    if (!data || !ss1 || typeof data !== 'string' || typeof ss1 !== 'string') {
      paymentLogger.error('❌ PaySera webhook: Missing data or signature');
      res.status(400).send('Bad Request: Missing parameters');
      return;
    }

    // Parse and verify callback
    const callbackResult = payseraService.parseCallback(data, ss1);

    if (!callbackResult.valid || !callbackResult.data) {
      paymentLogger.error('❌ PaySera webhook: Invalid signature or data');
      res.status(400).send('Bad Request: Invalid signature');
      return;
    }

    const callbackData = callbackResult.data;
    const metadata = callbackResult.metadata;

    paymentLogger.info(`📥 PaySera webhook received for order ${callbackData.orderid}`);
    paymentLogger.info(`   Status: ${callbackData.status}, Amount: ${callbackData.payamount} ${callbackData.paycurrency}, Method: ${callbackData.payment || 'unknown'}`);

    // Handle based on status
    switch (callbackData.status) {
      case PAYSERA_STATUS.EXECUTED:
        await handleSuccessfulPayment(callbackData, metadata);
        break;

      case PAYSERA_STATUS.ACCEPTED_NOT_EXECUTED:
        paymentLogger.info(`⏳ PaySera payment accepted but not yet executed: ${callbackData.orderid}`);
        // Payment is pending - we could create a pending subscription here
        break;

      case PAYSERA_STATUS.NOT_EXECUTED:
        paymentLogger.info(`❌ PaySera payment not executed: ${callbackData.orderid}`);
        break;

      case PAYSERA_STATUS.ADDITIONAL_INFO_NEEDED:
        paymentLogger.info(`⚠️ PaySera payment needs additional info: ${callbackData.orderid}`);
        break;

      default:
        paymentLogger.info(`❓ PaySera unknown status ${callbackData.status}: ${callbackData.orderid}`);
    }

    // PaySera expects 'OK' response for successful processing
    res.status(200).send('OK');
  } catch (error: any) {
    paymentLogger.error('❌ PaySera webhook error:', error);
    // Still respond with OK to prevent retries for errors we can't fix
    res.status(200).send('OK');
  }
};

/**
 * Mark the discount code used for a paid order. The payment already went
 * through at the discounted price, so a failure here is only logged.
 */
async function redeemDiscountCodeForPayment(code: string, userId: string, orderId: string): Promise<void> {
  try {
    const result = await DiscountCode.updateOne(
      { code: code.toUpperCase(), $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      { $inc: { usedCount: 1 }, $push: { usedBy: new mongoose.Types.ObjectId(userId) } }
    );
    if (result.modifiedCount === 0) {
      paymentLogger.warn(`⚠️ PaySera webhook: discount code ${code} could not be redeemed for order ${orderId} (already used up?)`);
    }
  } catch (error: any) {
    paymentLogger.error(`❌ PaySera webhook: failed to redeem discount code ${code} for order ${orderId}:`, error);
  }
}

/**
 * Process a successful PaySera payment
 */
async function handleSuccessfulPayment(
  callbackData: any,
  metadata: { userId: string; productId: string; planName: string; planInterval: string; discountCode?: string } | null
): Promise<void> {
  try {
    // Extract userId from verified metadata only (personcode is no longer sent)
    const userId = metadata?.userId;
    const productId = metadata?.productId;

    if (!userId) {
      paymentLogger.error('❌ PaySera webhook: No userId found in callback');
      return;
    }

    paymentLogger.info(`✅ Processing successful PaySera payment for user ${userId}`);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      paymentLogger.error(`❌ PaySera webhook: User not found: ${userId}`);
      return;
    }

    // Only a product in the catalogue can be granted. The payment is never
    // turned into a new product priced at whatever was paid.
    const product = productId ? await Product.findOne({ productId }) : null;

    if (!product) {
      paymentLogger.error(
        `❌ PaySera webhook: order ${callbackData.orderid} (user ${userId}) paid ${callbackData.payamount} ${callbackData.paycurrency} for unknown product "${productId ?? ''}" — nothing granted, needs manual review`
      );
      return;
    }

    // Granted once per order: a repeated callback for the same order finds
    // the payment already recorded and changes nothing.
    const result = await grantPaidPeriod({
      userId,
      productId: product.productId,
      amount: callbackData.payamount / 100, // Convert from cents
      currency: callbackData.paycurrency || 'EUR',
      reference: callbackData.orderid,
      method: 'paysera',
      ...(metadata?.discountCode ? { discountCode: metadata.discountCode, originalAmount: product.price } : {}),
    });
    if (result.alreadyGranted) {
      paymentLogger.info(`⏭️ PaySera webhook: order ${callbackData.orderid} already processed, skipping`);
      return;
    }

    if (metadata?.discountCode) {
      await redeemDiscountCodeForPayment(metadata.discountCode, userId, callbackData.orderid);
    }

    paymentLogger.info(`✅ PaySera subscription activated for user ${user._id}`);
    paymentLogger.info(`   Subscription ID: ${result.subscription._id}`);
    paymentLogger.info(`   Expires: ${result.expirationDate}`);
  } catch (error: any) {
    paymentLogger.error('❌ Error processing PaySera payment:', error);
    throw error;
  }
}

/**
 * @desc    Verify a PaySera payment by order ID
 * @route   GET /api/payments/paysera/verify/:orderId
 * @access  Private
 */
export const verifyPayseraPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = getParam(req, 'orderId');
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // For PaySera, we check if the subscription was created
    // The webhook should have already processed the payment
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check if user has an active subscription
    if (user.isSubscribed && user.subscriptionStatus === 'active') {
      res.status(200).json({
        success: true,
        paymentStatus: 'paid',
        provider: 'paysera',
        orderId,
        subscription: {
          plan: user.subscriptionPlan,
          expiresAt: user.subscriptionExpiresAt,
          status: user.subscriptionStatus,
        },
      });
    } else {
      // Payment might be pending - check later
      res.status(200).json({
        success: false,
        paymentStatus: 'pending',
        provider: 'paysera',
        orderId,
        message: 'Payment is being processed. Please check back in a few minutes.',
      });
    }
  } catch (error: any) {
    paymentLogger.error('Error verifying PaySera payment:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

export default {
  handlePayseraWebhook,
  verifyPayseraPayment,
};
