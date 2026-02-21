/**
 * LemonSqueezy API Types
 *
 * Type definitions for the LemonSqueezy REST API (JSON:API format).
 * Used by lemonSqueezyService.ts for type-safe API interactions.
 *
 * @see https://docs.lemonsqueezy.com/api
 */

// ====== Core JSON:API envelope ======

export interface JsonApiDocument<T> {
  data: T;
  meta?: Record<string, unknown>;
  jsonapi?: { version: string };
  links?: Record<string, string>;
}

export interface JsonApiResource<TType extends string, TAttributes> {
  type: TType;
  id: string;
  attributes: TAttributes;
  relationships?: Record<string, { data: { type: string; id: string } | null }>;
  links?: Record<string, string>;
}

// ====== Checkout ======

export interface CheckoutCustomData {
  user_id: string;
  plan_name: string;
  plan_interval: string;
  country_code: string;
  product_id?: string;
}

export interface CreateCheckoutAttributes {
  checkout_data: {
    email: string;
    name?: string;
    custom: CheckoutCustomData;
  };
  checkout_options?: {
    dark?: boolean;
    logo?: boolean;
    button_color?: string;
    embed?: boolean;
  };
  product_options?: {
    enabled_variants?: number[];
    redirect_url?: string;
    receipt_link_url?: string;
    receipt_button_text?: string;
    receipt_thank_you_note?: string;
  };
  expires_at?: string;
}

export interface CreateCheckoutRequest {
  data: {
    type: 'checkouts';
    attributes: CreateCheckoutAttributes;
    relationships: {
      store: { data: { type: 'stores'; id: string } };
      variant: { data: { type: 'variants'; id: string } };
    };
  };
}

export interface CheckoutAttributes {
  store_id: number;
  variant_id: number;
  url: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

export type CheckoutResource = JsonApiResource<'checkouts', CheckoutAttributes>;
export type CheckoutResponse = JsonApiDocument<CheckoutResource>;

// ====== Subscription ======

export interface SubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: LemonSqueezySubscriptionStatus;
  status_formatted: string;
  card_brand: string | null;
  card_last_four: string | null;
  pause: { mode: string; resumes_at: string } | null;
  cancelled: boolean;
  trial_ends_at: string | null;
  billing_anchor: number;
  first_subscription_item: {
    id: number;
    subscription_id: number;
    price_id: number;
    quantity: number;
    is_usage_based: boolean;
    created_at: string;
    updated_at: string;
  } | null;
  urls: {
    update_payment_method: string;
    customer_portal: string;
    customer_portal_update_subscription: string;
  };
  renews_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

export type LemonSqueezySubscriptionStatus =
  | 'on_trial'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'expired';

export type SubscriptionResource = JsonApiResource<'subscriptions', SubscriptionAttributes>;
export type SubscriptionResponse = JsonApiDocument<SubscriptionResource>;

// ====== Subscription Invoice (Payment) ======

export interface SubscriptionInvoiceAttributes {
  store_id: number;
  subscription_id: number;
  customer_id: number;
  user_name: string;
  user_email: string;
  billing_reason: string;
  card_brand: string | null;
  card_last_four: string | null;
  currency: string;
  currency_rate: string;
  status: 'pending' | 'paid' | 'void' | 'refunded';
  status_formatted: string;
  refunded: boolean;
  refunded_at: string | null;
  subtotal: number;
  discount_total: number;
  tax: number;
  total: number;
  subtotal_usd: number;
  discount_total_usd: number;
  tax_usd: number;
  total_usd: number;
  subtotal_formatted: string;
  discount_total_formatted: string;
  tax_formatted: string;
  total_formatted: string;
  urls: { invoice_url: string };
  created_at: string;
  updated_at: string;
  test_mode: boolean;
}

// ====== Customer ======

export interface CustomerAttributes {
  store_id: number;
  name: string;
  email: string;
  status: string;
  city: string | null;
  region: string | null;
  country: string;
  total_revenue_currency: number;
  mrr: number;
  status_formatted: string;
  country_formatted: string;
  urls: { customer_portal: string };
  created_at: string;
  updated_at: string;
}

// ====== Webhook Event ======

export type WebhookEventName =
  | 'order_created'
  | 'order_refunded'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled'
  | 'subscription_resumed'
  | 'subscription_expired'
  | 'subscription_paused'
  | 'subscription_unpaused'
  | 'subscription_payment_success'
  | 'subscription_payment_failed'
  | 'subscription_payment_recovered'
  | 'subscription_plan_changed';

export interface WebhookEvent<TAttributes = Record<string, unknown>> {
  meta: {
    event_name: WebhookEventName;
    custom_data?: CheckoutCustomData;
    test_mode: boolean;
  };
  data: {
    type: string;
    id: string;
    attributes: TAttributes;
    relationships?: Record<string, { data: { type: string; id: string } | null }>;
    links?: Record<string, string>;
  };
}

export type SubscriptionWebhookEvent = WebhookEvent<SubscriptionAttributes>;
export type InvoiceWebhookEvent = WebhookEvent<SubscriptionInvoiceAttributes>;

// ====== Config ======

export interface LemonSqueezyConfig {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
  variantIds: {
    buyerProMonthly: string;
    proMonthly: string;
    proYearly: string;
    enterprise: string;
  };
}

// ====== Plan Mapping ======

export interface PlanVariantMapping {
  planName: string;
  planInterval: 'month' | 'year';
  variantId: string;
  productId: string;
}
