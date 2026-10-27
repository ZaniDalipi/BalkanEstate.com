/**
 * The Residence Pass numbers admins can change in the pricing screen:
 * buildings included per residence and the pass length (Residence Pass
 * product), and free residences per subscription year (agency plan). Falls
 * back to config/residenceBilling.ts when a product or field is missing.
 * Cached briefly; a product update clears the cache.
 */
import Product from '../../../models/Product';
import {
  AGENCY_PRODUCT_ID,
  AGENCY_RESIDENCES_PER_YEAR,
  RESIDENCE_INCLUDED_BUILDINGS,
  RESIDENCE_PASS_MONTHS,
  RESIDENCE_PRODUCTS,
} from '../../../config/residenceBilling';

export interface ResidenceTerms {
  includedBuildings: number;
  passMonths: number;
  residencesPerYear: number;
}

const TTL_MS = 60_000;
let cache: { at: number; value: ResidenceTerms } | null = null;

export const clearResidenceTermsCache = (): void => {
  cache = null;
};

/** Pass length in whole months from the product's duration in days (365 → 12). */
export const monthsFromDays = (days: number): number => Math.max(1, Math.round(days / 30.4));

export async function residenceTerms(): Promise<ResidenceTerms> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const [pass, agency] = await Promise.all([
    Product.findOne({ productId: RESIDENCE_PRODUCTS.pass }).select('includedBuildings durationDays').lean(),
    Product.findOne({ productId: AGENCY_PRODUCT_ID }).select('residencesPerYear').lean(),
  ]);
  const value: ResidenceTerms = {
    includedBuildings: pass?.includedBuildings && pass.includedBuildings >= 1 ? pass.includedBuildings : RESIDENCE_INCLUDED_BUILDINGS,
    passMonths: pass?.durationDays && pass.durationDays > 0 ? monthsFromDays(pass.durationDays) : RESIDENCE_PASS_MONTHS,
    residencesPerYear:
      typeof agency?.residencesPerYear === 'number' && agency.residencesPerYear >= 0 ? agency.residencesPerYear : AGENCY_RESIDENCES_PER_YEAR,
  };
  cache = { at: Date.now(), value };
  return value;
}
