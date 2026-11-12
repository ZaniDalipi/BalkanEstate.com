import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CoverageField, CoverageItem } from '../../api/listingSourceApi';

const LABELS: Record<CoverageField, string> = {
  title: 'Title', price: 'Price', location: 'City / address', photos: 'Photos', bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms', area: 'Area (m²)', mapPosition: 'Map position', propertyType: 'Property type', listingType: 'Sale or rent',
};

interface FeedCoverageListProps {
  coverage: CoverageItem[];
  /** Opens the feed format guide. */
  onShowFormat: () => void;
}

/** Which important fields we found in the feed's first listing, and what to do about missing ones. */
const FeedCoverageList: React.FC<FeedCoverageListProps> = ({ coverage, onShowFormat }) => {
  const { t } = useTranslation(['listingFeeds']);
  const label = (f: CoverageField) => t(`listingFeeds:coverage.fields.${f}`, { defaultValue: LABELS[f] });
  const missingRequired = coverage.filter((c) => c.required && !c.found);

  return (
    <section aria-labelledby="feed-coverage-title" className="rounded-xl border border-gray-200 p-4 space-y-3">
      <h3 id="feed-coverage-title" className="text-sm font-semibold text-gray-800">
        {t('listingFeeds:coverage.title', { defaultValue: 'What we found in your feed' })}
      </h3>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        {coverage.map((c) => (
          <li key={c.field} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className={c.found ? 'text-emerald-600' : c.required ? 'text-red-600' : 'text-gray-400'}>
              {c.found ? '✓' : '✗'}
            </span>
            <span className={c.found ? 'text-gray-800' : 'text-gray-500'}>{label(c.field)}</span>
            <span className="sr-only">
              {c.found ? t('listingFeeds:coverage.found', { defaultValue: 'found' }) : t('listingFeeds:coverage.missing', { defaultValue: 'missing' })}
            </span>
          </li>
        ))}
      </ul>
      {missingRequired.length > 0 && (
        <div role="alert" className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900 space-y-2">
          <p>
            {t('listingFeeds:coverage.requiredMissing', {
              fields: missingRequired.map((c) => label(c.field).toLowerCase()).join(', '),
              defaultValue: "Listings without {{fields}} can't be published. Add them to your feed, or fill them in when you review each listing.",
            })}
          </p>
          <button type="button" onClick={onShowFormat} className="min-h-[44px] font-semibold text-amber-900 underline">
            {t('listingFeeds:coverage.seeFormat', { defaultValue: 'See the feed format' })}
          </button>
        </div>
      )}
    </section>
  );
};

export default FeedCoverageList;
