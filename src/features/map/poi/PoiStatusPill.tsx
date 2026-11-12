import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PoiStatus } from './poiTypes';

/** Tells the person why the places layer shows nothing (zoom, loading, no data, server trouble). */
const PoiStatusPill: React.FC<{ status: PoiStatus }> = ({ status }) => {
  const { t } = useTranslation(['search']);
  if (status === 'off' || status === 'ready') return null;

  const text = {
    'zoom-in': t('search:map.poiStatus.zoomIn', 'Zoom in to see places of interest'),
    loading: t('search:map.poiStatus.loading', 'Loading places of interest…'),
    empty: t('search:map.poiStatus.empty', 'No places of interest in this view. Try another area.'),
    error: t('search:map.poiStatus.error', 'Places of interest could not be loaded. Please try again in a moment.'),
  }[status];

  return (
    <div
      role={status === 'error' ? 'alert' : 'status'}
      data-testid="poi-status"
      className={`pointer-events-none absolute left-1/2 bottom-[13rem] z-[1002] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg sm:bottom-24 ${
        status === 'error' ? 'bg-red-600 text-white' : 'bg-neutral-900/90 text-white'
      }`}
    >
      {text}
    </div>
  );
};

export default PoiStatusPill;
