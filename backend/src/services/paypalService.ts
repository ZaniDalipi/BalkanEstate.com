/**
 * PayPal Payment Service
 *
 * Handles PayPal payment processing for supported countries:
 * - Albania (AL)
 * - Bosnia and Herzegovina (BA)
 * - North Macedonia (MK)
 * - Montenegro (ME)
 * - Kosovo (XK)
 *
 * Uses PayPal Orders API v2 for secure, verified payments.
 * Every payment is verified server-side via PayPal webhooks
 * before activating any subscription — no dummy data.
 *
 * PayPal API Documentation: https://developer.paypal.com/docs/api/orders/v2/
 */

import { paymentLogger } from '../utils/logger';
import { buildFrontendRedirectUrl } from '../utils/redirectValidation';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || '';

const PAYPAL_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

export interface PayPalPaymentRequest {
  userId: string;
  userEmail: string;
  amount: number; // Amount in EUR
  currency: string;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  countryCode: string;
  language?: string;
  firstName?: string;
  lastName?: string;
}

export interface PayPalPaymentResponse {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  error?: string;
}

class PayPalService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  /**
   * Check if PayPal is properly configured
   */
  public isConfigured(): boolean {
    return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
  }

  /**
   * Get an OAuth2 access token from PayPal
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

    const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal OAuth failed: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken!;
  }

  /**
   * Create a PayPal Order with approval link.
   * The user is redirected to PayPal to approve the payment.
   * Payment is only confirmed via webhook or server-side capture.
   */
  public async createOrder(request: PayPalPaymentRequest): Promise<PayPalPaymentResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
      }

      const token = await this.getAccessToken();

      const successUrl = buildFrontendRedirectUrl('/payment/success', {
        provider: 'paypal',
      });

      const cancelUrl = buildFrontendRedirectUrl('/payment/cancel', {
        provider: 'paypal',
      });

      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `BE_${request.userId.slice(-8)}_${Date.now()}`,
            description: `BalkanEstate ${request.planName} subscription`,
            custom_id: JSON.stringify({
              userId: request.userId,
              productId: request.productId,
              planName: request.planName,
              planInterval: request.planInterval,
              countryCode: request.countryCode,
            }),
            amount: {
              currency_code: request.currency.toUpperCase(),
              value: request.amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'BalkanEstate',
              locale: this.mapLocale(request.language),
              landing_page: 'LOGIN',
              user_action: 'PAY_NOW',
              return_url: successUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      };

      const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`PayPal order creation failed: ${JSON.stringify(errorData)}`);
      }

      const order: any = await response.json();

      // Find the approval URL — this is where the user is redirected to approve payment
      const approvalLink = order.links?.find((link: any) => link.rel === 'payer-action')
        || order.links?.find((link: any) => link.rel === 'approve');

      if (!approvalLink?.href) {
        throw new Error('No approval URL returned from PayPal');
      }

      paymentLogger.info(`PayPal order created: ${order.id} for user ${request.userId}`);

      return {
        success: true,
        paymentUrl: approvalLink.href,
        orderId: order.id,
      };
    } catch (error: any) {
      paymentLogger.error('PayPal order creation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Capture a PayPal order after user approval.
   * This completes the payment — money is transferred.
   * Called from the webhook handler when payment is approved.
   */
  public async captureOrder(orderId: string): Promise<{
    success: boolean;
    captureId?: string;
    status?: string;
    metadata?: any;
    amount?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`PayPal capture failed: ${JSON.stringify(errorData)}`);
      }

      const capture: any = await response.json();

      // Extract metadata from custom_id
      let metadata = null;
      const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
        || capture.purchase_units?.[0]?.custom_id;
      if (customId) {
        try {
          metadata = JSON.parse(customId);
        } catch {
          paymentLogger.warn('Failed to parse PayPal custom_id metadata');
        }
      }

      const captureData = capture.purchase_units?.[0]?.payments?.captures?.[0];

      paymentLogger.info(`PayPal order captured: ${orderId}, status: ${capture.status}`);

      return {
        success: capture.status === 'COMPLETED',
        captureId: captureData?.id,
        status: capture.status,
        metadata,
        amount: captureData?.amount ? parseFloat(captureData.amount.value) : undefined,
        currency: captureData?.amount?.currency_code,
      };
    } catch (error: any) {
      paymentLogger.error('PayPal capture failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get order details from PayPal (server-side verification).
   * Used to verify payment status — never trust client-side data.
   */
  public async getOrderDetails(orderId: string): Promise<{
    success: boolean;
    status?: string;
    metadata?: any;
    amount?: number;
    currency?: string;
    payerEmail?: string;
    error?: string;
  }> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`PayPal order lookup failed: ${JSON.stringify(errorData)}`);
      }

      const order: any = await response.json();

      let metadata = null;
      const customId = order.purchase_units?.[0]?.custom_id;
      if (customId) {
        try {
          metadata = JSON.parse(customId);
        } catch {
          // Not JSON metadata
        }
      }

      const purchaseUnit = order.purchase_units?.[0];

      return {
        success: true,
        status: order.status,
        metadata,
        amount: purchaseUnit?.amount ? parseFloat(purchaseUnit.amount.value) : undefined,
        currency: purchaseUnit?.amount?.currency_code,
        payerEmail: order.payer?.email_address,
      };
    } catch (error: any) {
      paymentLogger.error('PayPal order details lookup failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify a PayPal webhook signature.
   * This ensures the webhook is actually from PayPal — prevents spoofing.
   */
  public async verifyWebhookSignature(
    headers: Record<string, string>,
    body: string
  ): Promise<boolean> {
    try {
      if (!PAYPAL_WEBHOOK_ID) {
        paymentLogger.error('PayPal webhook ID not configured');
        return false;
      }

      const token = await this.getAccessToken();

      const verificationPayload = {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(body),
      };

      const response = await fetch(`${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationPayload),
      });

      if (!response.ok) {
        paymentLogger.error('PayPal webhook verification request failed');
        return false;
      }

      const result: any = await response.json();
      return result.verification_status === 'SUCCESS';
    } catch (error: any) {
      paymentLogger.error('PayPal webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get supported countries for PayPal
   */
  public getSupportedCountries(): string[] {
    return ['AL', 'BA', 'MK', 'ME', 'XK'];
  }

  /**
   * Check if a country is supported by PayPal
   */
  public isCountrySupported(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }

  /**
   * Map language to PayPal locale format
   */
  private mapLocale(lang?: string): string {
    if (!lang) return 'en-US';
    const localeMap: Record<string, string> = {
      en: 'en-US',
      sq: 'en-US', // Albanian - fallback to English
      bs: 'en-US', // Bosnian - fallback to English
      mk: 'en-US', // Macedonian - fallback to English
      me: 'en-US', // Montenegrin - fallback to English
      sr: 'en-US', // Serbian - fallback to English
      de: 'de-DE',
      fr: 'fr-FR',
    };
    return localeMap[lang.toLowerCase()] || 'en-US';
  }
}

export const paypalService = new PayPalService();
export default paypalService;
