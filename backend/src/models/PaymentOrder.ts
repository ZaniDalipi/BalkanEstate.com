import mongoose, { Document, Schema } from 'mongoose';

/**
 * A plan someone asked to buy and how it was paid.
 *
 * Today plans are paid by arrangement with the team: the customer requests a
 * plan and gets a reference and the amount; the team marks the order paid when
 * the money arrives, which grants the plan (services/subscriptions/grantPaidPeriod.ts).
 * An online payment provider, once switched on, settles the same orders.
 */
export type PaymentOrderStatus = 'requested' | 'paid' | 'cancelled' | 'mismatch';
export type PaymentOrderMethod = 'bank_transfer' | 'cash' | 'card_terminal' | 'other' | 'paysera' | 'free_grant';
export type PaymentOrderSource = 'customer' | 'admin';

export const MANUAL_PAYMENT_METHODS: readonly PaymentOrderMethod[] = ['bank_transfer', 'cash', 'card_terminal', 'other'];

export interface IPaymentOrder extends Document {
  reference: string;
  kind: 'subscription';
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userName?: string;
  productId: string;
  productName: string;
  billingPeriod?: string;
  /** Prices in whole cents. amount = list − discount. */
  listAmountCents: number;
  discountCents: number;
  amountCents: number;
  currency: string;
  discountCode?: string;
  status: PaymentOrderStatus;
  source: PaymentOrderSource;
  method?: PaymentOrderMethod;
  paidAt?: Date;
  paidAmountCents?: number;
  confirmedBy?: mongoose.Types.ObjectId;
  note?: string;
  cancelledAt?: Date;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelReason?: string;
  subscriptionId?: mongoose.Types.ObjectId;
  paymentRecordId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    reference: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['subscription'], default: 'subscription', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    userName: { type: String },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    billingPeriod: { type: String },
    listAmountCents: { type: Number, required: true, min: 0 },
    discountCents: { type: Number, default: 0, min: 0 },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'EUR', required: true },
    discountCode: { type: String },
    status: {
      type: String,
      enum: ['requested', 'paid', 'cancelled', 'mismatch'],
      default: 'requested',
      required: true,
    },
    source: { type: String, enum: ['customer', 'admin'], required: true },
    method: { type: String, enum: ['bank_transfer', 'cash', 'card_terminal', 'other', 'paysera', 'free_grant'] },
    paidAt: { type: Date },
    paidAmountCents: { type: Number, min: 0 },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 500 },
    cancelledAt: { type: Date },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, maxlength: 500 },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    paymentRecordId: { type: Schema.Types.ObjectId, ref: 'PaymentRecord' },
  },
  { timestamps: true }
);

PaymentOrderSchema.index({ status: 1, createdAt: -1 });
PaymentOrderSchema.index({ userId: 1, createdAt: -1 });
// One open request per person and plan: asking twice returns the same order.
PaymentOrderSchema.index(
  { userId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { status: 'requested' }, name: 'one_open_request_per_plan' }
);

export default mongoose.model<IPaymentOrder>('PaymentOrder', PaymentOrderSchema);
