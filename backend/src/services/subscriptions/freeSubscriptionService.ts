/**
 * Turning a 100%-off code into a subscription.
 *
 * The code is claimed atomically before the plan is granted, so two requests
 * can't spend one use twice, and handed back if granting fails. Codes are
 * checked with DiscountCode.isValid, the same rules as everywhere else
 * (dates, usage limit, one use per person, the plans the code is for).
 */
import mongoose from 'mongoose';
import DiscountCode from '../../models/DiscountCode';
import Product from '../../models/Product';
import Subscription from '../../models/Subscription';
import { processSubscriptionPayment } from '../subscriptionPaymentService';
import { isCouponGrantablePlan, remainingAfterDiscount } from '../../utils/couponPlanRules';

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
  const productId = asText(input.productId);
  const codeText = asText(input.discountCode).toUpperCase();
  if (!productId) return fail(400, 'PLAN_REQUIRED', 'Choose a plan first.');
  if (!codeText) return fail(400, 'CODE_REQUIRED', 'Enter a discount code.');

  const product = await Product.findOne({ productId, isActive: true });
  if (!product) {
    return fail(404, 'PLAN_NOT_FOUND', 'This plan is not available. Contact our team and we will help you.');
  }
  if (!isCouponGrantablePlan(product)) {
    return fail(400, 'PLAN_NOT_ELIGIBLE', 'A code cannot activate this item here. Contact our team and we will help you.');
  }

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

  // Claim one use for this person, only while uses are left and they haven't used it.
  const actor = new mongoose.Types.ObjectId(userId);
  const claimed = await DiscountCode.findOneAndUpdate(
    { _id: code._id, isActive: true, usedBy: { $ne: actor }, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
    { $inc: { usedCount: 1 }, $push: { usedBy: actor } }
  );
  if (!claimed) return fail(409, 'CODE_USED_UP', 'This code has already been used.');

  try {
    const result = await processSubscriptionPayment({
      userId,
      productId,
      store: 'web',
      amount: 0,
      currency: product.currency || 'EUR',
      discountCode: code.code,
      originalAmount: product.price,
    });
    return {
      ok: true,
      value: {
        subscriptionId: String(result.subscription._id),
        expiresAt: result.subscription.expirationDate,
        status: result.subscription.status,
        productId,
        productName: product.name,
        code: code.code,
      },
    };
  } catch (error) {
    // Nothing was granted: give the use back.
    await DiscountCode.updateOne({ _id: code._id }, { $inc: { usedCount: -1 }, $pull: { usedBy: actor } });
    throw error;
  }
}
