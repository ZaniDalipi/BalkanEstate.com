/**
 * The team's side of payment orders: see them, mark one paid when the money
 * arrives, cancel one, record a payment taken some other way, or give a plan
 * for free (with a reason).
 *
 * Marking paid grants the plan through grantPaidPeriod, with the order's
 * status change in the same transaction: an order is never "paid" without its
 * plan, nor the plan granted twice for one order.
 */
import PaymentOrder, { IPaymentOrder, PaymentOrderMethod, PaymentOrderStatus } from '../../models/PaymentOrder';
import Product from '../../models/Product';
import User from '../../models/User';
import { grantPaidPeriod, GrantError } from '../subscriptions/grantPaidPeriod';
import { isGrantablePlan } from '../../utils/grantablePlans';
import { toCents, toEuros } from '../../utils/planPricing';
import { newOrderReference, normalizeOrderReference } from '../../utils/orderReference';
import { parsePaymentConfirmation } from '../../utils/paymentConfirmation';
import { escapeRegex } from '../../utils/escapeRegex';
import { releaseCodeUse } from './discountCodeUse';
import { findOrderablePlan, isDuplicateKeyOn } from './paymentOrderService';
import { adminOrderView, AdminOrderView, orderFail, OrderResult } from './paymentOrderViews';
import { paymentLogger } from '../../utils/logger';

const STATUSES: readonly PaymentOrderStatus[] = ['requested', 'paid', 'cancelled', 'mismatch'];
const PAGE_SIZE = 25;
const MIN_REASON_LENGTH = 3;

class OrderStateChanged extends Error {}

export interface OrderListQuery {
  status?: unknown;
  q?: unknown;
  page?: unknown;
}

export async function listOrders(query: OrderListQuery): Promise<{ orders: AdminOrderView[]; total: number; page: number; pages: number }> {
  const filter: Record<string, unknown> = {};
  if (typeof query.status === 'string' && (STATUSES as readonly string[]).includes(query.status)) filter.status = query.status;
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ reference: normalizeOrderReference(q) }, { userEmail: pattern }, { userName: pattern }, { productName: pattern }];
  }
  const page = Math.max(1, Math.min(1000, Number(query.page) || 1));
  const [orders, total] = await Promise.all([
    PaymentOrder.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    PaymentOrder.countDocuments(filter),
  ]);
  return { orders: orders.map(adminOrderView), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** The plans an admin can record a payment for or grant. */
export async function listOrderablePlans() {
  const products = await Product.find({ isActive: true }).sort({ displayOrder: 1, price: 1 }).lean();
  return products
    .filter((p) => isGrantablePlan(p))
    .map((p) => ({ productId: p.productId, name: p.name, price: p.price, billingPeriod: p.billingPeriod, tier: p.tier }));
}

interface Settlement {
  paidCents: number;
  method: PaymentOrderMethod;
  paidAt: Date;
  note?: string;
}

export interface SettledOrder {
  order: AdminOrderView;
  alreadyPaid: boolean;
  expiresAt?: Date;
}

/** Grant the order's plan and mark it paid, together. */
async function settleOrder(order: IPaymentOrder, adminId: string, s: Settlement): Promise<OrderResult<SettledOrder>> {
  const paidFields = {
    status: 'paid' as const,
    method: s.method,
    paidAt: s.paidAt,
    paidAmountCents: s.paidCents,
    confirmedBy: adminId,
    ...(s.note ? { note: s.note } : {}),
  };
  try {
    const grant = await grantPaidPeriod({
      userId: String(order.userId),
      productId: order.productId,
      amount: toEuros(s.paidCents),
      currency: order.currency,
      reference: order.reference,
      method: s.method === 'free_grant' ? 'free_grant' : s.method,
      discountCode: order.discountCode,
      originalAmount: order.discountCents > 0 ? toEuros(order.listAmountCents) : undefined,
      note: s.note,
      grantedBy: adminId,
      paidAt: s.paidAt,
      alsoInTransaction: async (session, granted) => {
        const updated = await PaymentOrder.updateOne(
          { _id: order._id, status: 'requested' },
          { $set: { ...paidFields, subscriptionId: granted.subscriptionId, paymentRecordId: granted.paymentRecordId } },
          { session }
        );
        if (updated.modifiedCount !== 1) throw new OrderStateChanged();
      },
    });
    if (grant.alreadyGranted) {
      // Granted before but the order wasn't updated (an interrupted earlier attempt): bring it in line.
      await PaymentOrder.updateOne(
        { _id: order._id, status: 'requested' },
        { $set: { ...paidFields, subscriptionId: grant.subscription._id, paymentRecordId: grant.paymentRecord._id } }
      );
    }
    const fresh = await PaymentOrder.findById(order._id);
    paymentLogger.info(`💶 Order ${order.reference} settled by admin ${adminId} (${s.method}, ${s.paidCents} cents)`);
    return { ok: true, value: { order: adminOrderView(fresh ?? order), alreadyPaid: grant.alreadyGranted, expiresAt: grant.expirationDate } };
  } catch (error) {
    if (error instanceof OrderStateChanged) {
      const fresh = await PaymentOrder.findById(order._id);
      if (fresh?.status === 'paid') return { ok: true, value: { order: adminOrderView(fresh), alreadyPaid: true } };
      return orderFail(409, 'ORDER_CANCELLED', 'This order was cancelled meanwhile.');
    }
    if (error instanceof GrantError) {
      if (error.code === 'USER_NOT_FOUND') return orderFail(404, 'USER_NOT_FOUND', 'The customer account no longer exists.');
      if (error.code === 'PRODUCT_NOT_FOUND') return orderFail(404, 'PLAN_NOT_FOUND', 'This plan no longer exists.');
      return orderFail(400, 'PLAN_NOT_ELIGIBLE', 'This plan cannot be granted.');
    }
    throw error;
  }
}

/** Mark a customer's order paid with what was received. */
export async function markOrderPaid(
  referenceInput: string,
  adminId: string,
  body: Record<string, unknown>,
  now: Date = new Date()
): Promise<OrderResult<SettledOrder>> {
  const order = await PaymentOrder.findOne({ reference: normalizeOrderReference(referenceInput) });
  if (!order) return orderFail(404, 'ORDER_NOT_FOUND', 'No order with this reference.');
  if (order.status === 'paid') return { ok: true, value: { order: adminOrderView(order), alreadyPaid: true } };
  if (order.status !== 'requested') return orderFail(409, 'ORDER_CANCELLED', 'This order was cancelled and cannot be paid.');

  const parsed = parsePaymentConfirmation(body, now);
  if (parsed.ok === false) return orderFail(400, parsed.code, parsed.message, { field: parsed.field });
  const c = parsed.value;
  if (c.paidCents !== order.amountCents && !c.acceptDifferentAmount) {
    return orderFail(409, 'AMOUNT_MISMATCH', 'The amount received differs from the amount due. Confirm to accept it anyway.', {
      field: 'amount',
      amountDueCents: order.amountCents,
      paidAmountCents: c.paidCents,
    });
  }
  return settleOrder(order, adminId, { paidCents: c.paidCents, method: c.method, paidAt: c.paidAt, note: c.note });
}

/** Cancel an open order; a reserved discount code use is given back. */
export async function cancelOrder(
  referenceInput: string,
  adminId: string,
  reason: unknown
): Promise<OrderResult<{ order: AdminOrderView; alreadyCancelled: boolean }>> {
  const reference = normalizeOrderReference(referenceInput);
  const cancelReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  const cancelled = await PaymentOrder.findOneAndUpdate(
    { reference, status: 'requested' },
    { $set: { status: 'cancelled', cancelledAt: new Date(), cancelledBy: adminId, ...(cancelReason ? { cancelReason } : {}) } },
    { new: true }
  );
  if (!cancelled) {
    const order = await PaymentOrder.findOne({ reference });
    if (!order) return orderFail(404, 'ORDER_NOT_FOUND', 'No order with this reference.');
    if (order.status === 'cancelled') return { ok: true, value: { order: adminOrderView(order), alreadyCancelled: true } };
    return orderFail(409, 'ORDER_ALREADY_PAID', 'This order is already paid. Deactivate the plan instead.');
  }
  if (cancelled.discountCode) await releaseCodeUse({ code: cancelled.discountCode }, String(cancelled.userId));
  paymentLogger.info(`🚫 Order ${reference} cancelled by admin ${adminId}`);
  return { ok: true, value: { order: adminOrderView(cancelled), alreadyCancelled: false } };
}

/** The customer's open request for this plan, or a new admin-made order for it. */
async function openOrderFor(userIdInput: unknown, productIdInput: unknown): Promise<OrderResult<IPaymentOrder>> {
  const plan = await findOrderablePlan(productIdInput);
  if (plan.ok === false) return plan;
  const product = plan.value;
  const user = typeof userIdInput === 'string' && /^[a-f0-9]{24}$/i.test(userIdInput)
    ? await User.findById(userIdInput).select('email name')
    : null;
  if (!user) return orderFail(404, 'USER_NOT_FOUND', 'Choose an existing user.');

  const open = await PaymentOrder.findOne({ userId: user._id, productId: product.productId, status: 'requested' });
  if (open) return { ok: true, value: open };
  try {
    const listAmountCents = toCents(product.price);
    const order = await PaymentOrder.create({
      reference: newOrderReference('BE'),
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      productId: product.productId,
      productName: product.name,
      billingPeriod: product.billingPeriod,
      listAmountCents,
      discountCents: 0,
      amountCents: listAmountCents,
      currency: product.currency || 'EUR',
      status: 'requested',
      source: 'admin',
    });
    return { ok: true, value: order };
  } catch (error) {
    if (isDuplicateKeyOn(error, 'userId')) {
      const raced = await PaymentOrder.findOne({ userId: user._id, productId: product.productId, status: 'requested' });
      if (raced) return { ok: true, value: raced };
    }
    throw error;
  }
}

/** Record a payment taken outside a request (in person, by phone). Settles an open request for the same plan. */
export async function recordPayment(adminId: string, body: Record<string, unknown>, now: Date = new Date()): Promise<OrderResult<SettledOrder>> {
  const parsed = parsePaymentConfirmation(body, now);
  if (parsed.ok === false) return orderFail(400, parsed.code, parsed.message, { field: parsed.field });
  const opened = await openOrderFor(body.userId, body.productId);
  if (opened.ok === false) return opened;
  const c = parsed.value;
  return settleOrder(opened.value, adminId, { paidCents: c.paidCents, method: c.method, paidAt: c.paidAt, note: c.note });
}

/** Give a plan for free. A reason is required; it is kept on the order and the payment record. */
export async function freeGrant(adminId: string, body: Record<string, unknown>): Promise<OrderResult<SettledOrder>> {
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
  if (reason.length < MIN_REASON_LENGTH) {
    return orderFail(400, 'REASON_REQUIRED', 'Say why this plan is given for free.', { field: 'reason' });
  }
  const opened = await openOrderFor(body.userId, body.productId);
  if (opened.ok === false) return opened;
  return settleOrder(opened.value, adminId, { paidCents: 0, method: 'free_grant', paidAt: new Date(), note: reason });
}
