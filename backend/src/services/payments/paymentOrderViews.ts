/**
 * Results and the shapes payment orders are sent to the browser in.
 */
import type { IPaymentOrder } from '../../models/PaymentOrder';

export type OrderErrorCode =
  | 'PLAN_REQUIRED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NOT_ELIGIBLE'
  | 'CODE_INVALID'
  | 'CODE_COVERS_PRICE'
  | 'CODE_USED_UP'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_CANCELLED'
  | 'ORDER_ALREADY_PAID'
  | 'AMOUNT_MISMATCH'
  | 'INVALID_AMOUNT'
  | 'INVALID_METHOD'
  | 'INVALID_DATE'
  | 'REASON_REQUIRED'
  | 'USER_NOT_FOUND';

export type OrderResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; code: OrderErrorCode; message: string; details?: Record<string, unknown> };

export const orderFail = (
  status: number,
  code: OrderErrorCode,
  message: string,
  details?: Record<string, unknown>
): { ok: false; status: number; code: OrderErrorCode; message: string; details?: Record<string, unknown> } => ({
  ok: false,
  status,
  code,
  message,
  ...(details ? { details } : {}),
});

/** What the customer sees of their own order. */
export interface CustomerOrderView {
  reference: string;
  status: IPaymentOrder['status'];
  productId: string;
  productName: string;
  billingPeriod?: string;
  listAmountCents: number;
  discountCents: number;
  amountCents: number;
  currency: string;
  discountCode?: string;
  createdAt: Date;
  paidAt?: Date;
  cancelledAt?: Date;
}

export const customerOrderView = (order: IPaymentOrder): CustomerOrderView => ({
  reference: order.reference,
  status: order.status,
  productId: order.productId,
  productName: order.productName,
  billingPeriod: order.billingPeriod,
  listAmountCents: order.listAmountCents,
  discountCents: order.discountCents,
  amountCents: order.amountCents,
  currency: order.currency,
  discountCode: order.discountCode,
  createdAt: order.createdAt,
  paidAt: order.paidAt,
  cancelledAt: order.cancelledAt,
});

/** What the team sees in the admin panel. */
export interface AdminOrderView extends CustomerOrderView {
  userId: string;
  userEmail: string;
  userName?: string;
  source: IPaymentOrder['source'];
  method?: IPaymentOrder['method'];
  paidAmountCents?: number;
  confirmedBy?: string;
  note?: string;
  cancelReason?: string;
  subscriptionId?: string;
}

export const adminOrderView = (order: IPaymentOrder): AdminOrderView => ({
  ...customerOrderView(order),
  userId: String(order.userId),
  userEmail: order.userEmail,
  userName: order.userName,
  source: order.source,
  method: order.method,
  paidAmountCents: order.paidAmountCents,
  confirmedBy: order.confirmedBy ? String(order.confirmedBy) : undefined,
  note: order.note,
  cancelReason: order.cancelReason,
  subscriptionId: order.subscriptionId ? String(order.subscriptionId) : undefined,
});
