/**
 * Plan orders: a plan requested by a customer and paid by arrangement with
 * the team (backend: models/PaymentOrder.ts). Amounts are whole cents.
 */
export type PlanOrderStatus = 'requested' | 'paid' | 'cancelled' | 'mismatch';

export interface PlanOrder {
  reference: string;
  status: PlanOrderStatus;
  productId: string;
  productName: string;
  billingPeriod?: string;
  listAmountCents: number;
  discountCents: number;
  amountCents: number;
  currency: string;
  discountCode?: string;
  createdAt: string;
  paidAt?: string;
  cancelledAt?: string;
}

export interface BankTransferDetails {
  accountHolder: string;
  iban: string;
  bic?: string;
  bankName?: string;
}

/** How to pay: the team contact, and the bank account when one is configured. */
export interface PaymentInstructionsInfo {
  contactEmail: string;
  bankTransfer: BankTransferDetails | null;
}

export interface RequestPlanResult {
  order: PlanOrder;
  /** An open request for this plan already existed and is returned instead. */
  existing: boolean;
  instructions: PaymentInstructionsInfo;
}

export interface MyPlanOrders {
  orders: PlanOrder[];
  instructions: PaymentInstructionsInfo;
}

/** What the team sees in the admin panel. */
export type PaymentOrderMethod = 'bank_transfer' | 'cash' | 'card_terminal' | 'other' | 'paysera' | 'free_grant';

export interface AdminPlanOrder extends PlanOrder {
  userId: string;
  userEmail: string;
  userName?: string;
  source: 'customer' | 'admin';
  method?: PaymentOrderMethod;
  paidAmountCents?: number;
  confirmedBy?: string;
  note?: string;
  cancelReason?: string;
  subscriptionId?: string;
}
