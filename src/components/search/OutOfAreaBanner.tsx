import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPinIcon, XCircleIcon } from '@/constants';
import { validateSearchQuery } from '@/shared/utils/validation';
import type { OutOfAreaKind } from '@/src/features/search/outOfArea';

interface OutOfAreaBannerProps {
  /** Which rule chose the listings shown below the banner. */
  kind: OutOfAreaKind;
  /** The text that was typed, if any. */
  query: string;
  /** True when the typed text matched no listing at all. */
  isQueryUnmatched: boolean;
  /** Where the first listing below the banner is. */
  location: string | null;
  onResetFilters?: () => void;
}

/**
 * Shown above the list on every search page (buy, rent, villas) when the
 * searched area — map view or drawn area — holds no listing. It says so in
 * plain words, then introduces what is listed below it: premium and nearby
 * promoted listings, or, when none qualify, the nearest listings.
 */
const OutOfAreaBanner: React.FC<OutOfAreaBannerProps> = ({
  kind,
  query,
  isQueryUnmatched,
  location,
  onResetFilters,
}) => {
  const { t } = useTranslation(['search']);
  // The query is echoed back to the user — keep it clean and bounded.
  const shownQuery = validateSearchQuery(query).sanitized;

  const title = isQueryUnmatched && shownQuery
    ? t('search:outOfArea.titleQuery', {
        query: shownQuery,
        defaultValue: 'No properties in “{{query}}” right now',
      })
    : t('search:outOfArea.title', { defaultValue: 'No properties in this area right now' });

  const body = kind === 'promoted'
    ? location
      ? t('search:outOfArea.showingPromotedIn', {
          location,
          defaultValue: 'Meanwhile, here are premium and highlighted listings from elsewhere — the nearest is in {{location}}.',
        })
      : t('search:outOfArea.showingPromoted', {
          defaultValue: 'Meanwhile, here are premium and highlighted listings from elsewhere.',
        })
    : location
      ? t('search:outOfArea.showingNearestIn', {
          location,
          defaultValue: 'Meanwhile, here are the nearest listings, in {{location}}.',
        })
      : t('search:outOfArea.nothingPromoted', {
          defaultValue: 'Try zooming out, moving the map or resetting your filters.',
        });

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="out-of-area-banner"
      className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
    >
      <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-snug text-neutral-800 break-words">{title}</p>
        <p className="text-[11px] leading-snug text-neutral-600">{body}</p>
      </div>
      {kind === 'nearest' && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="-my-1 -mr-1 inline-flex flex-shrink-0 items-center gap-1 self-center rounded-md px-2 py-1.5 text-[11px] font-semibold text-primary hover:underline touch-manipulation"
        >
          <XCircleIcon className="h-3.5 w-3.5" />
          {t('search:filters.resetFilters', 'Reset Filters')}
        </button>
      )}
    </div>
  );
};

export default OutOfAreaBanner;
