/**
 * PaySera Webhook Controller
 *
 * Handles callback notifications from PaySera payment gateway.
 * Processes successful payments and updates subscriptions.
 */

import { Request, Response } from 'express';
import { payseraService } from '../services/payseraService';
import { processSubscriptionPayment } from '../services/subscriptionPaymentService';
import User from '../models/User';
import Product from '../models/Product';
import { paymentLogger } from '../utils/logger';

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
    paymentLogger.info(`   Status: ${callbackData.status}, Amount: ${callbackData.payamount} ${callbackData.paycurrency}`);

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
 * Process a successful PaySera payment
 */
async function handleSuccessfulPayment(
  callbackData: any,
  metadata: { userId: string; productId: string; planName: string; planInterval: string } | null
): Promise<void> {
  try {
    // Extract userId from metadata or personcode
    const userId = metadata?.userId || callbackData.personcode;
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

    // Find or create product
    let product = productId ? await Product.findOne({ productId }) : null;

    if (!product) {
      // Create a default product based on amount
      const amountInEur = callbackData.payamount / 100;
      const isYearly = amountInEur > 50; // Simple heuristic

      product = await Product.create({
        productId: productId || `paysera_${callbackData.orderid}`,
        name: metadata?.planName || 'PaySera Subscription',
        description: 'Subscription via PaySera',
        price: amountInEur,
        currency: callbackData.paycurrency || 'EUR',
        billingPeriod: isYearly ? 'yearly' : 'monthly',
        isActive: true,
      });
    }

    // Process the subscription payment
    const result = await processSubscriptionPayment({
      userId,
      productId: product.productId,
      store: 'web', // PaySera is a web payment
      amount: callbackData.payamount / 100, // Convert from cents
      currency: callbackData.paycurrency || 'EUR',
      transactionId: callbackData.orderid,
      purchaseToken: callbackData.requestid,
    });

    paymentLogger.info(`✅ PaySera subscription activated for user ${user.email}`);
    paymentLogger.info(`   Subscription ID: ${result.subscription._id}`);
    paymentLogger.info(`   Expires: ${result.subscription.expirationDate}`);
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
    const { orderId } = req.params;
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
