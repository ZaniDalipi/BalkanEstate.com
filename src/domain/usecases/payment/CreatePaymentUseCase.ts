// Use Case: Create Payment
// Single responsibility: Create a payment intent

import { IPaymentRepository, PaymentIntentData, PaymentIntent } from '../../repositories/IPaymentRepository';

export class CreatePaymentUseCase {
  constructor(private paymentRepository: IPaymentRepository) {}

  async execute(data: PaymentIntentData): Promise<PaymentIntent> {
    // Business logic validation
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (!data.currency) {
      throw new Error('Currency is required');
    }

    if (!data.description) {
      throw new Error('Payment description is required');
    }

    // Validate amount is not too large (prevent fraud)
    if (data.amount > 1000000) {
      throw new Error('Payment amount exceeds maximum allowed');
    }

    // Delegate to repository
    return await this.paymentRepository.createPaymentIntent(data);
  }
}
