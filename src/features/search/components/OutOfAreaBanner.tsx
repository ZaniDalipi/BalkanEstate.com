import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPinIcon, XCircleIcon } from '@/constants';
import { validateSearchQuery } from '@/shared/utils/validation';

interface OutOfAreaBannerProps {
  /** The text that was typed, if any. */
  query: string;
  /** True when the typed text matched no listing at all. */
  isQueryUnmatched: boolean;
  /** How many promoted listings from elsewhere are listed under the banner. */
  promotedCount: number;
  /** Where the first of those listings is. */
  location: string | null;
  onResetFilters: () => void;
}

/**
 * Shown above the list when the searched area (map view or drawn area) holds
 * no listing. It says so in plain words, then either introduces the premium
 * and highlighted listings from elsewhere shown below it, or — when there are
 * none — stands in for the list with a way out.
 */
const OutOfAreaBanner: React.FC<OutOfAreaBannerProps> = ({
  query,
  isQueryUnmatched,
  promotedCount,
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

  const body = promotedCount > 0
    ? location
      ? t('search:outOfArea.showingPromotedIn', {
          location,
          defaultValue: 'Meanwhile, here are premium and highlighted listings from elsewhere — the nearest is in {{location}}.',
        })
      : t('search:outOfArea.showingPromoted', {
          defaultValue: 'Meanwhile, here are premium and highlighted listings from elsewhere.',
        })
    : t('search:outOfArea.nothingPromoted', {
        defaultValue: 'Try zooming out, moving the map or resetting your filters.',
      });

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="out-of-area-banner"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
    >
      <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-800 break-words">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-600">{body}</p>
        {promotedCount === 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark touch-manipulation"
          >
            <XCircleIcon className="h-4 w-4" />
            {t('search:filters.resetFilters', 'Reset Filters')}
          </button>
        )}
      </div>
    </div>
  );
};

export default OutOfAreaBanner;
