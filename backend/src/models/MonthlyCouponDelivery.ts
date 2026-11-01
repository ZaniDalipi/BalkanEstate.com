import mongoose, { Document, Schema } from 'mongoose';

/**
 * `pro`    — a Pro subscriber's own monthly allocation (key = user id).
 * `agency` — an agency's shared monthly allocation (key = agency id); one
 *            delivery covers the owner email and the agent notifications.
 */
export type MonthlyCouponDeliveryKind = 'pro' | 'agency';

/**
 * Proof that a monthly coupon refresh + email went out for one recipient in
 * one month. The unique index on (period, kind, key) is the guard that keeps
 * the refresh at one email per agency / Pro user per month, even if the job
 * runs twice (two schedulers, several server instances, a manual re-run).
 */
export interface IMonthlyCouponDelivery extends Document {
  /** Calendar month in UTC, `YYYY-MM`. */
  period: string;
  kind: MonthlyCouponDeliveryKind;
  key: string;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyCouponDeliverySchema = new Schema<IMonthlyCouponDelivery>({
  period: { type: String, required: true },
  kind: { type: String, enum: ['pro', 'agency'], required: true },
  key: { type: String, required: true },
}, { timestamps: true });

MonthlyCouponDeliverySchema.index({ period: 1, kind: 1, key: 1 }, { unique: true });

const MonthlyCouponDelivery = mongoose.model<IMonthlyCouponDelivery>(
  'MonthlyCouponDelivery',
  MonthlyCouponDeliverySchema,
);

export default MonthlyCouponDelivery;
