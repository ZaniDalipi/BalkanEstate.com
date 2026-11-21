/**
 * Showing plan-order amounts and dates in the reader's language.
 */

/** 2500 EUR → "€25.00" (or "25,00 €" in a locale that writes it that way). */
export function formatOrderAmount(cents: number, currency = 'EUR', locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2 }).format(cents / 100);
  } catch {
    // An unknown currency code: fall back to the plain number.
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/** "20 Nov 2026" in the reader's language; empty for a missing or invalid date. */
export function formatOrderDate(iso: string | undefined, locale?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
