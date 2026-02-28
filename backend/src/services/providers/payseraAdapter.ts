/**
 * Paysera Payment Provider Adapter
 *
 * Implements IPaymentProvider for Paysera.
 * Wraps the existing payseraService and payseraWebhookController
 * into the universal normalized format.
 *
 * NOTE: Paysera uses query parameters (data + ss1) instead of
 * request body + headers for webhook verification. The adapter
 * handles this difference transparently.
 */

import { Request } from 'express';
import {
  IPaymentProvider,
  WebhookVerificationResult,
  NormalizedWebhookEvent,
  CreateSessionParams,
  CreateSessionResult,
  VerifyPaymentResult,
} from '../../interfaces/IPaymentProvider';
import { payseraService, type PayseraPaymentMethod } from '../payseraService';
import User from '../../models/User';
import { webhookLogger } from '../../utils/logger';

/** Paysera status codes */
const PAYSERA_STATUS = {
  NOT_EXECUTED: 0,
  EXECUTED: 1,
  ACCEPTED_NOT_EXECUTED: 2,
  ADDITIONAL_INFO_NEEDED: 3,
};

class PayseraAdapter implements IPaymentProvider {
  public readonly name = 'paysera';
  public readonly displayName = 'Paysera';
  public readonly description = 'Secure payments with card, Google Pay, Apple Pay, and bank transfer';

  public isConfigured(): boolean {
    return payseraService.isConfigured();
  }

  public requiresRawBody(): boolean {
    // Paysera sends data as query params, no raw body needed
    return false;
  }

  public getSignatureHeaderName(): string {
    // Paysera uses query params (ss1), not a header
    return '';
  }

  public getSupportedPaymentMethods(): string[] {
    return ['card', 'google_pay', 'apple_pay', 'bank_transfer', 'wallet'];
  }

  public getFeeDescription(): string {
    return '~1.5-2.5% for card/wallet, lower for bank transfers';
  }

  /**
   * Verify Paysera webhook signature and normalize the callback.
   * Paysera sends data/ss1 as query parameters.
   */
  public verifyAndParseWebhook(req: Request): WebhookVerificationResult {
    try {
      const { data, ss1 } = req.query;

      if (!data || !ss1 || typeof data !== 'string' || typeof ss1 !== 'string') {
        return { valid: false, event: null, error: 'Missing data or signature parameters' };
      }

      const callbackResult = payseraService.parseCallback(data, ss1);

      if (!callbackResult.valid || !callbackResult.data) {
        return { valid: false, event: null, error: 'Invalid Paysera signature' };
      }

      const callbackData = callbackResult.data;
      const metadata = callbackResult.metadata || {};

      // Map Paysera status to normalized event type
      let type: NormalizedWebhookEvent['type'];
      let paymentStatus: 'completed' | 'pending' | 'failed';

      switch (callbackData.status) {
        case PAYSERA_STATUS.EXECUTED:
          type = 'payment.completed';
          paymentStatus = 'completed';
          break;
        case PAYSERA_STATUS.ACCEPTED_NOT_EXECUTED:
          type = 'payment.completed';
          paymentStatus = 'pending';
          break;
        case PAYSERA_STATUS.NOT_EXECUTED:
          type = 'payment.failed';
          paymentStatus = 'failed';
          break;
        default:
          type = 'unknown';
          paymentStatus = 'pending';
      }

      const normalized: NormalizedWebhookEvent = {
        type,
        rawType: `paysera.status.${callbackData.status}`,
        provider: this.name,
        eventId: callbackData.requestid || callbackData.orderid,
        metadata: {
          userId: metadata.userId || '',
          productId: metadata.productId,
          planName: metadata.planName,
          planInterval: metadata.planInterval,
        },
        payment: {
          amount: callbackData.payamount / 100, // Convert from cents
          currency: callbackData.paycurrency || 'EUR',
          transactionId: callbackData.orderid,
          purchaseToken: callbackData.requestid,
          status: paymentStatus,
        },
        rawEvent: { callbackData, metadata },
      };

      webhookLogger.info(`Paysera webhook verified: status ${callbackData.status} -> ${type} (order: ${callbackData.orderid})`);

      return { valid: true, event: normalized };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      webhookLogger.error(`Paysera webhook verification failed: ${message}`);
      return { valid: false, event: null, error: message };
    }
  }

  /**
   * Create a Paysera payment session.
   */
  public async createSession(params: CreateSessionParams): Promise<CreateSessionResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Paysera is not configured' };
    }

    const orderId = `BE_${params.userId.slice(-8)}_${Date.now()}`;

    const result = await payseraService.createPayment({
      orderId,
      amount: Math.round((params.amount || 0) * 100), // Convert to cents
      currency: params.currency || 'EUR',
      country: params.countryCode || 'GR',
      description: `BalkanEstate ${params.planName} subscription`,
      email: params.userEmail,
      userId: params.userId,
      productId: params.productId,
      planName: params.planName,
      planInterval: params.planInterval,
      firstName: params.firstName,
      lastName: params.lastName,
      language: params.language,
      paymentMethod: (params.paymentMethod as PayseraPaymentMethod) || 'all',
    });

    if (result.success) {
      return { success: true, paymentUrl: result.paymentUrl, sessionId: result.orderId };
    }
    return { success: false, error: result.error || 'Failed to create Paysera payment' };
  }

  /**
   * Verify payment by checking user subscription status.
   * Paysera processes payments via webhook, so we check the result.
   */
  public async verifyPayment(sessionId: string, userId: string): Promise<VerifyPaymentResult> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          paymentStatus: 'unknown',
          provider: this.name,
          sessionId,
          message: 'User not found',
        };
      }

      if (user.isSubscribed && user.subscriptionStatus === 'active') {
        return {
          success: true,
          paymentStatus: 'paid',
          provider: this.name,
          sessionId,
          subscription: {
            plan: user.subscriptionPlan,
            expiresAt: user.subscriptionExpiresAt,
            status: user.subscriptionStatus,
          },
        };
      }

      return {
        success: false,
        paymentStatus: 'pending',
        provider: this.name,
        sessionId,
        message: 'Payment is being processed. Please check back in a few minutes.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      webhookLogger.error(`Paysera payment verification failed: ${message}`);
      return {
        success: false,
        paymentStatus: 'unknown',
        provider: this.name,
        sessionId,
        message: 'Error verifying payment',
      };
    }
  }
}

export const payseraAdapter = new PayseraAdapter();
export default payseraAdapter;
