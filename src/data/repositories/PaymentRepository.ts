// Payment Repository Implementation
// Implements IPaymentRepository using PaymentApiClient

import {
  IPaymentRepository,
  PaymentIntentData,
  SubscriptionIntentData,
  PaymentIntent,
  Subscription,
  DiscountCode,
} from '../../domain/repositories/IPaymentRepository';
import { paymentApiClient } from '../api/PaymentApiClient';

export class PaymentRepository implements IPaymentRepository {
  async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntent> {
    const response = await paymentApiClient.createPaymentIntent(data);
    return {
      id: response.id,
      clientSecret: response.clientSecret,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
    };
  }

  async createSubscriptionIntent(data: SubscriptionIntentData): Promise<PaymentIntent> {
    const response = await paymentApiClient.createSubscriptionIntent(data);
    return {
      id: response.id,
      clientSecret: response.clientSecret,
      amount: response.amount,
      currency: response.currency,
      status: response.status,
    };
  }

  async getSubscription(userId: string): Promise<Subscription | null> {
    try {
      const response = await paymentApiClient.getSubscription();
      if (!response.subscription) return null;

      return {
        id: response.subscription.id,
        userId: response.subscription.userId,
        planName: response.subscription.planName,
        status: response.subscription.status,
        currentPeriodEnd: response.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: response.subscription.cancelAtPeriodEnd,
      };
    } catch (error) {
      return null;
    }
  }

  async cancelSubscription(userId: string): Promise<void> {
    await paymentApiClient.cancelSubscription();
  }

  async validateDiscountCode(code: string): Promise<DiscountCode | null> {
    try {
      const response = await paymentApiClient.validateDiscountCode(code);
      if (!response.discount) return null;

      return {
        code: response.discount.code,
        percentOff: response.discount.percentOff,
        validUntil: response.discount.validUntil,
        maxUses: response.discount.maxUses,
        usedCount: response.discount.usedCount,
      };
    } catch (error) {
      return null;
    }
  }

  async applyDiscountCode(userId: string, code: string): Promise<DiscountCode> {
    const response = await paymentApiClient.applyDiscountCode(code);
    return {
      code: response.discount.code,
      percentOff: response.discount.percentOff,
      validUntil: response.discount.validUntil,
      maxUses: response.discount.maxUses,
      usedCount: response.discount.usedCount,
    };
  }

  async getPaymentHistory(userId: string): Promise<any[]> {
    const response = await paymentApiClient.getPaymentHistory();
    return response.payments || [];
  }
}

export const paymentRepository = new PaymentRepository();
