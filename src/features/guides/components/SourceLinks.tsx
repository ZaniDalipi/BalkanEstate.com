import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowTopRightOnSquareIcon } from '@/constants';
import type { Source } from '../types/guide.types';

/** "Source: MONSTAT — Prices of dwellings… ↗", one line per source. */
export const SourceLinks: React.FC<{ sources: Source[]; className?: string }> = ({ sources, className = '' }) => {
  const { t } = useTranslation('common');
  if (sources.length === 0) return null;
  return (
    <ul className={`space-y-1 text-xs text-neutral-500 ${className}`}>
      {sources.map((source) => (
        <li key={source.url} className="flex items-start gap-1">
          <span className="flex-shrink-0">{t('common:guides.sourceLabel', 'Source')}:</span>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1 text-primary hover:underline break-words min-w-0"
          >
            <span>
              {source.publisher} — {source.title}
            </span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="sr-only">{t('common:guides.opensInNewTab', '(opens in a new tab)')}</span>
          </a>
        </li>
      ))}
    </ul>
  );
};
