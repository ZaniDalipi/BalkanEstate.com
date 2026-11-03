import React from 'react';
import { useTranslation } from 'react-i18next';

interface MapBusyOverlayProps {
  /** Shown while true; renders nothing otherwise. */
  busy: boolean;
}

/**
 * A quiet "working on it" pill over the map, for the moments the map is there
 * but its pins are not yet: listings still arriving, or pins being built.
 * It never blocks the map (`pointer-events-none`) and is announced politely.
 */
const MapBusyOverlay: React.FC<MapBusyOverlayProps> = ({ busy }) => {
  const { t } = useTranslation(['search']);
  if (!busy) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-1/2 z-[1003] flex -translate-y-1/2 justify-center px-4"
    >
      <div className="flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2.5 shadow-lg ring-1 ring-black/5">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
        <span className="text-sm font-medium text-neutral-700">
          {t('search:ui.searchPage.loadingProperties', 'Loading properties')}
        </span>
      </div>
    </div>
  );
};

export default MapBusyOverlay;
