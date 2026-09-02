/**
 * Estimated apartment prices from a neighbourhood's €/m².
 *
 * Kept out of the component because it is arithmetic over ingested API data,
 * and because the guard matters: `avgPricePerSqm` arrives from the market-data
 * API, where a missing or zero value is possible. Multiplying that out renders
 * a grid of "€0" — a confident-looking wrong number — so an unusable input
 * yields no estimates at all and the panel says nothing instead.
 */

import { validatePrice, validateArea } from '@/src/shared/utils/validation';

export interface ApartmentTypeSpec {
  /** Display name, e.g. "2-Bedroom". */
  type: string;
  /** Typical floor area in m². */
  size: number;
}

export interface ApartmentPriceEstimate extends ApartmentTypeSpec {
  price: number;
}

/** Typical Balkan apartment sizes, used for the per-type estimates. */
export const APARTMENT_TYPES: readonly ApartmentTypeSpec[] = [
  { type: 'Studio', size: 38 },
  { type: '1-Bedroom', size: 58 },
  { type: '2-Bedroom', size: 82 },
  { type: '3-Bedroom', size: 115 },
];

/** Upper bound for a plausible €/m² in this market; beyond it the feed is wrong. */
const MAX_PRICE_PER_SQM = 50_000;

/**
 * Whether a €/m² figure can carry an estimate at all.
 * Delegates to the shared validator rather than re-deriving the rules here.
 */
export function isUsablePricePerSqm(avgPricePerSqm: unknown): avgPricePerSqm is number {
  if (typeof avgPricePerSqm !== 'number' || !Number.isFinite(avgPricePerSqm)) return false;
  return validatePrice(avgPricePerSqm, { min: 1, max: MAX_PRICE_PER_SQM }).isValid;
}

/**
 * Price estimates per apartment type, or an empty list when the €/m² is
 * unusable. Types with an implausible size are dropped individually, so one
 * bad spec cannot take the whole grid down.
 */
export function buildApartmentPriceEstimates(
  avgPricePerSqm: unknown,
  specs: readonly ApartmentTypeSpec[] = APARTMENT_TYPES,
): ApartmentPriceEstimate[] {
  if (!isUsablePricePerSqm(avgPricePerSqm)) return [];

  return specs
    .filter(spec => validateArea(spec.size).isValid)
    .map(spec => ({ ...spec, price: Math.round(avgPricePerSqm * spec.size) }))
    // A rounded estimate of zero says nothing; drop it rather than show "€0".
    .filter(estimate => estimate.price > 0 && Number.isFinite(estimate.price));
}

/** "~38 m²" — the caption under each estimate. */
export function formatTypicalSize(size: number): string {
  return `~${Math.round(size).toLocaleString()} m²`;
}
