import type { TFunction } from 'i18next';
import type { DraftFields } from '../api/importReviewApi';

/** Human-readable value of a draft field, for cards and change lists. */
export const formatDraftValue = (
  field: keyof DraftFields,
  fields: DraftFields,
  t: TFunction
): string => {
  const value = fields[field];
  if (value === null || value === undefined || value === '') return '—';
  switch (field) {
    case 'price': {
      if (!value) return fields.isNegotiable ? t('listingFeeds:review.priceOnRequest') : '—';
      const currency = fields.currency || 'EUR';
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value as number);
      } catch {
        return `${(value as number).toLocaleString()} ${currency}`;
      }
    }
    case 'sqft':
      return value ? `${value} m²` : '—';
    case 'listingType':
      return t(`listingFeeds:review.fields.${value as string}`);
    case 'propertyType':
      return t(`property:types.${value as string}`, { defaultValue: String(value) });
    case 'isNegotiable':
      return t(value ? 'listingFeeds:review.yes' : 'listingFeeds:review.no');
    case 'images':
      return String((value as string[]).length);
    case 'description': {
      const text = String(value);
      return text.length > 120 ? `${text.slice(0, 120)}…` : text;
    }
    default:
      return String(value);
  }
};
