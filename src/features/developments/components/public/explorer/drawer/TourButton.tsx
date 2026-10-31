import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Rotate3d } from 'lucide-react';
import type { PublicUnit } from '../../../../types';

/**
 * "Open the 360° tour" for an apartment that has one. The tour is another
 * site (Matterport, Kuula, …), so it opens in a new tab; the server only sends
 * plain http(s) links.
 */
export const TourButton: React.FC<{ unit: Pick<PublicUnit, 'virtualTourUrl' | 'tourSource'> }> = ({ unit }) => {
  const { t } = useTranslation('developments');
  if (!unit.virtualTourUrl) return null;
  return (
    <div>
      <a
        href={unit.virtualTourUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        <Rotate3d className="h-5 w-5" aria-hidden="true" />
        {t('explorer.tour.open', 'Open the 360° tour')}
        <ExternalLink className="h-4 w-4 opacity-80" aria-hidden="true" />
        <span className="sr-only">{t('explorer.tour.newTab', '(opens in a new tab)')}</span>
      </a>
      {unit.tourSource === 'listing' && (
        <p className="mt-1.5 text-center text-xs text-slate-500">{t('explorer.tour.fromListing', 'From this apartment’s listing.')}</p>
      )}
    </div>
  );
};
