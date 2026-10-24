/**
 * Number formats for residences — the same as the rest of the app, so a price
 * on an apartment card reads exactly like one on a listing card:
 *   price  → "136.000 €"   (utils/currency.formatPrice: de-DE, whole euros)
 *   area   → "82 m²"       (as listing cards show `sqft`)
 *   coords → "41.327500"   (6 decimals, as the listing location picker shows)
 */
const APP_NUMBER_LOCALE = 'de-DE';

/** A price in the app's format; falls back to "136.000 XYZ" if Intl rejects the currency. */
export const formatPrice = (amount?: number | null, currency = 'EUR'): string => {
  if (amount === undefined || amount === null) return '';
  try {
    return new Intl.NumberFormat(APP_NUMBER_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${formatNumber(Math.round(amount))} ${currency}`;
  }
};

/** A plain count or amount with the app's grouping, e.g. "1.250". */
export const formatNumber = (value: number): string => value.toLocaleString(APP_NUMBER_LOCALE);

/** Area in m², e.g. "82 m²" or "82,5 m²". */
export const formatArea = (value?: number | null): string => {
  if (value === undefined || value === null) return '';
  return `${value.toLocaleString(APP_NUMBER_LOCALE, { maximumFractionDigits: 1 })} m²`;
};

/** Number of decimals the app shows and stores for map coordinates. */
export const COORDINATE_DECIMALS = 6;

/** A coordinate as the app shows it ("41.327500"); empty for no value. */
export const formatCoordinate = (value?: number | null): string =>
  value === undefined || value === null || !Number.isFinite(value) ? '' : value.toFixed(COORDINATE_DECIMALS);
