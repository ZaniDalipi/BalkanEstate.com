// Payment API Client
// Handles all payment-related API calls

import { httpClient } from './httpClient';

export class PaymentApiClient {
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<any> {
    return await httpClient.post('/payments/create-intent', data, true);
  }

  async createSubscriptionIntent(data: {
    planName: string;
    planPrice: number;
    planInterval: 'month' | 'year';
    discountCode?: string;
  }): Promise<any> {
    return await httpClient.post('/payments/create-subscription', data, true);
  }

  async getSubscription(): Promise<any> {
    return await httpClient.get('/payments/subscription', true);
  }

  async cancelSubscription(): Promise<void> {
    await httpClient.post('/payments/cancel-subscription', undefined, true);
  }

  async validateDiscountCode(code: string): Promise<any> {
    return await httpClient.post('/payments/validate-discount', { code });
  }

  async applyDiscountCode(code: string): Promise<any> {
    return await httpClient.post('/payments/apply-discount', { code }, true);
  }

  async getPaymentHistory(): Promise<any> {
    return await httpClient.get('/payments/history', true);
  }
}

export const paymentApiClient = new PaymentApiClient();
