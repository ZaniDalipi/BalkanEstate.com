/**
 * Seller display helpers
 *
 * A property card has exactly one line for "who is selling this", and until now
 * it rendered `seller.name` only when the field happened to be populated —
 * which meant every listing reached through a path that skips
 * `transformBackendProperty` (a shared URL, a page refresh, a stale
 * recently-viewed entry) silently collapsed to the bare "Private Seller" badge.
 *
 * These helpers resolve that line once, in one place, so every surface picks
 * the same fallback chain and no component re-implements it:
 *
 *   1. the seller's own name,
 *   2. the agency name (agents listing under an agency),
 *   3. the localised role label ("Agent" / "Private Seller").
 *
 * Labels are injected rather than translated here so the module stays pure and
 * testable — callers pass the already-translated strings from `useTranslation`.
 */

import type { Seller } from '@/types';
import { validateSellerDisplayName, sanitizeText } from './validation';

export interface SellerDisplayLabels {
  /** Localised label for an agent, e.g. t('property:seller.agent') */
  agent: string;
  /** Localised label for a private seller, e.g. t('property:seller.private') */
  private: string;
}

export interface SellerDisplayName {
  /** Never empty — falls back to the agency name, then the role label. */
  name: string;
  /** Where the name came from. `role` means we had nothing better to show. */
  source: 'seller' | 'agency' | 'role';
  /** True when `name` is a placeholder rather than a real person or agency. */
  isFallback: boolean;
}

/** A seller-ish object from any layer: API payloads are `any` until transformed. */
type MaybeSeller = Partial<Seller> | null | undefined;

/** Returns the trimmed, sanitised value only when it is safe to render as a name. */
function usableName(value: unknown): string | null {
  if (!validateSellerDisplayName(value).isValid) return null;
  return sanitizeText(value as string);
}

/**
 * Localised role label for a seller ("Agent" or "Private Seller").
 * Anything that is not explicitly an agent is treated as a private seller,
 * matching the badge logic the cards have always used.
 */
export function getSellerRoleLabel(seller: MaybeSeller, labels: SellerDisplayLabels): string {
  return seller?.type === 'agent' ? labels.agent : labels.private;
}

/**
 * Resolve the name to print for a seller, with the fallback chain above.
 * Never returns an empty string, so callers can render the line unconditionally
 * and keep the card's vertical rhythm stable.
 */
export function getSellerDisplayName(
  seller: MaybeSeller,
  labels: SellerDisplayLabels
): SellerDisplayName {
  const name = usableName(seller?.name);
  if (name) {
    return { name, source: 'seller', isFallback: false };
  }

  const agencyName = usableName(seller?.agencyName);
  if (agencyName) {
    return { name: agencyName, source: 'agency', isFallback: false };
  }

  return { name: getSellerRoleLabel(seller, labels), source: 'role', isFallback: true };
}

/**
 * True when a seller object carries a name worth persisting or preferring over
 * another copy of the same listing. Used by the recently-viewed cache so a
 * seller-less snapshot can never overwrite one that already has a name.
 */
export function hasSellerName(seller: MaybeSeller): boolean {
  return usableName(seller?.name) !== null || usableName(seller?.agencyName) !== null;
}
