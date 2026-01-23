/**
 * LemonSqueezy Service
 *
 * Handles payment processing via LemonSqueezy.
 * LemonSqueezy acts as a Merchant of Record (MoR) handling:
 * - Payment processing
 * - VAT/tax compliance
 * - Subscription lifecycle
 * - Chargebacks and refunds
 */

import crypto from 'crypto';

// LemonSqueezy API base URL
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

export interface LemonSqueezyCheckoutParams {
  variantId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  productId: string;
  planName: string;
  planInterval: 'month' | 'year' | 'one_time';
  successUrl: string;
  cancelUrl?: string;
  customData?: Record<string, string>; // Additional custom data for promotions, etc.
}

export interface LemonSqueezyCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  checkoutId?: string;
  error?: string;
}

export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    custom_data?: {
      user_id?: string;
      product_id?: string;
      plan_name?: string;
      plan_interval?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: any;
    relationships?: any;
  };
}

class LemonSqueezyService {
  private apiKey: string;
  private storeId: string;
  private webhookSecret: string;
  private isTestMode: boolean;

  constructor() {
    this.apiKey = process.env.LEMONSQUEEZY_API_KEY || '';
    this.storeId = process.env.LEMONSQUEEZY_STORE_ID || '';
    this.webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
    this.isTestMode = process.env.LEMONSQUEEZY_TEST_MODE === 'true';

    if (this.apiKey) {
      console.log('[LemonSqueezy] Service initialized', {
        storeId: this.storeId,
        testMode: this.isTestMode,
      });
    }
  }

  /**
   * Check if LemonSqueezy is configured
   */
  public isConfigured(): boolean {
    return !!(this.apiKey && this.storeId);
  }

  /**
   * Get the store ID
   */
  public getStoreId(): string {
    return this.storeId;
  }

  /**
   * Check if running in test mode
   */
  public isTest(): boolean {
    return this.isTestMode;
  }

  /**
   * Make an API request to LemonSqueezy
   */
  private async apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const url = `${LEMONSQUEEZY_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `LemonSqueezy API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a checkout session
   */
  public async createCheckout(params: LemonSqueezyCheckoutParams): Promise<LemonSqueezyCheckoutResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'LemonSqueezy is not configured. Please set API key and store ID.',
        };
      }

      const checkoutData = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: params.userEmail,
              name: params.userName,
              custom: {
                user_id: params.userId,
                product_id: params.productId,
                plan_name: params.planName,
                plan_interval: params.planInterval,
                ...(params.customData || {}), // Additional custom data for promotions, etc.
              },
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true,
              desc: true,
              discount: true,
              dark: false,
              subscription_preview: true,
              button_color: '#2563eb', // Blue color matching BalkanEstate
            },
            product_options: {
              enabled_variants: [parseInt(params.variantId)],
              redirect_url: params.successUrl,
            },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: params.variantId,
              },
            },
          },
        },
      };

      const response = await this.apiRequest<any>('/checkouts', 'POST', checkoutData);

      return {
        success: true,
        checkoutUrl: response.data?.attributes?.url,
        checkoutId: response.data?.id,
      };
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to create checkout:', error);
      return {
        success: false,
        error: error.message || 'Failed to create checkout',
      };
    }
  }

  /**
   * Verify webhook signature
   * PRODUCTION: Signature verification is mandatory for security
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!this.webhookSecret) {
      if (isProduction) {
        console.error('[LemonSqueezy] SECURITY: Webhook secret not configured in production - rejecting request');
        return false;
      }
      console.warn('[LemonSqueezy] Webhook secret not configured, skipping verification (dev mode only)');
      return true; // Skip verification only in development
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = hmac.update(payload).digest('hex');
      const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));

      if (!isValid) {
        console.error('[LemonSqueezy] Webhook signature mismatch');
      }

      return isValid;
    } catch (error) {
      console.error('[LemonSqueezy] Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Check if webhook secret is configured
   */
  public hasWebhookSecret(): boolean {
    return !!this.webhookSecret;
  }

  /**
   * Parse webhook event
   */
  public parseWebhookEvent(body: any): LemonSqueezyWebhookEvent | null {
    try {
      if (!body || !body.meta || !body.data) {
        return null;
      }

      return {
        meta: body.meta,
        data: body.data,
      };
    } catch (error) {
      console.error('[LemonSqueezy] Failed to parse webhook event:', error);
      return null;
    }
  }

  /**
   * Get subscription details
   */
  public async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await this.apiRequest<any>(`/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to get subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  public async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.apiRequest<any>(`/subscriptions/${subscriptionId}`, 'DELETE');
      return true;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to cancel subscription:', error);
      return false;
    }
  }

  /**
   * Resume a subscription
   */
  public async resumeSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await this.apiRequest<any>(`/subscriptions/${subscriptionId}`, 'PATCH', {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled: false,
          },
        },
      });
      return true;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to resume subscription:', error);
      return false;
    }
  }

  /**
   * Update subscription (change plan)
   */
  public async updateSubscription(
    subscriptionId: string,
    newVariantId: string
  ): Promise<boolean> {
    try {
      await this.apiRequest<any>(`/subscriptions/${subscriptionId}`, 'PATCH', {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            variant_id: parseInt(newVariantId),
          },
        },
      });
      return true;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to update subscription:', error);
      return false;
    }
  }

  /**
   * Get customer portal URL
   */
  public async getCustomerPortalUrl(customerId: string): Promise<string | null> {
    try {
      const response = await this.apiRequest<any>(`/customers/${customerId}`);
      return response.data?.attributes?.urls?.customer_portal || null;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to get customer portal URL:', error);
      return null;
    }
  }

  /**
   * Get variant details (for price/product info)
   */
  public async getVariant(variantId: string): Promise<any> {
    try {
      const response = await this.apiRequest<any>(`/variants/${variantId}`);
      return response.data;
    } catch (error: any) {
      console.error('[LemonSqueezy] Failed to get variant:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const lemonSqueezyService = new LemonSqueezyService();
export default lemonSqueezyService;
