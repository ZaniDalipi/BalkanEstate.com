import i18n from '@/src/i18n';

/**
 * Format a price with the active locale and the given currency (default EUR).
 * Whole numbers only — property prices don't show cents. Falls back to a plain
 * number string if Intl rejects the currency code.
 */
export const formatPrice = (amount?: number | null, currency = 'EUR'): string => {
  if (amount === undefined || amount === null) return '';
  const locale = i18n.language || 'en';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString(locale)} ${currency}`;
  }
};

/** Area in m² with the locale's grouping, e.g. "82 m²". */
export const formatArea = (value?: number | null): string => {
  if (value === undefined || value === null) return '';
  const locale = i18n.language || 'en';
  return `${value.toLocaleString(locale)} m²`;
};
