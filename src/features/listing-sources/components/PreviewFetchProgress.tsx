import React from 'react';
import { useTranslation } from 'react-i18next';
import type { FetchingPreview } from '../context/ListingIngestProgressContext';
import { previewProgress } from '../utils/previewProgress';

interface PreviewFetchProgressProps {
  /** The running fetch; its counts are refreshed every couple of seconds. */
  fetching?: Pick<FetchingPreview, 'found' | 'detailsFetched'>;
  /** Thin bar under a card (dock) or a rounded one inside a banner (feed row). */
  variant?: 'banner' | 'edge';
}

/**
 * How far a feed fetch is: "Listings found so far: 48" while the catalogue
 * pages are walked, then "Reading listing details: 10 of 48" with a bar that
 * fills up as each listing's page is read.
 */
const PreviewFetchProgress: React.FC<PreviewFetchProgressProps> = ({ fetching, variant = 'banner' }) => {
  const p = previewProgress(fetching);
  const label = usePreviewFetchLabel(fetching, 'row');

  const track = variant === 'edge' ? 'h-0.5 bg-gray-100' : 'mt-1.5 h-1.5 rounded-full bg-violet-100';
  const fill = variant === 'edge' ? 'bg-blue-500' : 'rounded-full bg-violet-500';
  const sweep = variant === 'edge' ? 'via-blue-500' : 'via-violet-500';

  return (
    <div className="min-w-0 w-full">
      {variant === 'banner' && (
        <span className="block text-xs text-violet-900 font-medium tabular-nums truncate" role="status">
          {label}
        </span>
      )}
      <div
        className={`${track} overflow-hidden relative`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.phase === 'reading' ? p.percent : undefined}
      >
        {p.phase === 'reading' ? (
          <div className={`absolute inset-y-0 left-0 ${fill} transition-[width] duration-500`} style={{ width: `${p.percent}%` }} />
        ) : (
          <div
            className={`absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent ${sweep} to-transparent motion-reduce:hidden`}
            style={{ animation: 'dock-indet 1.4s ease-in-out infinite' }}
          />
        )}
      </div>
    </div>
  );
};

export default PreviewFetchProgress;

/**
 * The progress words: "Listings found so far: 48", "Reading listing
 * details: 10 of 48", or before anything is found the row's / dock's own text.
 */
export const usePreviewFetchLabel = (
  fetching: Pick<FetchingPreview, 'found' | 'detailsFetched'> | undefined,
  where: 'row' | 'dock'
): string => {
  const { t } = useTranslation(['listingFeeds']);
  const p = previewProgress(fetching);
  if (p.phase === 'starting') {
    return where === 'row'
      ? t('listingFeeds:preview.fetching', { defaultValue: 'Fetching listings from source…' })
      : t('listingFeeds:dockFetchingPreview', { defaultValue: 'Fetching listings…' });
  }
  if (p.phase === 'finding') {
    return t('listingFeeds:preview.progressFound', { count: p.found, defaultValue: 'Listings found so far: {{count}}' });
  }
  return t('listingFeeds:preview.progressReading', {
    read: p.read,
    found: p.found,
    defaultValue: 'Reading listing details: {{read}} of {{found}}',
  });
};
