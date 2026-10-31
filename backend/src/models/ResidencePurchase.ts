import mongoose, { Document, Schema } from 'mongoose';
import { encodeRefsOnJSON } from '../utils/encodeRefsOnJSON';
import {
  RESIDENCE_PURCHASE_KINDS,
  RESIDENCE_PURCHASE_PROVIDERS,
  RESIDENCE_PURCHASE_STATUSES,
  type ResidencePurchaseKind,
  type ResidencePurchaseProvider,
  type ResidencePurchaseStatus,
} from '../config/residenceBilling';

/**
 * One Residence Pass or extra-building purchase: the ledger a residence's
 * billing state is recomputed from. A pass covers [periodStart, periodEnd);
 * renewals start where the previous pass ends, so paying early is never lost.
 * Extra buildings are valid until the end of the period they were bought for.
 */
export interface IResidencePurchase extends Document {
  developmentId: mongoose.Types.ObjectId;
  /** The residence owner at purchase time (who pays). */
  ownerId: mongoose.Types.ObjectId;
  /** Who made the purchase (the owner, or an admin for grants). */
  actorId: mongoose.Types.ObjectId;
  kind: ResidencePurchaseKind;
  quantity: number;
  /** Amount charged after discounts, EUR. */
  amount: number;
  listPrice: number;
  currency: 'EUR';
  status: ResidencePurchaseStatus;
  provider: ResidencePurchaseProvider;
  couponCode?: string;
  periodStart: Date;
  periodEnd: Date;
  /** Provider order id (Paysera) or a generated id; unique. */
  orderId: string;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResidencePurchaseSchema = new Schema<IResidencePurchase>(
  {
    developmentId: { type: Schema.Types.ObjectId, ref: 'Development', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: RESIDENCE_PURCHASE_KINDS, required: true },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    listPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['EUR'], default: 'EUR' },
    status: { type: String, enum: RESIDENCE_PURCHASE_STATUSES, required: true, default: 'pending' },
    provider: { type: String, enum: RESIDENCE_PURCHASE_PROVIDERS, required: true },
    couponCode: { type: String, trim: true, uppercase: true, maxlength: 64 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    orderId: { type: String, required: true, unique: true },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

ResidencePurchaseSchema.index({ developmentId: 1, status: 1, kind: 1, periodEnd: -1 });

encodeRefsOnJSON(ResidencePurchaseSchema, ['developmentId', 'ownerId', 'actorId']);

export default mongoose.model<IResidencePurchase>('ResidencePurchase', ResidencePurchaseSchema);
