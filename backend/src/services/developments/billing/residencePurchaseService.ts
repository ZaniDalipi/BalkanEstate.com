/**
 * Buying Residence Passes and extra buildings. While online payment is off,
 * a purchase completes only with a discount code that covers it in full (and
 * names a residence product), or as an admin grant; anything else gets 503
 * PAYMENT_NOT_CONFIGURED. Every path ends in `applyPurchase`, which writes the
 * ledger entry and recomputes the residence's billing.
 */
import crypto from 'crypto';
import mongoose from 'mongoose';
import DiscountCode from '../../../models/DiscountCode';
import Product from '../../../models/Product';
import ResidencePurchase, { type IResidencePurchase } from '../../../models/ResidencePurchase';
import type { IDevelopment } from '../../../models/Development';
import {
  MAX_EXTRA_BUILDINGS_PER_PURCHASE,
  RESIDENCE_FALLBACK_PRICES,
  RESIDENCE_PRODUCTS,
  RESIDENCE_PURCHASE_KINDS,
  type ResidencePurchaseKind,
  type ResidencePurchaseProvider,
} from '../../../config/residenceBilling';
import { ValidationError } from '../developmentService';
import { BillingError } from './billingErrors';
import { couponReason } from './couponReason';
import { ownerPlan } from './ownerPlan';
import { accessFor, recomputeBilling } from './residenceBillingService';
import { residenceTerms } from './residenceTerms';
import { passPeriod, quote, type PriceQuote } from './residencePlan';

const productIdFor = (kind: ResidencePurchaseKind) =>
  kind === 'pass' ? RESIDENCE_PRODUCTS.pass : RESIDENCE_PRODUCTS.extraBuilding;

/** List price from the admin-editable Product, else the configured fallback. */
export async function listPrice(kind: ResidencePurchaseKind): Promise<number> {
  const product = await Product.findOne({ productId: productIdFor(kind), isActive: true }).select('price').lean();
  if (product && typeof product.price === 'number' && product.price >= 0) return product.price;
  return kind === 'pass' ? RESIDENCE_FALLBACK_PRICES.pass : RESIDENCE_FALLBACK_PRICES.extraBuilding;
}

export async function quoteFor(dev: IDevelopment, kind: ResidencePurchaseKind, quantity: number): Promise<PriceQuote> {
  const [price, plan] = await Promise.all([listPrice(kind), ownerPlan(dev.ownerId)]);
  return quote(kind, quantity, price, plan.premium);
}

/** The order's validated kind and quantity (a pass is always bought one at a time). */
export function parseOrder(body: { kind?: unknown; quantity?: unknown }): { kind: ResidencePurchaseKind; quantity: number } {
  const kind = body.kind as ResidencePurchaseKind;
  if (!RESIDENCE_PURCHASE_KINDS.includes(kind)) throw new ValidationError('kind must be "pass" or "extra_building"', { code: 'FIELD_INVALID', field: 'kind' });
  const quantity = kind === 'pass' ? 1 : Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_EXTRA_BUILDINGS_PER_PURCHASE) {
    throw new ValidationError(`quantity must be a whole number from 1 to ${MAX_EXTRA_BUILDINGS_PER_PURCHASE}`, {
      code: 'FIELD_RANGE',
      field: 'quantity',
      params: { min: 1, max: MAX_EXTRA_BUILDINGS_PER_PURCHASE },
    });
  }
  return { kind, quantity };
}

/** End of the period extra buildings are bought for: the current pass or plan. */
async function extraPeriodEnd(dev: IDevelopment, now: Date): Promise<Date> {
  const access = await accessFor(dev, now);
  if (access.state === 'active' && dev.billing.paidUntil) return dev.billing.paidUntil;
  if (access.state === 'agency' && dev.billing.agencyUntil) return dev.billing.agencyUntil;
  if (access.state === 'included' && dev.billing.includedUntil) return dev.billing.includedUntil;
  throw new BillingError('PASS_REQUIRED', 'Extra buildings are added to a Residence Pass. Buy the pass first.');
}

interface ApplyInput {
  kind: ResidencePurchaseKind;
  quantity: number;
  provider: ResidencePurchaseProvider;
  actorId: mongoose.Types.ObjectId | string;
  amount: number;
  listPrice: number;
  /** Pass length; defaults to the standard pass. */
  months?: number;
  couponCode?: string;
  orderId?: string;
  note?: string;
}

export async function applyPurchase(dev: IDevelopment, input: ApplyInput, now = new Date()): Promise<IResidencePurchase> {
  const months = input.months ?? (await residenceTerms()).passMonths;
  const period =
    input.kind === 'pass'
      ? passPeriod(dev.billing.paidUntil, now, months * input.quantity)
      : { start: now, end: await extraPeriodEnd(dev, now) };
  const purchase = await ResidencePurchase.create({
    developmentId: dev._id,
    ownerId: dev.ownerId,
    actorId: input.actorId,
    kind: input.kind,
    quantity: input.quantity,
    amount: input.amount,
    listPrice: input.listPrice,
    status: 'completed',
    provider: input.provider,
    couponCode: input.couponCode,
    periodStart: period.start,
    periodEnd: period.end,
    orderId: input.orderId ?? `res_${crypto.randomUUID()}`,
    note: input.note,
  });
  await recomputeBilling(dev._id as mongoose.Types.ObjectId, now);
  return purchase;
}

/** Owner checkout. Without online payment, only a code that covers the whole price completes it. */
export async function checkout(
  dev: IDevelopment,
  actorId: mongoose.Types.ObjectId | string,
  body: { kind?: unknown; quantity?: unknown; couponCode?: unknown },
  now = new Date()
): Promise<IResidencePurchase> {
  const { kind, quantity } = parseOrder(body);
  if (kind === 'extra_building') await extraPeriodEnd(dev, now); // fail fast before touching the coupon
  const price = await quoteFor(dev, kind, quantity);
  const code = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : '';
  if (!code) {
    throw new BillingError('PAYMENT_NOT_CONFIGURED', 'Online payment is coming soon. Enter a code to unlock it now.', { amount: price.amount }, 503);
  }
  const discount = await DiscountCode.findOne({ code });
  const productId = productIdFor(kind);
  const valid = discount?.isValid(String(actorId), productId, price.amount);
  // Residence codes must name a residence product: general subscription codes don't apply.
  if (!discount || !valid?.valid || !discount.applicablePlans?.includes(productId)) {
    throw new BillingError('COUPON_INVALID', valid?.reason ?? 'This code is not valid for residences.', discount ? couponReason(valid?.valid ? undefined : valid?.reason, discount.minPurchaseAmount) : { reason: 'unknown' }, 400);
  }
  const remaining = Math.round((price.amount - discount.calculateDiscount(price.amount)) * 100) / 100;
  if (remaining > 0) {
    throw new BillingError('PAYMENT_NOT_CONFIGURED', 'Online payment is coming soon. This code does not cover the full price.', { amount: remaining }, 503);
  }
  // Claim the code atomically so two requests can't spend a single-use code twice.
  const actor = new mongoose.Types.ObjectId(String(actorId));
  const claimed = await DiscountCode.findOneAndUpdate(
    { _id: discount._id, usedBy: { $ne: actor }, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
    { $inc: { usedCount: 1 }, $push: { usedBy: actor } }
  );
  if (!claimed) throw new BillingError('COUPON_INVALID', 'This code has already been used.', { reason: 'usedUp' }, 400);
  try {
    return await applyPurchase(dev, { kind, quantity, provider: 'coupon', actorId, amount: 0, listPrice: price.listPrice, couponCode: code }, now);
  } catch (error) {
    await DiscountCode.updateOne({ _id: discount._id }, { $inc: { usedCount: -1 }, $pull: { usedBy: actor } });
    throw error;
  }
}

/** Admin grant: months of pass and/or extra buildings, free, with a note for the audit log. */
export async function grant(
  dev: IDevelopment,
  adminId: mongoose.Types.ObjectId | string,
  body: { months?: unknown; extraBuildings?: unknown; note?: unknown },
  now = new Date()
): Promise<IResidencePurchase[]> {
  const months = body.months === undefined ? 0 : Number(body.months);
  const extra = body.extraBuildings === undefined ? 0 : Number(body.extraBuildings);
  if (!Number.isInteger(months) || months < 0 || months > 120) {
    throw new ValidationError('months must be a whole number from 0 to 120', { code: 'FIELD_RANGE', field: 'months', params: { min: 1, max: 120 } });
  }
  if (!Number.isInteger(extra) || extra < 0 || extra > MAX_EXTRA_BUILDINGS_PER_PURCHASE) {
    throw new ValidationError(`extraBuildings must be a whole number from 0 to ${MAX_EXTRA_BUILDINGS_PER_PURCHASE}`, {
      code: 'FIELD_RANGE',
      field: 'extraBuildings',
      params: { min: 0, max: MAX_EXTRA_BUILDINGS_PER_PURCHASE },
    });
  }
  if (months === 0 && extra === 0) throw new ValidationError('grant at least one month or one building', { code: 'GRANT_EMPTY', field: 'months' });
  const note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;
  const out: IResidencePurchase[] = [];
  let current = dev;
  if (months > 0) {
    out.push(await applyPurchase(current, { kind: 'pass', quantity: 1, months, provider: 'admin', actorId: adminId, amount: 0, listPrice: 0, note }, now));
    current = (await recomputeBilling(dev._id as mongoose.Types.ObjectId, now)) ?? dev;
  }
  if (extra > 0) {
    out.push(await applyPurchase(current, { kind: 'extra_building', quantity: extra, provider: 'admin', actorId: adminId, amount: 0, listPrice: 0, note }, now));
  }
  return out;
}
