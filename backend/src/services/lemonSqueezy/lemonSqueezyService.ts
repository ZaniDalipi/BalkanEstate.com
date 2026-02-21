/**
 * LemonSqueezy Payment Service
 *
 * Primary Merchant of Record (MoR) for BalkanEstate.
 * Handles checkout creation, subscription management, and customer lookup.
 * LemonSqueezy acts as the legal seller — handles card processing,
 * Google Pay, Apple Pay, VAT/tax compliance, and chargebacks.
 *
 * @see https://docs.lemonsqueezy.com/api
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { paymentLogger } from '../../utils/logger';
import type {
  LemonSqueezyConfig,
  CreateCheckoutRequest,
  CheckoutResponse,
  CheckoutCustomData,
  SubscriptionResponse,
  PlanVariantMapping,
} from './types';

const LEMON_SQUEEZY_API_BASE = 'https://api.lemonsqueezy.com/v1';

class LemonSqueezyService {
  private config: LemonSqueezyConfig;
  private client: AxiosInstance;
  private planMappings: PlanVariantMapping[] = [];

  constructor() {
    this.config = {
      apiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
      storeId: process.env.LEMON_SQUEEZY_STORE_ID || '',
      webhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '',
      variantIds: {
        buyerProMonthly: process.env.LEMON_SQUEEZY_BUYER_PRO_VARIANT_ID || '',
        proMonthly: process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID || '',
        proYearly: process.env.LEMON_SQUEEZY_PRO_YEARLY_VARIANT_ID || '',
        enterprise: process.env.LEMON_SQUEEZY_ENTERPRISE_VARIANT_ID || '',
      },
    };

    this.client = axios.create({
      baseURL: LEMON_SQUEEZY_API_BASE,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      timeout: 15000,
    });

    this.initializePlanMappings();
  }

  private initializePlanMappings(): void {
    this.planMappings = [
      {
        planName: 'buyer_pro_monthly',
        planInterval: 'month',
        variantId: this.config.variantIds.buyerProMonthly,
        productId: 'buyer_monthly',
      },
      {
        planName: 'pro_monthly',
        planInterval: 'month',
        variantId: this.config.variantIds.proMonthly,
        productId: 'seller_pro_monthly',
      },
      {
        planName: 'pro_yearly',
        planInterval: 'year',
        variantId: this.config.variantIds.proYearly,
        productId: 'seller_pro_yearly',
      },
      {
        planName: 'enterprise',
        planInterval: 'year',
        variantId: this.config.variantIds.enterprise,
        productId: 'agency_yearly',
      },
    ];
  }

  /**
   * Check if the service is properly configured
   */
  public isConfigured(): boolean {
    return !!(
      this.config.apiKey &&
      this.config.storeId &&
      this.config.webhookSecret
    );
  }

  /**
   * Get variant ID for a plan
   */
  public getVariantIdForPlan(planName: string, planInterval?: string): string | null {
    const mapping = this.planMappings.find(m => {
      if (m.planName === planName) return true;
      if (planInterval && m.planName.includes(planName) && m.planInterval === planInterval) return true;
      return false;
    });
    return mapping?.variantId || null;
  }

  /**
   * Get internal product ID from a LemonSqueezy variant ID
   */
  public getProductIdForVariant(variantId: string): string | null {
    const mapping = this.planMappings.find(m => m.variantId === variantId);
    return mapping?.productId || null;
  }

  /**
   * Get plan mapping from variant ID
   */
  public getPlanMappingForVariant(variantId: string): PlanVariantMapping | null {
    return this.planMappings.find(m => m.variantId === variantId) || null;
  }

  /**
   * Create a checkout session
   * Returns a URL to redirect the user to LemonSqueezy's hosted checkout
   */
  public async createCheckout(params: {
    email: string;
    name?: string;
    userId: string;
    planName: string;
    planInterval: 'month' | 'year';
    countryCode: string;
    productId?: string;
    successUrl: string;
    cancelUrl?: string;
  }): Promise<{
    success: boolean;
    checkoutUrl?: string;
    checkoutId?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'LemonSqueezy is not configured. Set LEMON_SQUEEZY_API_KEY, LEMON_SQUEEZY_STORE_ID, and variant IDs.',
      };
    }

    const variantId = this.getVariantIdForPlan(params.planName, params.planInterval);
    if (!variantId) {
      return {
        success: false,
        error: `No LemonSqueezy variant configured for plan: ${params.planName}`,
      };
    }

    try {
      const customData: CheckoutCustomData = {
        user_id: params.userId,
        plan_name: params.planName,
        plan_interval: params.planInterval,
        country_code: params.countryCode,
        product_id: params.productId,
      };

      const requestBody: CreateCheckoutRequest = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: params.email,
              name: params.name,
              custom: customData,
            },
            checkout_options: {
              dark: false,
              logo: true,
              button_color: '#2563EB',
            },
            product_options: {
              redirect_url: params.successUrl,
              receipt_link_url: params.successUrl,
              receipt_button_text: 'Return to BalkanEstate',
              receipt_thank_you_note: 'Thank you for subscribing to BalkanEstate!',
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: this.config.storeId },
            },
            variant: {
              data: { type: 'variants', id: variantId },
            },
          },
        },
      };

      const response = await this.client.post<CheckoutResponse>(
        '/checkouts',
        requestBody
      );

      const checkoutUrl = response.data.data.attributes.url;
      const checkoutId = response.data.data.id;

      paymentLogger.info(`LemonSqueezy checkout created: ${checkoutId} for user ${params.userId}`);

      return {
        success: true,
        checkoutUrl,
        checkoutId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response
        ? `LemonSqueezy API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`
        : `LemonSqueezy request failed: ${axiosError.message}`;

      paymentLogger.error(errorMessage);

      return {
        success: false,
        error: 'Failed to create checkout session. Please try again.',
      };
    }
  }

  /**
   * Get a subscription by its LemonSqueezy ID
   */
  public async getSubscription(subscriptionId: string): Promise<SubscriptionResponse | null> {
    try {
      const response = await this.client.get<SubscriptionResponse>(
        `/subscriptions/${subscriptionId}`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      paymentLogger.error(`Failed to get LemonSqueezy subscription ${subscriptionId}: ${axiosError.message}`);
      return null;
    }
  }

  /**
   * Cancel a subscription (at end of billing period)
   */
  public async cancelSubscription(subscriptionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.client.delete(`/subscriptions/${subscriptionId}`);

      paymentLogger.info(`LemonSqueezy subscription ${subscriptionId} cancelled`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      paymentLogger.error(`Failed to cancel LemonSqueezy subscription ${subscriptionId}: ${axiosError.message}`);
      return {
        success: false,
        error: 'Failed to cancel subscription with payment provider.',
      };
    }
  }

  /**
   * Resume a cancelled subscription (if still within billing period)
   */
  public async resumeSubscription(subscriptionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.client.patch(`/subscriptions/${subscriptionId}`, {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled: false,
          },
        },
      });

      paymentLogger.info(`LemonSqueezy subscription ${subscriptionId} resumed`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      paymentLogger.error(`Failed to resume LemonSqueezy subscription ${subscriptionId}: ${axiosError.message}`);
      return {
        success: false,
        error: 'Failed to resume subscription with payment provider.',
      };
    }
  }

  /**
   * Pause a subscription
   */
  public async pauseSubscription(subscriptionId: string, resumesAt?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const attributes: Record<string, unknown> = {
        pause: {
          mode: 'void',
          ...(resumesAt && { resumes_at: resumesAt }),
        },
      };

      await this.client.patch(`/subscriptions/${subscriptionId}`, {
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes,
        },
      });

      paymentLogger.info(`LemonSqueezy subscription ${subscriptionId} paused`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      paymentLogger.error(`Failed to pause LemonSqueezy subscription ${subscriptionId}: ${axiosError.message}`);
      return {
        success: false,
        error: 'Failed to pause subscription with payment provider.',
      };
    }
  }

  /**
   * Get the customer portal URL for a customer
   */
  public async getCustomerPortalUrl(customerId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data?.data?.attributes?.urls?.customer_portal || null;
    } catch (error) {
      const axiosError = error as AxiosError;
      paymentLogger.error(`Failed to get customer portal URL: ${axiosError.message}`);
      return null;
    }
  }

  /**
   * Get the update payment method URL for a subscription
   */
  public async getUpdatePaymentUrl(subscriptionId: string): Promise<string | null> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      return subscription?.data?.attributes?.urls?.update_payment_method || null;
    } catch {
      return null;
    }
  }

  /**
   * Get webhook secret for signature verification
   */
  public getWebhookSecret(): string {
    return this.config.webhookSecret;
  }

  /**
   * Get the store ID
   */
  public getStoreId(): string {
    return this.config.storeId;
  }
}

// Export singleton
export const lemonSqueezyService = new LemonSqueezyService();
export default lemonSqueezyService;
