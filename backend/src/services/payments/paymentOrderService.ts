/**
 * Customers requesting a plan.
 *
 * The price is worked out here from the product and an optional discount
 * code; the browser never sets it. A code's use is reserved with the request
 * and given back if the request is cancelled. Asking twice for the same plan
 * returns the open request instead of making a second one.
 */
import PaymentOrder, { IPaymentOrder } from '../../models/PaymentOrder';
import Product, { IProduct } from '../../models/Product';
import User from '../../models/User';
import DiscountCode, { IDiscountCode } from '../../models/DiscountCode';
import { isGrantablePlan } from '../../utils/grantablePlans';
import { toCents } from '../../utils/planPricing';
import { newOrderReference } from '../../utils/orderReference';
import { paymentInstructions, PaymentInstructions } from '../../config/manualPayment';
import { claimCodeUse, releaseCodeUse } from './discountCodeUse';
import { sendPaymentInstructionsEmail } from './paymentOrderEmails';
import { notifyAdmins } from '../adminNotificationService';
import { customerOrderView, CustomerOrderView, orderFail, OrderResult } from './paymentOrderViews';
import { paymentLogger } from '../../utils/logger';

const PRODUCT_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const isDuplicateKeyOn = (error: unknown, field: string): boolean => {
  const e = error as { code?: number; keyPattern?: Record<string, unknown>; message?: string } | null;
  return e?.code === 11000 && (Boolean(e.keyPattern?.[field]) || String(e.message ?? '').includes(field));
};

/** A plan someone may order or be granted: exists, is active, and is a recurring plan. */
export async function findOrderablePlan(productIdInput: unknown): Promise<OrderResult<IProduct>> {
  const productId = asText(productIdInput);
  if (!productId) return orderFail(400, 'PLAN_REQUIRED', 'Choose a plan first.');
  const product = PRODUCT_ID_PATTERN.test(productId) ? await Product.findOne({ productId, isActive: true }) : null;
  if (!product) return orderFail(404, 'PLAN_NOT_FOUND', 'This plan is not available. Contact our team and we will help you.');
  if (!isGrantablePlan(product)) {
    return orderFail(400, 'PLAN_NOT_ELIGIBLE', 'This item cannot be ordered here. Contact our team and we will help you.');
  }
  return { ok: true, value: product };
}

interface PricedPlan {
  discountCents: number;
  code?: IDiscountCode;
}

async function priceWithCode(product: IProduct, codeText: string, userId: string): Promise<OrderResult<PricedPlan>> {
  if (!codeText) return { ok: true, value: { discountCents: 0 } };
  const code = CODE_PATTERN.test(codeText) ? await DiscountCode.findOne({ code: codeText }) : null;
  const check = code ? code.isValid(userId, product.productId, product.price) : { valid: false, reason: undefined };
  if (!code || !check.valid) return orderFail(400, 'CODE_INVALID', check.reason ?? 'This code is not valid.');
  const discountCents = Math.min(toCents(product.price), toCents(code.calculateDiscount(product.price)));
  if (discountCents >= toCents(product.price)) {
    return orderFail(400, 'CODE_COVERS_PRICE', 'This code makes the plan free: activate it with the code instead.');
  }
  return { ok: true, value: { discountCents, code } };
}

/** Create the order under a new reference, trying again on the rare reference collision. */
async function createWithFreshReference(fields: Partial<IPaymentOrder>): Promise<IPaymentOrder> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await PaymentOrder.create({ ...fields, reference: newOrderReference('BE') });
    } catch (error) {
      if (attempt < 4 && isDuplicateKeyOn(error, 'reference')) continue;
      throw error;
    }
  }
}

export interface RequestedPlan {
  order: CustomerOrderView;
  /** True when an open request for this plan already existed and is returned instead. */
  existing: boolean;
  instructions: PaymentInstructions;
}

export async function requestPlanOrder(
  userId: string,
  input: { productId?: unknown; discountCode?: unknown }
): Promise<OrderResult<RequestedPlan>> {
  const plan = await findOrderablePlan(input.productId);
  if (plan.ok === false) return plan;
  const product = plan.value;
  const instructions = paymentInstructions();

  const user = await User.findById(userId).select('email name');
  if (!user) return orderFail(404, 'USER_NOT_FOUND', 'Your account was not found. Please sign in again.');

  const open = await PaymentOrder.findOne({ userId: user._id, productId: product.productId, status: 'requested' });
  if (open) return { ok: true, value: { order: customerOrderView(open), existing: true, instructions } };

  const priced = await priceWithCode(product, asText(input.discountCode).toUpperCase(), userId);
  if (priced.ok === false) return priced;
  const { code, discountCents } = priced.value;
  if (code && !(await claimCodeUse(code._id, userId))) {
    return orderFail(409, 'CODE_USED_UP', 'This code has already been used.');
  }

  const listAmountCents = toCents(product.price);
  let order: IPaymentOrder;
  try {
    order = await createWithFreshReference({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      productId: product.productId,
      productName: product.name,
      billingPeriod: product.billingPeriod,
      listAmountCents,
      discountCents,
      amountCents: listAmountCents - discountCents,
      currency: product.currency || 'EUR',
      ...(code ? { discountCode: code.code } : {}),
      status: 'requested',
      source: 'customer',
    });
  } catch (error) {
    if (code) await releaseCodeUse(code, userId);
    // The same request sent twice at once: return the one that got in.
    if (isDuplicateKeyOn(error, 'userId')) {
      const raced = await PaymentOrder.findOne({ userId: user._id, productId: product.productId, status: 'requested' });
      if (raced) return { ok: true, value: { order: customerOrderView(raced), existing: true, instructions } };
    }
    throw error;
  }

  sendPaymentInstructionsEmail(order, instructions).catch((error) =>
    paymentLogger.error(`⚠️ Payment instructions email failed for ${order.reference}:`, error)
  );
  notifyAdmins({
    kind: 'plan_requested',
    reference: order.reference,
    name: user.name || '',
    email: user.email,
    productName: order.productName,
    amountCents: order.amountCents,
    currency: order.currency,
  });
  paymentLogger.info(`🧾 Plan requested: ${order.reference} ${order.productId} for user ${userId}`);

  return { ok: true, value: { order: customerOrderView(order), existing: false, instructions } };
}

export async function listMyOrders(userId: string): Promise<{ orders: CustomerOrderView[]; instructions: PaymentInstructions }> {
  const orders = await PaymentOrder.find({ userId }).sort({ createdAt: -1 }).limit(20);
  return { orders: orders.map(customerOrderView), instructions: paymentInstructions() };
}
