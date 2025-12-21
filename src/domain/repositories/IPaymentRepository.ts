// Domain Repository Interface: IPaymentRepository
// Defines payment data operations contract

export interface PaymentIntentData {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionIntentData {
  planName: string;
  planPrice: number;
  planInterval: 'month' | 'year';
  userId: string;
  discountCode?: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planName: string;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface DiscountCode {
  code: string;
  percentOff: number;
  validUntil?: number;
  maxUses?: number;
  usedCount: number;
}

/**
 * Repository interface for payment operations
 */
export interface IPaymentRepository {
  /**
   * Create a payment intent for one-time payment
   */
  createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntent>;

  /**
   * Create a subscription intent
   */
  createSubscriptionIntent(data: SubscriptionIntentData): Promise<PaymentIntent>;

  /**
   * Get user's active subscription
   */
  getSubscription(userId: string): Promise<Subscription | null>;

  /**
   * Cancel subscription
   */
  cancelSubscription(userId: string): Promise<void>;

  /**
   * Validate discount code
   */
  validateDiscountCode(code: string): Promise<DiscountCode | null>;

  /**
   * Apply discount code to user
   */
  applyDiscountCode(userId: string, code: string): Promise<DiscountCode>;

  /**
   * Get payment history for user
   */
  getPaymentHistory(userId: string): Promise<any[]>;
}
