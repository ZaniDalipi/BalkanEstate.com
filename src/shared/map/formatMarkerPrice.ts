/**
 * The short price shown on a map marker pill.
 *
 * Kept compact for the pill but precise: one decimal for thousands
 * (€223,972 → "€223.9K") and two for millions (€1,249,000 → "€1.24M").
 * Digits are cut, never rounded up, so a marker never shows a higher
 * price than the listing asks.
 */

/** Drop the extra digits (no rounding up) and any trailing zeros. */
const truncate = (value: number, decimals: number): string => {
  const factor = 10 ** decimals;
  // The small epsilon keeps 1.15 * 100 = 114.999… from losing a cent.
  const cut = Math.floor(value * factor + 1e-9) / factor;
  return cut.toFixed(decimals).replace(/\.?0+$/, '');
};

export const formatMarkerPrice = (
  priceOrProperty: number | { price?: number; isNegotiable?: boolean }
): string => {
  // Negotiable / zero-price listings have no fixed price and must never render as €0.
  const isNegotiable = typeof priceOrProperty === 'object' && !!priceOrProperty.isNegotiable;
  const price = typeof priceOrProperty === 'number' ? priceOrProperty : (priceOrProperty.price ?? 0);
  if (isNegotiable || !price || price <= 0) {
    return 'Negotiable';
  }
  if (price >= 1_000_000) {
    return `€${truncate(price / 1_000_000, 2)}M`;
  }
  if (price >= 1_000) {
    return `€${truncate(price / 1_000, 1)}K`;
  }
  return `€${Math.floor(price)}`;
};
