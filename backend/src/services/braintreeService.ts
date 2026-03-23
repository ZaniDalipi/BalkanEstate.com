/**
 * Braintree Payment Service
 *
 * Handles payment processing for countries that also support PayPal:
 * - Albania (AL)
 * - Bosnia and Herzegovina (BA)
 * - North Macedonia (MK)
 * - Montenegro (ME)
 * - Kosovo (XK)
 *
 * Provides on-site card payments via Braintree Drop-in UI with:
 * - 3D Secure verification
 * - AVS/CVV verification
 * - Apple Pay & Google Pay support
 *
 * Uses Braintree Gateway SDK for server-side transaction processing.
 * Subscriptions are activated synchronously after successful transaction.sale()
 * (unlike PayPal which uses webhooks for activation).
 */

import braintree, {
  BraintreeGateway,
  Environment,
  Transaction,
  TransactionRequest,
  ValidatedResponse,
} from 'braintree';
import { paymentLogger } from '../utils/logger';

const BRAINTREE_MERCHANT_ID = process.env.BRAINTREE_MERCHANT_ID || '';
const BRAINTREE_PUBLIC_KEY = process.env.BRAINTREE_PUBLIC_KEY || '';
const BRAINTREE_PRIVATE_KEY = process.env.BRAINTREE_PRIVATE_KEY || '';
const BRAINTREE_MERCHANT_ACCOUNT_ID = process.env.BRAINTREE_MERCHANT_ACCOUNT_ID || '';

export interface BraintreePaymentRequest {
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  paymentMethodNonce: string;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  countryCode: string;
  firstName?: string;
  lastName?: string;
  deviceData?: string;
}

export interface BraintreePaymentResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  error?: string;
  avsPostalCodeResponse?: string;
  cvvResponse?: string;
  threeDSecureInfo?: {
    enrolled: boolean;
    status: string;
    liabilityShifted: boolean;
  };
}

class BraintreeService {
  private gateway: BraintreeGateway | null = null;

  /**
   * Check if Braintree is properly configured
   */
  public isConfigured(): boolean {
    return !!(BRAINTREE_MERCHANT_ID && BRAINTREE_PUBLIC_KEY && BRAINTREE_PRIVATE_KEY);
  }

  /**
   * Get or create the Braintree gateway instance
   */
  private getGateway(): BraintreeGateway {
    if (this.gateway) return this.gateway;

    if (!this.isConfigured()) {
      throw new Error('Braintree is not configured. Set BRAINTREE_MERCHANT_ID, BRAINTREE_PUBLIC_KEY, and BRAINTREE_PRIVATE_KEY.');
    }

    this.gateway = new braintree.BraintreeGateway({
      environment: process.env.NODE_ENV === 'production'
        ? Environment.Production
        : Environment.Sandbox,
      merchantId: BRAINTREE_MERCHANT_ID,
      publicKey: BRAINTREE_PUBLIC_KEY,
      privateKey: BRAINTREE_PRIVATE_KEY,
    });

    return this.gateway;
  }

  /**
   * Generate a client token for the Drop-in UI.
   * The frontend uses this token to initialize the Braintree Drop-in.
   */
  public async generateClientToken(customerId?: string): Promise<string> {
    try {
      const gateway = this.getGateway();
      const options: braintree.ClientTokenRequest = {};
      if (customerId) {
        options.customerId = customerId;
      }
      const response = await gateway.clientToken.generate(options);
      return response.clientToken;
    } catch (error: any) {
      paymentLogger.error('Braintree client token generation failed:', error);
      throw new Error(`Failed to generate Braintree client token: ${error.message}`);
    }
  }

  /**
   * Create a transaction using a payment method nonce from the Drop-in UI.
   * The nonce is a one-time-use reference to the payment method.
   *
   * This method:
   * 1. Creates a sale with immediate settlement
   * 2. Enforces 3D Secure
   * 3. Validates CVV response
   * 4. Returns success/failure with transaction details
   */
  public async createTransaction(request: BraintreePaymentRequest): Promise<BraintreePaymentResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Braintree is not configured.');
      }

      const gateway = this.getGateway();

      const transactionRequest: TransactionRequest = {
        amount: request.amount.toFixed(2),
        paymentMethodNonce: request.paymentMethodNonce,
        orderId: `BE_${request.userId.slice(-8)}_${Date.now()}`,
        customFields: {
          user_id: request.userId,
          product_id: request.productId,
          plan_name: request.planName,
          plan_interval: request.planInterval,
          country_code: request.countryCode,
        } as Record<string, string>,
        customer: {
          email: request.userEmail,
          firstName: request.firstName,
          lastName: request.lastName,
        },
        options: {
          submitForSettlement: true,
          threeDSecure: {
            required: true,
          },
        },
        ...(BRAINTREE_MERCHANT_ACCOUNT_ID && {
          merchantAccountId: BRAINTREE_MERCHANT_ACCOUNT_ID,
        }),
        ...(request.deviceData && {
          deviceData: request.deviceData,
        }),
      };

      const result: ValidatedResponse<Transaction> = await gateway.transaction.sale(transactionRequest);

      if (result.success) {
        const transaction = result.transaction;

        // Validate CVV response
        const cvvResponse = transaction.cvvResponseCode;
        if (cvvResponse && cvvResponse !== 'M' && cvvResponse !== 'I') {
          // M = Match, I = Not provided (e.g. Apple Pay/Google Pay)
          paymentLogger.warn(`Braintree CVV mismatch for user ${request.userId}: ${cvvResponse}`);
          // Void the transaction if CVV doesn't match
          await gateway.transaction.void(transaction.id);
          return {
            success: false,
            error: 'Card verification failed. Please check your card details and try again.',
            cvvResponse,
          };
        }

        // Extract 3DS info
        const threeDSecureInfo = transaction.threeDSecureInfo
          ? {
              enrolled: transaction.threeDSecureInfo.enrolled === 'Y',
              status: transaction.threeDSecureInfo.status || 'unknown',
              liabilityShifted: transaction.threeDSecureInfo.liabilityShifted === true,
            }
          : undefined;

        paymentLogger.info(`Braintree transaction created: ${transaction.id} for user ${request.userId}, status: ${transaction.status}`);

        return {
          success: true,
          transactionId: transaction.id,
          status: transaction.status,
          avsPostalCodeResponse: transaction.avsPostalCodeResponseCode,
          cvvResponse,
          threeDSecureInfo,
        };
      }

      // Transaction failed
      const errorMessage = result.message || 'Transaction failed';
      paymentLogger.error(`Braintree transaction failed for user ${request.userId}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    } catch (error: any) {
      paymentLogger.error('Braintree transaction error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred during payment processing.',
      };
    }
  }

  /**
   * Find a transaction by ID (for verification/lookup)
   */
  public async findTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const gateway = this.getGateway();
      return await gateway.transaction.find(transactionId);
    } catch (error: any) {
      paymentLogger.error(`Braintree transaction lookup failed: ${transactionId}`, error);
      return null;
    }
  }

  /**
   * Parse and verify a Braintree webhook notification
   */
  public async parseWebhook(signature: string, payload: string): Promise<braintree.WebhookNotification | null> {
    try {
      const gateway = this.getGateway();
      return await gateway.webhookNotification.parse(signature, payload);
    } catch (error: any) {
      paymentLogger.error('Braintree webhook parse failed:', error);
      return null;
    }
  }

  /**
   * Get supported countries for Braintree (same as PayPal countries)
   */
  public getSupportedCountries(): string[] {
    return ['AL', 'BA', 'MK', 'ME', 'XK'];
  }

  /**
   * Check if a country is supported by Braintree
   */
  public isCountrySupported(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }
}

export const braintreeService = new BraintreeService();
export default braintreeService;
