import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';

interface PhotoSpotsCalloutProps {
  /** Photos already on the plan, of `total`. */
  placed: number;
  total: number;
  onStart: () => void;
  disabled?: boolean;
  /** Saving the spots: the button says so. */
  busy?: boolean;
}

/**
 * "Show buyers where each photo was taken" — the call to open the floor-plan
 * photo placer, shared by the listing form and the residence unit editor so
 * both look and read the same.
 */
export const PhotoSpotsCallout: React.FC<PhotoSpotsCalloutProps> = ({ placed, total, onStart, disabled, busy }) => {
  const { t } = useTranslation('seller');
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
      <p className="text-sm font-semibold text-gray-700">{t('createListing.photoSpots.cta', 'Show buyers where each photo was taken')}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {t('createListing.photoSpots.ctaHint', 'Buyers see a camera on the floor plan for each photo, in sync as they browse.')}
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled || busy}
        className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 sm:w-auto sm:justify-start"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {busy
          ? t('common:saving', 'Saving…')
          : placed > 0
            ? t('createListing.photoSpots.edit', 'Edit photo spots ({{placed}}/{{total}})', { placed, total })
            : t('createListing.photoSpots.start', 'Place photos on floor plan')}
      </button>
    </div>
  );
};
