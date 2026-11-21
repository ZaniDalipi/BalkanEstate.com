/**
 * Turning a 100%-off code into a subscription.
 *
 * The code is claimed atomically before the plan is granted, so two requests
 * can't spend one use twice, and handed back if granting fails. Codes are
 * checked with DiscountCode.isValid, the same rules as everywhere else
 * (dates, usage limit, one use per person, the plans the code is for).
 */
import DiscountCode from '../../models/DiscountCode';
import Subscription from '../../models/Subscription';
import { grantPaidPeriod } from './grantPaidPeriod';
import { newOrderReference } from '../../utils/orderReference';
import { claimCodeUse, releaseCodeUse } from '../payments/discountCodeUse';
import { findOrderablePlan } from '../payments/paymentOrderService';
import { remainingAfterDiscount } from '../../utils/planPricing';

export type FreeSubscriptionErrorCode =
  | 'PLAN_REQUIRED'
  | 'CODE_REQUIRED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_ELIGIBLE'
  | 'ALREADY_SUBSCRIBED'
  | 'CODE_INVALID'
  | 'CODE_NOT_FREE'
  | 'CODE_USED_UP';

export interface FreeSubscriptionGrant {
  subscriptionId: string;
  expiresAt: Date;
  status: string;
  productId: string;
  productName: string;
  code: string;
}

export type FreeSubscriptionResult =
  | { ok: true; value: FreeSubscriptionGrant }
  | { ok: false; status: number; code: FreeSubscriptionErrorCode; message: string; remaining?: number };

const fail = (
  status: number,
  code: FreeSubscriptionErrorCode,
  message: string,
  extra: { remaining?: number } = {}
): FreeSubscriptionResult => ({ ok: false, status, code, message, ...extra });

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export async function redeemFreeSubscription(
  userId: string,
  input: { productId?: unknown; discountCode?: unknown }
): Promise<FreeSubscriptionResult> {
  const codeText = asText(input.discountCode).toUpperCase();
  if (!asText(input.productId)) return fail(400, 'PLAN_REQUIRED', 'Choose a plan first.');
  if (!codeText) return fail(400, 'CODE_REQUIRED', 'Enter a discount code.');

  const plan = await findOrderablePlan(input.productId);
  if (plan.ok === false) {
    const message = plan.code === 'PLAN_NOT_ELIGIBLE'
      ? 'A code cannot activate this item here. Contact our team and we will help you.'
      : plan.message;
    return fail(plan.status, plan.code as FreeSubscriptionErrorCode, message);
  }
  const product = plan.value;
  const productId = product.productId;

  const sameActivePlan = await Subscription.findOne({
    userId,
    productId,
    status: { $in: ['active', 'grace'] },
    expirationDate: { $gt: new Date() },
  });
  if (sameActivePlan) {
    return fail(409, 'ALREADY_SUBSCRIBED', 'You already have an active subscription for this plan.');
  }

  const code = await DiscountCode.findOne({ code: codeText });
  const check = code ? code.isValid(userId, productId, product.price) : { valid: false, reason: undefined };
  if (!code || !check.valid) {
    return fail(400, 'CODE_INVALID', check.reason ?? 'This code is not valid.');
  }

  const remaining = remainingAfterDiscount(product.price, code.calculateDiscount(product.price));
  if (remaining > 0) {
    return fail(
      400,
      'CODE_NOT_FREE',
      'This code lowers the price but does not make the plan free. Contact our team to pay the rest.',
      { remaining }
    );
  }

  if (!(await claimCodeUse(code._id, userId))) return fail(409, 'CODE_USED_UP', 'This code has already been used.');

  try {
    const result = await grantPaidPeriod({
      userId,
      productId,
      amount: 0,
      currency: product.currency || 'EUR',
      reference: newOrderReference('CP'),
      method: 'coupon',
      discountCode: code.code,
      originalAmount: product.price,
    });
    return {
      ok: true,
      value: {
        subscriptionId: String(result.subscription._id),
        expiresAt: result.expirationDate,
        status: result.subscription.status,
        productId,
        productName: product.name,
        code: code.code,
      },
    };
  } catch (error) {
    // Nothing was granted: give the use back.
    await releaseCodeUse(code, userId);
    throw error;
  }
}
