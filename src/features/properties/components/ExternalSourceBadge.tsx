import React from 'react';
import { useTranslation } from 'react-i18next';

interface ExternalSourceBadgeProps {
  source?: string;
  sourceUrl?: string;
  variant?: 'badge' | 'link';
  className?: string;
}

/**
 * Visible marker on properties imported from external real-estate sites
 * by the universal-listings ingestion pipeline.
 *
 * `variant="badge"` — compact pill, used inside property cards.
 * `variant="link"` — anchor that opens the original source in a new tab,
 *   used on the property details page.
 */
const ExternalSourceBadge: React.FC<ExternalSourceBadgeProps> = ({
  source,
  sourceUrl,
  variant = 'badge',
  className = '',
}) => {
  const { t } = useTranslation(['property']);
  if (!source) return null;

  const sourceLabel = source
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  if (variant === 'link' && sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener nofollow noreferrer"
        className={`inline-flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 underline ${className}`}
      >
        {t('source.viewOriginal', 'View on {{source}}', { source: sourceLabel })}
      </a>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
      title={sourceUrl ? t('source.listedOn', 'Listed on {{source}}', { source: sourceLabel }) : undefined}
    >
      {t('source.listedOn', 'Listed on {{source}}', { source: sourceLabel })}
    </span>
  );
};

export default ExternalSourceBadge;
