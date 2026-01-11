/**
 * Paddle Payment Service
 *
 * Paddle is a Merchant of Record (MoR) that handles:
 * - Payment processing
 * - VAT/Tax compliance in 200+ countries
 * - Subscription management
 * - Chargebacks and fraud protection
 * - Customer invoices
 *
 * Supports all Balkan countries including non-EU:
 * Serbia, Albania, Bosnia, N. Macedonia, Montenegro, Kosovo
 *
 * Paddle API Documentation: https://developer.paddle.com/
 */

import crypto from 'crypto';

// Paddle API endpoints
const PADDLE_API_URL = process.env.PADDLE_ENVIRONMENT === 'production'
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com';

export interface PaddleConfig {
  apiKey: string;
  clientToken: string;
  webhookSecret: string;
  environment: 'sandbox' | 'production';
}

export interface PaddleProduct {
  id: string;
  name: string;
  description?: string;
  taxCategory: string;
}

export interface PaddlePrice {
  id: string;
  productId: string;
  description: string;
  amount: string;
  currency: string;
  interval?: 'month' | 'year';
}

export interface PaddleCheckoutRequest {
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customerId?: string;
  customerEmail?: string;
  customData?: Record<string, string>;
  successUrl: string;
  settings?: {
    displayMode?: 'inline' | 'overlay';
    locale?: string;
    theme?: 'light' | 'dark';
  };
}

export interface PaddleCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}

export interface PaddleWebhookEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  notification_id: string;
  data: any;
}

export interface PaddleSubscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'paused' | 'trialing';
  customerId: string;
  addressId: string;
  businessId?: string;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  firstBilledAt?: string;
  nextBilledAt?: string;
  pausedAt?: string;
  canceledAt?: string;
  currentBillingPeriod?: {
    startsAt: string;
    endsAt: string;
  };
  billingCycle: {
    interval: 'month' | 'year';
    frequency: number;
  };
  items: Array<{
    priceId: string;
    quantity: number;
    price: {
      id: string;
      productId: string;
      unitPrice: {
        amount: string;
        currencyCode: string;
      };
    };
  }>;
  customData?: Record<string, string>;
}

/**
 * Paddle Payment Service Class
 */
class PaddleService {
  private config: PaddleConfig;

  constructor() {
    this.config = {
      apiKey: process.env.PADDLE_API_KEY || '',
      clientToken: process.env.PADDLE_CLIENT_TOKEN || '',
      webhookSecret: process.env.PADDLE_WEBHOOK_SECRET || '',
      environment: (process.env.PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
    };
  }

  /**
   * Make authenticated request to Paddle API
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${PADDLE_API_URL}${endpoint}`;
    console.log(`📤 Paddle API ${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText })) as {
        error?: { detail?: string; code?: string; type?: string };
        message?: string
      };
      console.error('❌ Paddle API Error Response:', JSON.stringify(errorData, null, 2));
      console.error('   Status:', response.status);
      console.error('   API Key prefix:', this.config.apiKey?.substring(0, 10) + '...');
      throw new Error(`Paddle API error: ${errorData.error?.detail || errorData.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a checkout session for a transaction
   */
  public async createCheckout(request: {
    priceId: string;
    userId: string;
    userEmail: string;
    productId: string;
    planName: string;
    planInterval: string;
    successUrl: string;
    cancelUrl?: string;
  }): Promise<PaddleCheckoutResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Paddle not configured. Set PADDLE_API_KEY and PADDLE_CLIENT_TOKEN');
      }

      console.log('📤 Creating Paddle checkout with price ID:', request.priceId);

      // Create a transaction (checkout session)
      // Paddle API v2 format
      const requestBody: any = {
        items: [
          {
            price_id: request.priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          user_id: request.userId,
          product_id: request.productId,
          plan_name: request.planName,
          plan_interval: request.planInterval,
        },
        checkout: {
          url: request.successUrl,
        },
      };

      // Only add customer email if provided
      if (request.userEmail) {
        requestBody.customer = {
          email: request.userEmail,
        };
      }

      const transaction = await this.apiRequest<{ data: any }>('/transactions', 'POST', requestBody);

      const checkoutUrl = transaction.data?.checkout?.url;

      console.log(`✅ Paddle checkout created: ${transaction.data?.id}`);
      console.log(`   Checkout URL: ${checkoutUrl}`);

      return {
        success: true,
        checkoutUrl,
        transactionId: transaction.data?.id,
      };
    } catch (error: any) {
      console.error('❌ Paddle checkout creation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create a checkout URL using Paddle.js overlay (client-side)
   * Returns the data needed for frontend to open Paddle checkout
   */
  public getCheckoutConfig(request: {
    priceId: string;
    userId: string;
    userEmail: string;
    productId: string;
    planName: string;
    successUrl: string;
  }): {
    clientToken: string;
    priceId: string;
    customData: Record<string, string>;
    customerEmail: string;
    successUrl: string;
  } {
    return {
      clientToken: this.config.clientToken,
      priceId: request.priceId,
      customData: {
        user_id: request.userId,
        product_id: request.productId,
        plan_name: request.planName,
      },
      customerEmail: request.userEmail,
      successUrl: request.successUrl,
    };
  }

  /**
   * Verify webhook signature from Paddle
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      console.warn('⚠️ Paddle webhook secret not configured');
      return false;
    }

    try {
      // Paddle uses ts;h1= format for signature
      const parts = signature.split(';');
      const timestampPart = parts.find(p => p.startsWith('ts='));
      const signaturePart = parts.find(p => p.startsWith('h1='));

      if (!timestampPart || !signaturePart) {
        return false;
      }

      const timestamp = timestampPart.split('=')[1];
      const expectedSignature = signaturePart.split('=')[1];

      // Create signed payload
      const signedPayload = `${timestamp}:${payload}`;

      // Calculate HMAC
      const hmac = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return hmac === expectedSignature;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Parse webhook event from Paddle
   */
  public parseWebhookEvent(body: any): PaddleWebhookEvent | null {
    try {
      return {
        event_id: body.event_id,
        event_type: body.event_type,
        occurred_at: body.occurred_at,
        notification_id: body.notification_id,
        data: body.data,
      };
    } catch (error) {
      console.error('❌ Failed to parse Paddle webhook:', error);
      return null;
    }
  }

  /**
   * Get subscription details
   */
  public async getSubscription(subscriptionId: string): Promise<PaddleSubscription | null> {
    try {
      const response = await this.apiRequest<{ data: any }>(`/subscriptions/${subscriptionId}`);
      return this.mapSubscription(response.data);
    } catch (error) {
      console.error('❌ Failed to get Paddle subscription:', error);
      return null;
    }
  }

  /**
   * Cancel a subscription
   */
  public async cancelSubscription(subscriptionId: string, effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'): Promise<boolean> {
    try {
      await this.apiRequest(`/subscriptions/${subscriptionId}/cancel`, 'POST', {
        effective_from: effectiveFrom,
      });
      console.log(`✅ Paddle subscription canceled: ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cancel Paddle subscription:', error);
      return false;
    }
  }

  /**
   * Pause a subscription
   */
  public async pauseSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.apiRequest(`/subscriptions/${subscriptionId}/pause`, 'POST');
      console.log(`✅ Paddle subscription paused: ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to pause Paddle subscription:', error);
      return false;
    }
  }

  /**
   * Resume a paused subscription
   */
  public async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.apiRequest(`/subscriptions/${subscriptionId}/resume`, 'POST', {
        effective_from: 'immediately',
      });
      console.log(`✅ Paddle subscription resumed: ${subscriptionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to resume Paddle subscription:', error);
      return false;
    }
  }

  /**
   * Map Paddle subscription response to our format
   */
  private mapSubscription(data: any): PaddleSubscription {
    return {
      id: data.id,
      status: data.status,
      customerId: data.customer_id,
      addressId: data.address_id,
      businessId: data.business_id,
      currencyCode: data.currency_code,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      startedAt: data.started_at,
      firstBilledAt: data.first_billed_at,
      nextBilledAt: data.next_billed_at,
      pausedAt: data.paused_at,
      canceledAt: data.canceled_at,
      currentBillingPeriod: data.current_billing_period ? {
        startsAt: data.current_billing_period.starts_at,
        endsAt: data.current_billing_period.ends_at,
      } : undefined,
      billingCycle: {
        interval: data.billing_cycle.interval,
        frequency: data.billing_cycle.frequency,
      },
      items: data.items?.map((item: any) => ({
        priceId: item.price.id,
        quantity: item.quantity,
        price: {
          id: item.price.id,
          productId: item.price.product_id,
          unitPrice: {
            amount: item.price.unit_price.amount,
            currencyCode: item.price.unit_price.currency_code,
          },
        },
      })) || [],
      customData: data.custom_data,
    };
  }

  /**
   * Check if Paddle is configured with real credentials
   */
  public isConfigured(): boolean {
    const apiKey = this.config.apiKey;
    const clientToken = this.config.clientToken;

    // Check if keys exist and are not placeholder values
    const hasApiKey = apiKey && apiKey.length > 10 && !apiKey.endsWith('...');
    const hasClientToken = clientToken && clientToken.length > 10 && !clientToken.endsWith('...');

    return !!(hasApiKey && hasClientToken);
  }

  /**
   * Get Paddle client token for frontend
   */
  public getClientToken(): string {
    return this.config.clientToken;
  }

  /**
   * Get environment
   */
  public getEnvironment(): 'sandbox' | 'production' {
    return this.config.environment;
  }

  /**
   * Get all supported countries (Paddle supports 200+ countries)
   * For our use case, we focus on Balkan countries
   */
  public getSupportedCountries(): string[] {
    // Paddle supports all these countries
    return ['GR', 'HR', 'BG', 'RO', 'SI', 'RS', 'AL', 'BA', 'MK', 'ME', 'XK'];
  }
}

// Export singleton instance
export const paddleService = new PaddleService();
export default paddleService;
