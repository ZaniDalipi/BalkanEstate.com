import type { PublicUnit } from '../types';
import { unitArea } from './unitFilters';

/**
 * Budget helper maths for the residence explorer: read what a buyer types as
 * a budget, compare each apartment's price per m² against a reference (the
 * city's average when we have it, otherwise this residence's own average) and
 * pick the homes that fit. Pure, so the popup stays a thin view over it.
 */

export const BUDGET_MIN = 10_000;
export const BUDGET_MAX = 50_000_000;
/** At least this far below the reference price per m² counts as a bargain. */
export const BARGAIN_THRESHOLD = 0.08;
/** With fewer priced homes than this, a residence's own average says too little. */
export const MIN_COMPARABLES = 4;
/** How far over budget a "stretch" suggestion may go. */
export const STRETCH = 0.1;

export type BudgetError = 'empty' | 'invalid' | 'tooLow' | 'tooHigh';
export type BudgetParse = { ok: true; value: number } | { ok: false; error: BudgetError };

const toAmount = (digits: string, suffix?: string): number => {
  if (suffix) {
    // "150k", "1,2m", "1.5m": one decimal mark allowed before the suffix.
    const d = digits.replace(/'/g, '').replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(d)) return NaN;
    return Number(d) * (suffix === 'k' ? 1_000 : 1_000_000);
  }
  // "150.000", "150,000", "150'000", "150000,50": grouping marks go, cents are dropped.
  const whole = digits.replace(/[.,]\d{1,2}$/, '');
  if (!/^\d{1,3}([.,']?\d{3})*$/.test(whole) && !/^\d+$/.test(whole)) return NaN;
  return Number(whole.replace(/[.,']/g, ''));
};

/** Parse a typed budget ("150.000 €", "150k", "1,2m") into whole euros. */
export function parseBudget(raw: string): BudgetParse {
  const s = raw.trim().toLowerCase().replace(/€|eur|euro|\s/g, '');
  if (!s) return { ok: false, error: 'empty' };
  const m = /^(\d[\d.,']*)(k|m)?$/.exec(s);
  const value = m ? Math.round(toAmount(m[1], m[2])) : NaN;
  if (!Number.isFinite(value)) return { ok: false, error: 'invalid' };
  if (value < BUDGET_MIN) return { ok: false, error: 'tooLow' };
  if (value > BUDGET_MAX) return { ok: false, error: 'tooHigh' };
  return { ok: true, value };
}

export interface PriceReference {
  /** 'location': the city's average for-sale price; 'residence': this residence's own homes. */
  kind: 'location' | 'residence';
  pricePerSqm: number;
  place?: string;
}

export interface BudgetPick {
  unit: PublicUnit;
  pricePerSqm: number | null;
  /** Whole percent below the reference (negative = above); null without a reference. */
  belowPct: number | null;
  bargain: boolean;
}

/** Price per m² as published, else worked out from the price and the best known area. */
export function unitPricePerSqm(u: PublicUnit): number | null {
  if (u.priceOnRequest || !u.price || u.price <= 0) return null;
  if (u.pricePerSqm && u.pricePerSqm > 0) return u.pricePerSqm;
  const area = unitArea(u);
  return area && area > 0 ? u.price / area : null;
}

/** On sale with a public price: the only homes the helper suggests. */
export const isBuyable = (u: PublicUnit): u is PublicUnit & { price: number } =>
  u.availability === 'available' && !u.priceOnRequest && typeof u.price === 'number' && u.price > 0;

/** The city's average when known, else this residence's average (with enough homes priced). */
export function pickReference(units: PublicUnit[], location?: { pricePerSqm?: number | null; place?: string }): PriceReference | null {
  if (location?.pricePerSqm && location.pricePerSqm > 0) {
    return { kind: 'location', pricePerSqm: location.pricePerSqm, place: location.place };
  }
  const priced = units.map(unitPricePerSqm).filter((v): v is number => v !== null);
  if (priced.length < MIN_COMPARABLES) return null;
  return { kind: 'residence', pricePerSqm: priced.reduce((a, b) => a + b, 0) / priced.length };
}

export function describePick(unit: PublicUnit, ref: PriceReference | null): BudgetPick {
  const pricePerSqm = unitPricePerSqm(unit);
  const belowPct = ref && pricePerSqm ? Math.round((1 - pricePerSqm / ref.pricePerSqm) * 100) : null;
  return { unit, pricePerSqm, belowPct, bargain: belowPct !== null && belowPct >= BARGAIN_THRESHOLD * 100 };
}

export interface BudgetResult {
  /** Within budget: bargains first, then the most home for the money. */
  matches: BudgetPick[];
  /** Just over budget (≤ 10%), offered when fewer than `limit` homes fit. */
  stretch: BudgetPick | null;
  /** Nothing fits: the most affordable home on sale, so the answer is never a dead end. */
  cheapest: BudgetPick | null;
}

export function matchBudget(units: PublicUnit[], budget: number, ref: PriceReference | null, limit = 3): BudgetResult {
  const buyable = units.filter(isBuyable).sort((a, b) => a.price - b.price);
  const matches = buyable
    .filter((u) => u.price <= budget)
    .map((u) => describePick(u, ref))
    .sort((a, b) => Number(b.bargain) - Number(a.bargain) || (b.unit.price ?? 0) - (a.unit.price ?? 0))
    .slice(0, limit);
  const over = buyable.find((u) => u.price > budget && u.price <= budget * (1 + STRETCH));
  const stretch = matches.length < limit && over ? describePick(over, ref) : null;
  const cheapest = matches.length === 0 && !stretch && buyable[0] ? describePick(buyable[0], ref) : null;
  return { matches, stretch, cheapest };
}

/** The teaser's home: the biggest bargain, else the most affordable home on sale. */
export function featuredPick(units: PublicUnit[], ref: PriceReference | null): BudgetPick | null {
  const picks = units.filter(isBuyable).map((u) => describePick(u, ref));
  const bargains = picks.filter((p) => p.bargain).sort((a, b) => (b.belowPct ?? 0) - (a.belowPct ?? 0));
  if (bargains[0]) return bargains[0];
  return picks.sort((a, b) => (a.unit.price ?? 0) - (b.unit.price ?? 0))[0] ?? null;
}
