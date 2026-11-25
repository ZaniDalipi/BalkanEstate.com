import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, MapPin } from 'lucide-react';
import type { Development, UnitsSummary } from '../../../types';
import { ShareResidenceButton } from '../share/ShareResidenceButton';
import { residencePhotos } from '../../../utils/residencePhotos';
import { ResidencePhotosButton } from '../gallery/ResidencePhotosButton';
import { ResidencePhotoStrip } from '../gallery/ResidencePhotoStrip';
import { BuilderByline } from '../builder/BuilderByline';

interface ResidenceTitleBarProps {
  development: Development;
  summary?: UnitsSummary;
  onViewUnits: () => void;
  /** Jump to the builder section (shown when the residence names its builder). */
  onViewBuilder?: () => void;
}

/** Compact name / location / availability strip above the full-bleed explorer. */
export const ResidenceTitleBar: React.FC<ResidenceTitleBarProps> = ({ development, summary, onViewUnits, onViewBuilder }) => {
  const { t } = useTranslation('developments');
  const photos = residencePhotos(development);
  return (
    <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-2">
      <div className="min-w-0 max-w-full">
        <h1 className="text-balance break-words text-2xl font-extrabold leading-tight tracking-tight text-slate-900 min-[400px]:text-3xl sm:text-4xl">{development.name}</h1>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{[development.address, development.city, development.country].filter(Boolean).join(', ')}</span>
        </p>
        {onViewBuilder && <BuilderByline builder={development.builder} onOpen={onViewBuilder} />}
      </div>
      {/* Phones: the photos as a row to swipe; from tablet up, the "Photos (N)" button beside the actions. */}
      <div className="w-full sm:hidden">
        <ResidencePhotoStrip photos={photos} />
      </div>
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
        {summary && (
          <span className="w-full text-sm text-slate-600 sm:w-auto">
            {t('explorer.availableOfTotal', {
              available: summary.available,
              total: summary.total,
              defaultValue: '{{available}} of {{total}} available',
            })}
          </span>
        )}
        <button
          type="button"
          onClick={onViewUnits}
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 sm:flex-none"
        >
          {t('hero.viewUnits', 'View available units')}
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="hidden sm:block">
          <ResidencePhotosButton photos={photos} variant="outline" />
        </div>
        <ShareResidenceButton
          slug={development.slug}
          name={development.name}
          place={[development.city, development.country].filter(Boolean).join(', ')}
        />
      </div>
    </div>
  );
};
