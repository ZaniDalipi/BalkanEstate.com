/**
 * Residence Pass, as the dashboard sees it. Mirrors
 * backend/src/services/developments/billing/residenceBillingSummary.ts.
 */
export type ResidenceAccessState = 'none' | 'trial' | 'active' | 'included' | 'expired';
export type ResidencePurchaseKind = 'pass' | 'extra_building';
export type PublishBlockReason = 'PASS_REQUIRED' | 'TRIAL_IN_PROGRESS' | 'TRIAL_LIMIT';

export interface PriceQuote {
  listPrice: number;
  unitPrice: number;
  amount: number;
  discountPct: number;
}

export interface ResidenceBilling {
  state: ResidenceAccessState;
  publicNow: boolean;
  visibleUntil: string | null;
  daysLeft: number | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  paidUntil: string | null;
  includedUntil: string | null;
  buildings: { used: number; limit: number; included: number; extra: number };
  publish: { allowed: true; startsTrial: boolean } | { allowed: false; reason: PublishBlockReason };
  premium: boolean;
  prices: { currency: 'EUR'; pass: PriceQuote; extraBuilding: PriceQuote };
  terms: { trialDays: number; passMonths: number; includedBuildings: number };
  paymentsEnabled: boolean;
}

export interface ResidencePricing {
  currency: 'EUR';
  pass: number;
  extraBuilding: number;
  trialDays: number;
  passMonths: number;
  includedBuildings: number;
  includedByTier: Record<string, number>;
  premiumDiscountPct: number;
}

export interface ResidenceCheckoutPayload {
  kind: ResidencePurchaseKind;
  quantity?: number;
  couponCode?: string;
}
